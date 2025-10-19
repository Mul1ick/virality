from fastapi import APIRouter, HTTPException, Depends
from pymongo import MongoClient
from app.config import settings
from app.config.data_schema_registry import DATA_SCHEMAS
import google.generativeai as genai
import json
import re
from datetime import datetime, timedelta

# --- Dependencies (we will create these functions below) ---
from app.utils.security import get_current_user_id, rate_limiter

router = APIRouter(prefix="/analytics", tags=["Cross-Platform Analytics"])

# --- Configure Gemini Client ---
# NOTE: It's better to configure this once in your main.py or a config file
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
except AttributeError:
    raise RuntimeError("Missing GEMINI_API_KEY in your .env file")

# --- Database Connection with a Read-Only User (IMPORTANT for security) ---
client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

# --- Improved Prompt Engineering ---
def create_mongo_prompt(platform: str, question: str) -> str:
    schema = DATA_SCHEMAS[platform]
    
    # IMPROVED PROMPT with better instructions and security constraints
    return f"""
You are a world-class MongoDB data analyst expert. Your sole task is to convert a natural language question into a secure, read-only MongoDB aggregation pipeline.

**CONSTRAINTS (VERY IMPORTANT):**
1.  **READ-ONLY:** You MUST ONLY generate pipelines for reading data. Absolutely NO commands for `update`, `delete`, `drop`, `insert`, `createUser`, or any other data modification or user management. Any question asking to modify data must be rejected by returning an empty array `[]`.
2.  **AGGREGATION ONLY:** The output must be a valid MongoDB aggregation pipeline (an array of stages).
3.  **JSON ONLY:** Your entire response must be ONLY the raw JSON array. Do not include markdown, explanations, or any text outside of the JSON structure.

**DATA SCHEMA for collection '{schema['collection']}':**
- **Fields available:** {', '.join(schema['fields'])}
- **Description:** {schema['description']}

**EXAMPLE:**
- **Question:** "What was the total spend yesterday?"
- **Your Response:** `[ { "$match": { "date": "2025-10-18" } }, { "$group": { "_id": null, "totalSpend": { "$sum": "$spend" } } } ]`

**USER'S QUESTION:**
"{question}"
"""

@router.post("/{platform}")
def platform_nl_query(
    platform: str, 
    request: dict,
    user_id: str = Depends(rate_limiter) # DEPENDENCY: This will handle rate limiting
):
    """
    Natural language query handler for Google, Meta, Shopify, etc.
    Example: POST /analytics/google_ads
    Body: { "question": "Which 5 campaigns had the highest spend last week?" }
    """
    question = request.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Missing question")

    if platform not in DATA_SCHEMAS:
        raise HTTPException(status_code=404, detail=f"Unknown platform '{platform}'")

    # 1️⃣ Generate MongoDB Pipeline with Gemini
    model = genai.GenerativeModel('gemini-1.5-flash-latest') # Using Flash for speed and cost-efficiency
    llm_prompt = create_mongo_prompt(platform, question)
    
    try:
        response = model.generate_content(llm_prompt)
        # Clean the response to ensure it's valid JSON
        cleaned_response = re.sub(r'```json\s*|\s*```', '', response.text.strip(), flags=re.DOTALL)
        pipeline = json.loads(cleaned_response)
        
        if not isinstance(pipeline, list): # Basic validation
             raise ValueError("Generated pipeline is not a list.")

    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM output as valid JSON pipeline: {e}\nRaw Response: {response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred with the generative model: {e}")

    # 2️⃣ Execute the generated aggregation query
    try:
        collection = db[DATA_SCHEMAS[platform]["collection"]]
        result_cursor = collection.aggregate(pipeline)
        # The result is a cursor, so we convert it to a list. Be mindful of large result sets.
        results = list(result_cursor)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB execution error: {e}")

    # 3️⃣ Generate explanation for the user with Gemini
    explain_prompt = f"""
    In one simple, user-friendly sentence, explain what this MongoDB query does. 
    Do not mention MongoDB or technical terms like 'aggregation' or 'grouping'.
    
    Example Input: `[ { "$group": { "_id": "$campaign_name", "totalClicks": { "$sum": "$clicks" } } } ]`
    Example Output: "This query calculates the total number of clicks for each campaign."
    
    Your Input: `{json.dumps(pipeline)}`
    """
    
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
        "results": results[:20] # Limit results returned to the frontend
    }