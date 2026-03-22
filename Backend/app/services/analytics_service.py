# FILE: app/services/analytics_service.py

import json
import re
from datetime import datetime
from difflib import get_close_matches
from pymongo import MongoClient
from bson import ObjectId
import google.generativeai as genai
from fastapi import HTTPException

from app.config.config import settings
from app.utils.data_schema_registry import DATA_SCHEMAS
from app.utils.logger import get_logger

logger = get_logger()

ACTION_TYPE_LABELS = {
    "add_payment_info": "Add payment info",
    "add_to_cart": "Add to cart",
    "app_install": "App installs",
    "begin_checkout": "Checkout starts",
    "checkout_initiated": "Checkout starts",
    "complete_registration": "Registrations",
    "initiate_checkout": "Checkout starts",
    "landing_page_view": "Landing page views",
    "lead": "Leads",
    "link_click": "Link clicks",
    "onsite_conversion.post_save": "Saves",
    "page_engagement": "Page engagements",
    "page_view": "Page views",
    "post_engagement": "Post engagements",
    "purchase": "Purchases",
    "purchase_roas": "Purchase ROAS",
    "search": "Searches",
    "subscribe": "Subscriptions",
    "view_content": "Product views",
}

EMPTY_VALUES = (None, "", [], {})


class AnalyticsService:
    """Handles all natural-language analytics queries via Gemini + MongoDB."""

    def __init__(self):
        # Initialize DB + Gemini client once
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
        except AttributeError:
            raise RuntimeError("Missing GEMINI_API_KEY in .env file")

        try:
            client = MongoClient(settings.MONGO_URI)
            self.db = client[settings.DB_NAME]
        except Exception as e:
            raise RuntimeError(f"Failed to connect to MongoDB: {e}")

        self.model = genai.GenerativeModel("models/gemini-2.5-flash")
        self._platform_alias_map = self._build_platform_alias_map()
        self._allowed_readonly_stages = {
            "$match",
            "$project",
            "$group",
            "$sort",
            "$limit",
            "$skip",
            "$addFields",
            "$set",
            "$unwind",
            "$facet",
            "$count",
            "$lookup",
            "$bucket",
            "$bucketAuto",
            "$sortByCount",
        }

    @staticmethod
    def _sanitize_platform_value(value: str) -> str:
        """Normalize incoming platform text for comparison."""
        if value is None:
            return ""
        return re.sub(r"[^a-z0-9]", "", value.lower())

    def _build_platform_alias_map(self):
        """Pre-compute aliases for supported platforms."""
        alias_map = {}
        for key in DATA_SCHEMAS.keys():
            alias_map[self._sanitize_platform_value(key)] = key

        manual_aliases = {
            "google": "google_campaigns",
            "googlecampaign": "google_campaigns",
            "googleadset": "google_adsets",
            "googleadgroup": "google_adsets",
            "googlead": "google_ads",
            "metaads": "meta_ads",
            "metaadsets": "meta_adsets",
            "metacampaign": "meta",
            "facebook": "meta",
            "facebookads": "meta",
            "shopify": "shopify",
        }

        for alias, canonical in manual_aliases.items():
            alias_map[self._sanitize_platform_value(alias)] = canonical

        return alias_map

    def _normalize_platform(self, platform: str) -> str:
        """Attempt to autocorrect and normalize the requested platform key."""
        sanitized = self._sanitize_platform_value(platform)
        if not sanitized:
            return None

        if sanitized in self._platform_alias_map:
            return self._platform_alias_map[sanitized]

        matches = get_close_matches(sanitized, self._platform_alias_map.keys(), n=1, cutoff=0.75)
        if matches:
            return self._platform_alias_map[matches[0]]

        return None

    # ------------------------------------------------------------
    # Prompt Creation
    # ------------------------------------------------------------
    def _create_prompt(self, platform: str, question: str) -> str:
        """Build a safe deterministic prompt for Gemini."""
        schema = DATA_SCHEMAS[platform]
        examples_text = ""

        if schema.get("field_examples"):
            examples_text += "\n\n--- FIELD EXAMPLES (DO NOT USE AS FILTERS) ---\n"
            for field, examples in schema["field_examples"].items():
                examples_text += f"- Example values for '{field}': {examples}\n"

        return """
You are a MongoDB data analyst.
Convert this natural language question into a SECURE, READ-ONLY aggregation pipeline.

RULES:
1.  **Output JSON array ONLY.** No text, no markdown, no explanations.
2.  Only use read-only aggregation stages (e.g., $match, $group, $sort, $limit, $project). Never use any write or side-effect stages (e.g., $out, $merge).
3.  If the question is irrelevant, vague, or cannot be answered by the schema, return [].
4.  **CRITICAL DATE RULE:** ONLY filter by a date (e.g., 'date_start') if the user's question contains explicit date words (e.g., "today", "last week", "September", "in 2024"). If no date is mentioned, DO NOT add a date filter.
5.  **CRITICAL FILTER RULE:** Do NOT use any values from the field examples as filters. They are for context only.
6.  **NUMERIC CONVERSION RULE:** The fields 'spend', 'clicks', and 'impressions' are stored as STRINGS. You MUST convert them to numbers before doing any math.
    * Use an `$addFields` stage at the beginning of the pipeline:
        `{{"$addFields": {{"numericSpend": {{"$toDouble": {{"$ifNull": ["$spend", "0"]}} }}, "numericClicks": {{"$toInt": {{"$ifNull": ["$clicks", "0"]}} }}, "numericImpressions": {{"$toInt": {{"$ifNull": ["$impressions", "0"]}} }} }} }}`
    * Then, perform all math on the new fields (e.g., `numericClicks`, `numericSpend`).

7.  **METRICS CALCULATION RULE:** For derived metrics like CTR, CPC, or CPM, you MUST calculate them manually using the new numeric fields.
    * **To get CTR:** Calculate as `{{"$multiply": [{{"$divide": [{{"$sum": "$numericClicks"}}, {{"$sum": "$numericImpressions"}}]}}, 100]}}`.
    * **To get CPC:** Calculate as `{{"$divide": [{{"$sum": "$numericSpend"}}, {{"$sum": "$numericClicks"}}]}}`.
    * **To get CPM:** Calculate as `{{"$multiply": [{{"$divide": [{{"$sum": "$numericSpend"}}, {{"$sum": "$numericImpressions"}}]}}, 1000]}}`.
    * **Always** use `$cond` to prevent division by zero. Do NOT sum the 'ctr', 'cpc', or 'cpm' fields directly.

8.  **OUTPUT FIELDS RULE:** The final $project stage MUST be user-friendly.
    * **ALWAYS include** name fields like 'ad_name', 'adset_name', or 'campaign_name' if they are in the schema.
    * **NEVER include** ID fields (e.g., 'ad_id', 'campaign_id', 'adset_id') in the final $project stage. The user does not want to see them.
    * **ALWAYS include** the calculated metric (e.g., 'calculated_ctr', 'total_spend').
    * **Example good output:** `{{"$project": {{"_id": 0, "ad_name": "$_id.ad_name", "campaign_name": "$_id.campaign_name", "calculated_ctr": 1}} }}`
    * **Example bad output:** `{{"$project": {{"_id": 0, "ad_id": "$_id.ad_id", "calculated_ctr": 1}} }}`

9.  **DOMAIN RULE:** Only answer questions about the Virality analytics data described in the schema. If the question is outside this scope, return [].


--- DATA SCHEMA ---
Collection: {collection}
Fields: {fields}
Description: {description}
{examples}
--- END SCHEMA ---

USER QUESTION:
"{question}"
""".format(
            collection=schema["collection"],
            fields=", ".join(schema["fields"]),
            description=schema["description"],
            examples=examples_text,
            question=question
        )

    def _validate_pipeline_stages(self, pipeline: list):
        """Ensure the pipeline only uses safe, read-only stages."""
        for stage in pipeline:
            if not isinstance(stage, dict) or len(stage) != 1:
                raise HTTPException(status_code=400, detail="Invalid aggregation stage structure.")
            op = next(iter(stage))
            if op not in self._allowed_readonly_stages:
                raise HTTPException(status_code=400, detail=f"Disallowed aggregation stage '{op}' detected.")

    def _safe_parse_json_deep(self, value, depth_limit: int = 5, _depth: int = 0):
        """Recursively parse JSON-looking strings without failing the request."""
        if _depth >= depth_limit:
            return value

        if isinstance(value, str):
            candidate = value.strip()
            if not candidate:
                return value

            looks_like_json = (
                (candidate.startswith("{") and candidate.endswith("}"))
                or (candidate.startswith("[") and candidate.endswith("]"))
            )
            if not looks_like_json:
                return value

            try:
                parsed = json.loads(candidate)
            except (TypeError, ValueError, json.JSONDecodeError):
                return value

            if parsed == value:
                return value
            return self._safe_parse_json_deep(parsed, depth_limit, _depth + 1)

        if isinstance(value, list):
            return [self._safe_parse_json_deep(item, depth_limit, _depth + 1) for item in value]

        if isinstance(value, dict):
            return {
                key: self._safe_parse_json_deep(item, depth_limit, _depth + 1)
                for key, item in value.items()
            }

        return value

    def _coerce_number(self, value):
        if isinstance(value, bool) or value in EMPTY_VALUES:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            cleaned = value.strip().replace(",", "")
            if not cleaned:
                return None
            try:
                return float(cleaned)
            except ValueError:
                return None
        return None

    def _get_nested_value(self, row: dict, keys: list[str]):
        for key in keys:
            if key in row:
                return row[key]

        row_id = row.get("_id")
        if isinstance(row_id, dict):
            for key in keys:
                if key in row_id:
                    return row_id[key]

        return None

    def _format_action_type_label(self, action_type: str) -> str:
        if not action_type:
            return "Unknown action"
        return ACTION_TYPE_LABELS.get(
            action_type,
            action_type.replace(".", " ").replace("_", " ").strip().title(),
        )

    def _extract_actions(self, row: dict) -> dict:
        action_totals = {}

        for field in ("actions", "action_breakdown", "action_breakdowns"):
            actions = row.get(field)
            if not actions:
                continue

            if isinstance(actions, dict):
                iterable = [
                    {"action_type": action_key, "value": action_value}
                    for action_key, action_value in actions.items()
                ]
            elif isinstance(actions, list):
                iterable = actions
            else:
                continue

            for action in iterable:
                if not isinstance(action, dict):
                    continue
                action_type = action.get("action_type") or action.get("type") or action.get("name")
                action_value = self._coerce_number(action.get("value"))
                if not action_type or action_value is None:
                    continue
                action_totals[action_type] = action_totals.get(action_type, 0) + action_value

        return action_totals

    def _format_indian_number(self, value: float, decimals: int = 0) -> str:
        rounded = f"{abs(value):.{decimals}f}"
        integer_part, _, decimal_part = rounded.partition(".")

        if len(integer_part) > 3:
            last_three = integer_part[-3:]
            leading = integer_part[:-3]
            parts = []
            while len(leading) > 2:
                parts.insert(0, leading[-2:])
                leading = leading[:-2]
            if leading:
                parts.insert(0, leading)
            integer_part = ",".join(parts + [last_three])

        sign = "-" if value < 0 else ""
        if decimals <= 0:
            return f"{sign}{integer_part}"
        return f"{sign}{integer_part}.{decimal_part}"

    def _format_currency_inr(self, value: float) -> str:
        decimals = 0 if float(value).is_integer() else 2
        return f"₹{self._format_indian_number(value, decimals=decimals)}"

    def _format_compact_metric(self, value: float) -> str:
        absolute = abs(value)
        if absolute >= 1e7:
            return f"{value / 1e7:.1f}".rstrip("0").rstrip(".") + " crore"
        if absolute >= 1e5:
            return f"{value / 1e5:.1f}".rstrip("0").rstrip(".") + " lakh"
        if absolute >= 1e3:
            return f"{value / 1e3:.1f}".rstrip("0").rstrip(".") + " thousand"
        return self._format_indian_number(value, decimals=0)

    def _format_date_label(self, value) -> str | None:
        if not value:
            return None
        if isinstance(value, datetime):
            return value.strftime("%d %b")
        if isinstance(value, str):
            candidate = value.strip().replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(candidate)
            except ValueError:
                try:
                    parsed = datetime.strptime(value[:10], "%Y-%m-%d")
                except ValueError:
                    return None
            return parsed.strftime("%d %b")
        return None

    def _get_row_name(self, row: dict) -> str | None:
        name_keys = [
            "campaign_name",
            "adset_name",
            "ad_name",
            "name",
            "product_name",
            "title",
            "order_name",
        ]
        for key in name_keys:
            value = self._get_nested_value(row, [key])
            if value not in EMPTY_VALUES:
                return str(value)

        row_id = row.get("_id")
        if isinstance(row_id, str) and row_id:
            return row_id

        return None

    def _build_marketing_summary(self, platform: str, results: list, question: str) -> str:
        if not results:
            return ""

        subject_map = {
            "meta": "Meta campaigns",
            "meta_adsets": "Meta ad sets",
            "meta_ads": "Meta ads",
            "google_campaigns": "Google campaigns",
            "google_adsets": "Google ad groups",
            "google_ads": "Google ads",
            "shopify": "Shopify data",
        }
        subject = subject_map.get(platform, "Selected data")

        totals = {
            "spend": 0.0,
            "impressions": 0.0,
            "clicks": 0.0,
            "reach": 0.0,
            "revenue": 0.0,
            "conversions": 0.0,
            "orders": 0.0,
        }
        action_totals = {}
        best_row = None
        best_score = None

        for row in results:
            spend = self._coerce_number(self._get_nested_value(row, ["spend", "total_spend", "totalSpend", "cost"]))
            impressions = self._coerce_number(
                self._get_nested_value(row, ["impressions", "total_impressions", "totalImpressions"])
            )
            clicks = self._coerce_number(self._get_nested_value(row, ["clicks", "total_clicks", "totalClicks"]))
            reach = self._coerce_number(self._get_nested_value(row, ["reach", "total_reach", "totalReach"]))
            revenue = self._coerce_number(
                self._get_nested_value(row, ["revenue", "total_revenue", "totalRevenue", "sales"])
            )
            conversions = self._coerce_number(
                self._get_nested_value(
                    row,
                    ["conversions", "total_conversions", "totalConversions", "purchases", "purchase"],
                )
            )
            orders = self._coerce_number(self._get_nested_value(row, ["orders", "order_count", "orderCount"]))

            totals["spend"] += spend or 0
            totals["impressions"] += impressions or 0
            totals["clicks"] += clicks or 0
            totals["reach"] += reach or 0
            totals["revenue"] += revenue or 0
            totals["conversions"] += conversions or 0
            totals["orders"] += orders or 0

            row_actions = self._extract_actions(row)
            for action_type, action_value in row_actions.items():
                action_totals[action_type] = action_totals.get(action_type, 0) + action_value

            score = (
                row_actions.get("purchase", 0),
                conversions or 0,
                row_actions.get("add_to_cart", 0),
                clicks or 0,
                impressions or 0,
                spend or 0,
            )
            if best_score is None or score > best_score:
                best_score = score
                best_row = row

        purchases = action_totals.get("purchase", 0) or totals["conversions"]
        add_to_cart = action_totals.get("add_to_cart", 0)
        link_clicks = action_totals.get("link_click", 0)

        summary_sentences = []

        primary_fragments = []
        if totals["spend"] > 0:
            primary_fragments.append(f"spent {self._format_currency_inr(totals['spend'])}")
        if totals["revenue"] > 0:
            primary_fragments.append(f"generated {self._format_currency_inr(totals['revenue'])} in revenue")
        if totals["impressions"] > 0:
            primary_fragments.append(
                f"delivered {self._format_compact_metric(totals['impressions'])} impressions"
            )
        elif totals["reach"] > 0:
            primary_fragments.append(f"reached {self._format_compact_metric(totals['reach'])} people")
        if totals["clicks"] > 0:
            primary_fragments.append(f"drove {self._format_indian_number(totals['clicks'])} clicks")
        elif link_clicks > 0:
            primary_fragments.append(f"drove {self._format_indian_number(link_clicks)} link clicks")

        if primary_fragments:
            if len(primary_fragments) == 1:
                summary_sentences.append(f"{subject} {primary_fragments[0]}.")
            else:
                summary_sentences.append(
                    f"{subject} {', '.join(primary_fragments[:-1])} and {primary_fragments[-1]}."
                )

        outcome_fragments = []
        if purchases > 0:
            outcome_fragments.append(f"{self._format_indian_number(purchases)} purchases")
        if add_to_cart > 0:
            outcome_fragments.append(f"{self._format_indian_number(add_to_cart)} add-to-cart actions")
        if totals["orders"] > 0:
            outcome_fragments.append(f"{self._format_indian_number(totals['orders'])} orders")
        if totals["conversions"] > 0 and purchases == 0:
            outcome_fragments.append(f"{self._format_indian_number(totals['conversions'])} conversions")

        if outcome_fragments:
            summary_sentences.append(
                "There were " + " and ".join(outcome_fragments[:2]) + "."
            )

        if best_row:
            best_name = self._get_row_name(best_row)
            best_date = self._format_date_label(
                self._get_nested_value(best_row, ["date_start", "date", "created_at"])
            )
            best_clicks = self._coerce_number(self._get_nested_value(best_row, ["clicks", "totalClicks"])) or 0
            best_purchases = self._extract_actions(best_row).get("purchase", 0)

            if best_name:
                highlight_metric = None
                if best_purchases > 0:
                    highlight_metric = f"{self._format_indian_number(best_purchases)} purchases"
                elif best_clicks > 0:
                    highlight_metric = f"{self._format_indian_number(best_clicks)} clicks"

                if highlight_metric:
                    date_suffix = f" on {best_date}" if best_date else ""
                    summary_sentences.append(
                        f"The strongest row was {best_name}{date_suffix}, with {highlight_metric}."
                    )

        if (totals["clicks"] > 0 or link_clicks > 0) and purchases == 0:
            summary_sentences.append(
                "Traffic is coming through, but it is not turning into purchases yet, which points to a landing-page or audience-quality gap."
            )
        elif add_to_cart > 0 and purchases > 0 and add_to_cart > purchases:
            summary_sentences.append(
                "Add-to-cart volume is ahead of purchases, so the main drop-off appears closer to checkout than to ad engagement."
            )

        if not summary_sentences:
            parsed_question = question.strip().rstrip("?")
            return f"I found matching {subject.lower()} data for \"{parsed_question}\", but there was not enough numeric detail to produce a reliable business summary."

        return " ".join(summary_sentences[:4])

    # ------------------------------------------------------------
    # Pipeline Generation
    # ------------------------------------------------------------
    def _generate_pipeline(self, platform: str, question: str):
        """Call Gemini and return parsed pipeline."""
        llm_prompt = self._create_prompt(platform, question)
        try:
            response = self.model.generate_content(llm_prompt)
            raw = response.text.strip()
            cleaned = re.sub(r'```json\s*|\s*```', '', raw, flags=re.DOTALL)
            pipeline = json.loads(cleaned)
            logger.info(f"[AnalyticsService] Generated Pipeline: {pipeline}")
            if not isinstance(pipeline, list):
                raise ValueError("Generated output is not a valid list.")
            self._validate_pipeline_stages(pipeline)
            return pipeline
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"[Gemini Parse Error] {e} | Raw: {getattr(response, 'text', '')}")
            raise HTTPException(status_code=500, detail=f"Gemini output invalid: {e}")
        except Exception as e:
            logger.error(f"[Gemini Error] {e}")
            raise HTTPException(status_code=500, detail=f"Gemini failed: {e}")

    # ------------------------------------------------------------
    # Execute Mongo Query
    # ------------------------------------------------------------
    def _execute_query(self, platform: str, pipeline: list,user_id:str):
        """Run aggregation and sanitize ObjectIds."""
        try:

            platform_value = platform  # Default
            if platform.startswith("meta"):
                platform_value = "meta"
            elif platform.startswith("google"):
                platform_value = "google"
            elif platform.startswith("shopify"):
                platform_value = "shopify"
            
            security_match = {
                "platform": platform_value,
                "user_id": user_id
            }

            match_stage_index = -1
            for i, stage in enumerate(pipeline):
                if "$match" in stage:
                    match_stage_index = i
                    break
            
            if match_stage_index != -1:
                pipeline[match_stage_index]["$match"].update(security_match)
            else:
                pipeline.insert(0, {"$match": security_match})
            
            logger.info(f"[AnalyticsService] Executing Secure Pipeline: {pipeline}")
            collection = self.db[DATA_SCHEMAS[platform]["collection"]]
            results = list(collection.aggregate(pipeline))

            for doc in results:
                for key, val in doc.items():
                    if isinstance(val, ObjectId):
                        doc[key] = str(val)
                if "_id" in doc and isinstance(doc["_id"], ObjectId):
                    doc["_id"] = str(doc["_id"])

            logger.info(f"[AnalyticsService] Executed query for {platform}, {len(results)} results.")
            return results
        except Exception as e:
            logger.error(f"[MongoDB Error] {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"MongoDB execution error: {e}")

    # ------------------------------------------------------------
    # Generate Explanation
    # ------------------------------------------------------------
    def _generate_explanation(self, pipeline: list) -> str:
        """Ask Gemini for a one-line plain-English explanation."""
        explain_prompt = f"""
Summarize what this MongoDB query is looking for in one simple, non-technical sentence.
Do not mention MongoDB, 'query', 'pipeline', or any field names.

Example Input: [{{"$match": {{"spend": {{"$gt": 100}}}}}}, {{"$sort": {{"clicks": -1}}}}]
Example Output: "Looking for all items with a spend over 100, sorted by the most clicks."

Example Input: [{{"$match": {{"status": "ACTIVE"}}}}, {{"$group": {{"_id": "$ad_name", "totalSpend": {{"$sum": "$spend"}}}}}}]
Example Output: "Calculating the total spend for all active ads, grouped by ad name."

Your Input: {json.dumps(pipeline)}
"""
        try:
            explanation_response = self.model.generate_content(explain_prompt)
            return explanation_response.text.strip()
        except Exception:
            return "Could not generate an explanation."

    def _generate_answer(self, platform: str, question: str, results: list) -> str:
        """Generate a richer, in-domain answer strictly from the returned data."""
        if not results:
            return "I could not find matching data in Virality for your question."

        data_preview = json.dumps(results[:10])
        answer_prompt = f"""
You are a marketing analyst for the Virality platform. Using ONLY the provided data rows, answer the user's question for a non-technical marketing professional.
- Never invent data, fields, or counts; rely solely on the rows provided.
- If the question is unrelated to Virality analytics data or cannot be answered from these rows, reply exactly: "I can only answer questions about Virality analytics data."
- Do not provide instructions or attempt any data changes—this is read-only analysis.
- Summarize the business takeaway first, then mention the important supporting metrics.
- Never dump raw JSON, field keys, arrays, or object literals into the answer.
- Translate technical action names such as link_click, add_to_cart, and purchase into plain English.
- Use the ₹ symbol for spend, revenue, CPC, CPM, or cost values. Do not do any currency conversion.

Platform: {platform}
User question: "{question}"
Data rows (JSON): {data_preview}

Write 2-4 concise sentences highlighting what the data shows, notable patterns, and helpful numeric context. If there is insufficient data, say so plainly.
"""
        try:
            response = self.model.generate_content(answer_prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"[Gemini Answer Error] {e}", exc_info=True)
            return "Could not generate an answer from the available data."

    # ------------------------------------------------------------
    # Main Entry Point
    # ------------------------------------------------------------
    def run_nl_query(self, platform: str, question: str, user_id: str):
        """Main workflow: LLM → pipeline → Mongo → explanation."""
        normalized_platform = self._normalize_platform(platform)
        if not normalized_platform:
            raise HTTPException(status_code=404, detail=f"Unknown platform '{platform}'")

        if normalized_platform != platform:
            logger.info(f"[AnalyticsService] Normalized platform '{platform}' to '{normalized_platform}'")

        platform = normalized_platform
        logger.info(f"[AnalyticsService] User={user_id}, Platform={platform}, Q='{question}'")

        pipeline = self._generate_pipeline(platform, question)
        results = self._execute_query(platform, pipeline, user_id)
        normalized_results = [self._safe_parse_json_deep(row) for row in results]
        explanation = self._generate_explanation(pipeline)
        answer = self._generate_answer(platform, question, normalized_results)
        marketing_summary = self._build_marketing_summary(platform, normalized_results, question)

        return {
            "user_id": user_id,
            "platform": platform,
            "question": question,
            "explanation": explanation,
            "pipeline_executed": pipeline,
            "results": normalized_results[:20],
            "answer": answer,
            "marketing_summary": marketing_summary,
        }
