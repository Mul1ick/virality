# FILE: app/services/analytics_service.py

import json
import re
from difflib import get_close_matches
from pymongo import MongoClient
from bson import ObjectId
import google.generativeai as genai
from fastapi import HTTPException

from app.config.config import settings
from app.utils.data_schema_registry import DATA_SCHEMAS
from app.utils.logger import get_logger

logger = get_logger()


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
You are a data analyst for the Virality platform. Using ONLY the provided data rows, answer the user's question with clear, factual insight.
- Never invent data, fields, or counts; rely solely on the rows provided.
- If the question is unrelated to Virality analytics data or cannot be answered from these rows, reply exactly: "I can only answer questions about Virality analytics data."
- Do not provide instructions or attempt any data changes—this is read-only analysis.

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
        explanation = self._generate_explanation(pipeline)
        answer = self._generate_answer(platform, question, results)

        return {
            "user_id": user_id,
            "platform": platform,
            "question": question,
            "explanation": explanation,
            "pipeline_executed": pipeline,
            "results": results[:20],
            "answer": answer,
        }
