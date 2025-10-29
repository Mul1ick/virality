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
            examples_text += "\n\nFIELD EXAMPLES:\n"
            for field, examples in schema["field_examples"].items():
                examples_text += f"- '{field}' can contain values like: {examples}\n"

        return """
You are a MongoDB data analyst.
Convert this natural language question into a SECURE, READ-ONLY aggregation pipeline.

RULES:
1️⃣ Only aggregation stages. No writes/deletes.
2️⃣ Output JSON array ONLY (no markdown).
3️⃣ If irrelevant (e.g. weather question), return [].
4️⃣ Map synonyms & typos to schema fields.

DATA SCHEMA ({collection}):
Fields: {fields}
Description: {description}
{examples}

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
    def _execute_query(self, platform: str, pipeline: list):
        """Run aggregation and sanitize ObjectIds."""
        try:
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
Explain in one short, user-friendly sentence what this query does.
Avoid terms like 'pipeline', 'aggregation', or 'group'.
Example Input: [{{"$group": {{"_id": "$campaign_name", "totalClicks": {{"$sum": "$clicks"}}}}}}]
Example Output: "This query calculates the total number of clicks for each campaign."
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
        results = self._execute_query(platform, pipeline)
        explanation = self._generate_explanation(pipeline)

        return {
            "user_id": user_id,
            "platform": platform,
            "question": question,
            "explanation": explanation,
            "pipeline_executed": pipeline,
            "results": results[:20],
        }
