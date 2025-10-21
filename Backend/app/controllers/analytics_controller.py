from fastapi import APIRouter, HTTPException, Depends
from pymongo import MongoClient
from app.config import settings
from app.utils.data_schema_registery import DATA_SCHEMAS
import google.generativeai as genai
import json
import re
from datetime import datetime, timedelta
# In app/controllers/analytics_controller.py
from bson import ObjectId
# --- Dependencies ---
from app.utils.security import get_current_user_id, rate_limiter

router = APIRouter(prefix="/analytics", tags=["Cross-Platform Analytics"])

# --- Configure Gemini Client ---
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
except AttributeError:
    raise RuntimeError("Missing GEMINI_API_KEY in your .env file")

# --- Database Connection ---
client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]


# -------------------------------------------------------------------
# 🧠 LLM Prompt Construction (safe with .format() and no nested f-strings)
# -------------------------------------------------------------------
# In app/controllers/analytics_controller.py
# REPLACE your old create_mongo_prompt function with this one

def create_mongo_prompt(platform: str, question: str) -> str:
    schema = DATA_SCHEMAS[platform]
    
    examples_text = ""
    if schema.get("field_examples"):
        examples_text += "\n\nFIELD EXAMPLES (use these exact values in queries):\n"
        for field, examples in schema["field_examples"].items():
            examples_text += f"- The '{field}' field can contain values like: {examples}\n"

    return """
You are a world-class MongoDB data analyst expert. Your sole task is to convert a natural language question into a secure, read-only MongoDB aggregation pipeline.

CONSTRAINTS AND RULES (VERY IMPORTANT):
1. READ-ONLY: You MUST ONLY generate pipelines for reading data. Absolutely no modification commands.
2. AGGREGATION ONLY: The output must be a valid MongoDB aggregation pipeline (an array of stages).
3. JSON ONLY: Your entire response must be ONLY the raw JSON array. Do not include markdown or explanations.
4. BE FORGIVING WITH INPUT: The user's question may contain typos or use synonyms. If a word looks like a field name from the schema, assume it is that field. For example, if the user says "total cost" or "spnd", map it to the "costMicros" or "spend" field.
5. FAIL GRACEFULLY: If the user's question is complete nonsense or has no relation to the schema (e.g., "what is the weather today?"), you MUST return an empty JSON array `[]`. Do not attempt to guess a query in this case.

DATA SCHEMA for collection '{collection}':
- Fields available: {fields}
- Description: {description}
{examples}
USER'S QUESTION:
"{question}"
""".format(
        collection=schema["collection"],
        fields=", ".join(schema["fields"]),
        description=schema["description"],
        examples=examples_text,
        question=question
    )


# -------------------------------------------------------------------
# 🚀 MAIN ENDPOINT
# -------------------------------------------------------------------
# Don't forget this import at the top of your analytics_controller.py file
from bson import ObjectId

# ... (rest of your imports and code) ...

@router.post("/{platform}")
def platform_nl_query(
    platform: str,
    request: dict,
    user_id: str = Depends(rate_limiter)
):
    """
    Natural language query handler for Google, Meta, Shopify, etc.
    Example:
        POST /analytics/meta
        Body: { "question": "Which Meta campaign had the highest spend last month?" }
    """
    question = request.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Missing question")

    if platform not in DATA_SCHEMAS:
        raise HTTPException(status_code=404, detail=f"Unknown platform '{platform}'")

    # 1️⃣ Generate MongoDB Pipeline with Gemini
    # ... (this part is correct, no changes needed)
    model = genai.GenerativeModel("models/gemini-2.5-flash")
    llm_prompt = create_mongo_prompt(platform, question)
    try:
        response = model.generate_content(llm_prompt)
        cleaned_response = re.sub(r'```json\s*|\s*```', '', response.text.strip(), flags=re.DOTALL)
        pipeline = json.loads(cleaned_response)
        if not isinstance(pipeline, list):
            raise ValueError("Generated pipeline is not a list.")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse LLM output as valid JSON pipeline: {e}\nRaw Response: {response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {e}")

    # 2️⃣ Execute Aggregation Query
    try:
        collection = db[DATA_SCHEMAS[platform]["collection"]]
        result_cursor = collection.aggregate(pipeline)
        results = list(result_cursor)

        # 👇 ADD THIS LOOP TO FIX THE ERROR
        # It converts the special ObjectId to a plain string for JSON conversion.
        for doc in results:
            if '_id' in doc and isinstance(doc['_id'], ObjectId):
                doc['_id'] = str(doc['_id'])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB execution error: {e}")

    # 3️⃣ Generate Human Explanation
    # ... (this part is correct, no changes needed)
    explain_prompt = """
In one simple, user-friendly sentence, explain what this MongoDB query does. 
Do not mention MongoDB or technical terms like 'aggregation' or 'grouping'.

Example Input: [{{ "$group": {{"_id": "$campaign_name", "totalClicks": {{"$sum": "$clicks"}}}} }}]
Example Output: "This query calculates the total number of clicks for each campaign."

Your Input: {pipeline}
""".format(pipeline=json.dumps(pipeline))
    try:
        explanation_response = model.generate_content(explain_prompt)
        explanation = explanation_response.text.strip()
    except Exception:
        explanation = "Could not generate an explanation."

    return {
        "user_id": user_id,
        "platform": platform,
        "question": question,
        "explanation": explanation,
        "pipeline_executed": pipeline,
        "results": results[:20]  # Limit results
    }