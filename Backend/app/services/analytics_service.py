# FILE: app/services/analytics_service.py

import json
import re
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
2.  Only use read-only aggregation stages (e.g., $match, $group, $sort, $limit, $project).
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

    # ------------------------------------------------------------
    # Main Entry Point
    # ------------------------------------------------------------
    def run_nl_query(self, platform: str, question: str, user_id: str):
        """Main workflow: LLM → pipeline → Mongo → explanation."""
        if platform not in DATA_SCHEMAS:
            raise HTTPException(status_code=404, detail=f"Unknown platform '{platform}'")

        logger.info(f"[AnalyticsService] User={user_id}, Platform={platform}, Q='{question}'")

        pipeline = self._generate_pipeline(platform, question)
        results = self._execute_query(platform, pipeline, user_id)
        explanation = self._generate_explanation(pipeline)

        return {
            "user_id": user_id,
            "platform": platform,
            "question": question,
            "explanation": explanation,
            "pipeline_executed": pipeline,
            "results": results[:20],
        }
