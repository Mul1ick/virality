# FILE: Backend/app/controllers/aggregation_controller.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from bson import ObjectId # Import ObjectId

# --- Database & Security ---
from app.database import db # Assuming db is accessible like this
from app.utils.security import get_current_user_id
from app.utils.logger import get_logger

logger = get_logger()
router = APIRouter(prefix="/aggregate", tags=["Data Aggregation"])

# --- Pydantic Model for the Request ---
class MetaAggregationRequest(BaseModel):
    start_date: date
    end_date: date
    ad_account_id: str
    group_by: Optional[str] = None # e.g., 'campaign', 'adset', 'month', null for total

# --- Helper Function to Build the Pipeline ---
def build_meta_aggregation_pipeline(user_id: str, ad_account_id: str, start_date: str, end_date: str, group_by: Optional[str]):
    """
    Constructs the MongoDB aggregation pipeline for Meta insights.
    """
    pipeline = []
    user_object_id = None

    # Try converting user_id to ObjectId, handle potential errors
    try:
        # Assuming user_id passed from get_current_user_id is the string representation of ObjectId
        user_object_id = ObjectId(user_id) # Convert string ID to ObjectId for matching
    except Exception as e:
        logger.error(f"Invalid user_id format for ObjectId conversion: {user_id}. Error: {e}")
        # If conversion fails, we cannot proceed with a valid DB query for this user
        return None # Indicate failure due to invalid user_id format

    # 1. Match documents
    pipeline.append({
        "$match": {
            # Use the converted ObjectId for matching the user_id field
            # IMPORTANT: Ensure your 'user_id' field in the insights collections actually stores ObjectId objects.
            # If it stores strings, you should NOT convert here and match directly with the string user_id.
            # Example below assumes user_id field stores ObjectId. Adjust if necessary.
            "user_id": user_id,
            "ad_account_id": ad_account_id,
            "platform": "meta",
            "date_start": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
    })

    # 2. Add fields for numeric conversion
    pipeline.append({
        "$addFields": {
            "numericSpend": { "$toDouble": { "$ifNull": ["$spend", "0"] } }, # Handle potential nulls
            "numericClicks": { "$toInt": { "$ifNull": ["$clicks", "0"] } },
            "numericImpressions": { "$toInt": { "$ifNull": ["$impressions", "0"] } }
            # Add conversions for actions here if needed
            # Example: Summing 'link_click' actions
            # "numericLinkClicks": {
            #     "$sum": {
            #         "$map": {
            #             "input": {
            #                 "$filter": {
            #                     "input": "$actions",
            #                     "as": "action",
            #                     "cond": { "$eq": ["$$action.action_type", "link_click"] }
            #                 }
            #             },
            #             "as": "clickAction",
            #             "in": { "$toInt": "$$clickAction.value" }
            #         }
            #     }
            # }
        }
    })

    # 3. Grouping Logic
    group_id_expression: Optional[dict | str] = None # Default _id for total aggregation
    if group_by == 'campaign':
        group_id_expression = "$campaign_id"
    elif group_by == 'adset':
        group_id_expression = "$adset_id"
    elif group_by == 'ad': # <--- Group by ad_id
        group_id_expression = "$ad_id"
    elif group_by == 'month':
        # Group by year-month
        group_id_expression = {
            "year": { "$year": { "$toDate": "$date_start" } },
            "month": { "$month": { "$toDate": "$date_start" } }
        }
    elif group_by == 'date':
        group_id_expression = "$date_start" # Group by individual date

    group_stage: dict = {
        "$group": {
            "_id": group_id_expression,
            "totalSpend": { "$sum": "$numericSpend" },
            "totalClicks": { "$sum": "$numericClicks" },
            "totalImpressions": { "$sum": "$numericImpressions" },
            # "totalLinkClicks": { "$sum": "$numericLinkClicks" }, # Add if calculating actions
            "count": { "$sum": 1 } # Count of documents (days) in the group
        }
    }

    # Add first/last date only if grouping by something other than date itself
    if group_by != 'date':
        group_stage["$group"]["startDate"] = { "$min": "$date_start" }
        group_stage["$group"]["endDate"] = { "$max": "$date_start" }

    # Add names if grouping by campaign or adset
    if group_by == 'campaign':
        group_stage["$group"]["campaignName"] = { "$first": "$campaign_name" }
    elif group_by == 'adset':
        group_stage["$group"]["adsetName"] = { "$first": "$adset_name" }
    elif group_by == 'ad': # <--- Add ad name
        group_stage["$group"]["adName"] = { "$first": "$ad_name" } # Assuming 'ad_name' is the field name
    # --- END ADD ---

    pipeline.append(group_stage)

    # 4. Project for final calculations and formatting
    project_stage: dict = {
        "$project": {
            "_id": 0, # Usually exclude Mongo ID unless it's meaningful (like campaignId)
            "totalSpend": 1,
            "totalClicks": 1,
            "totalImpressions": 1,
            "documentCount": "$count", # Rename count for clarity
            # Calculated Metrics (handle division by zero)
            "avgCPC": {
                "$cond": [ { "$eq": ["$totalClicks", 0] }, 0, { "$divide": ["$totalSpend", "$totalClicks"] } ]
            },
            "avgCPM": {
                 "$cond": [ { "$eq": ["$totalImpressions", 0] }, 0, { "$multiply": [{ "$divide": ["$totalSpend", "$totalImpressions"] }, 1000] } ]
            },
             "avgCTR": {
                 "$cond": [ { "$eq": ["$totalImpressions", 0] }, 0, { "$multiply": [{ "$divide": ["$totalClicks", "$totalImpressions"] }, 100] } ] # As Percentage
            }
        }
    }

    # Add back grouping fields with meaningful names
    if group_by == 'campaign':
        project_stage["$project"]["campaignId"] = "$_id"
        project_stage["$project"]["campaignName"] = 1
    elif group_by == 'adset':
        project_stage["$project"]["adsetId"] = "$_id"
        project_stage["$project"]["adsetName"] = 1
    elif group_by == 'ad': # <--- Project ad fields
        project_stage["$project"]["adId"] = "$_id" # Rename _id which holds ad_id
        project_stage["$project"]["adName"] = 1
        project_stage["$project"]["startDate"] = 1 # Keep date range
        project_stage["$project"]["endDate"] = 1
    # --- END ADD ---
    elif group_by == 'month':
        project_stage["$project"]["yearMonth"] = "$_id" # Keep the year-month object
        project_stage["$project"]["startDate"] = 1
        project_stage["$project"]["endDate"] = 1
    elif group_by == 'date':
        project_stage["$project"]["date"] = "$_id" # Use the date as the identifier
    elif group_by is None: # Total aggregation
        project_stage["$project"]["startDate"] = 1
        project_stage["$project"]["endDate"] = 1


    pipeline.append(project_stage)

    # 5. Optional: Sort results
    # Default sort, can be customized
    sort_field = "totalSpend"
    if group_by == 'month' or group_by == 'date':
        sort_field = "_id" if group_by == 'date' else "yearMonth" # Sort chronologically for time-based grouping

    pipeline.append({ "$sort": { sort_field: 1 if group_by in ['month', 'date'] else -1 } }) # Asc for time, Desc otherwise

    logger.info(f"Constructed Aggregation Pipeline: {pipeline}")
    return pipeline


# --- Aggregation Endpoint ---
@router.post("/meta", summary="Aggregate Meta Ads Data")
async def aggregate_meta_data(
    request: MetaAggregationRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Performs custom aggregation on historical Meta insights data based on
    date range, user, ad account, and optional grouping.
    """
    logger.info(f"Received aggregation request for user {user_id}, account {request.ad_account_id}, range {request.start_date} to {request.end_date}, group_by: {request.group_by}")

    pipeline = build_meta_aggregation_pipeline(
        user_id=user_id,
        ad_account_id=request.ad_account_id,
        start_date=request.start_date.strftime("%Y-%m-%d"),
        end_date=request.end_date.strftime("%Y-%m-%d"),
        group_by=request.group_by
    )

    # build_meta_aggregation_pipeline returns None if user_id format is invalid
    if pipeline is None:
         raise HTTPException(status_code=400, detail="Invalid user identifier format.")

    try:
        # Determine the correct collection based on where the daily data is stored.
        # [cite_start]Assuming meta_daily_insights contains adset_id, campaign_id, etc. [cite: 86-89]
        # If campaign-level data is separate, you might need another endpoint or logic.
        collection_name = "meta_daily_insights" # Default to adset level insights
        if request.group_by == 'campaign':
            collection_name = "meta_daily_campaign_insights"
            logger.info(f"Using collection: {collection_name} for campaign grouping")
        elif request.group_by == 'ad': # Correctly handle 'ad'
            collection_name = "meta_daily_ad_insights"
            logger.info(f"Using collection: {collection_name} for ad grouping")
        collection = db[collection_name]
        results = list(collection.aggregate(pipeline))

        # ObjectId conversion (only needed if grouping by _id from OTHER collections, unlikely here)
        # for doc in results:
        #     if '_id' in doc and isinstance(doc['_id'], ObjectId):
        #         doc['_id'] = str(doc['_id'])

        logger.info(f"Aggregation successful against {collection_name}. Found {len(results)} results.")
        return {"results": results}

    except NameError as e: # Catch the specific error if it somehow persists
        logger.error(f"Error determining collection name: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal configuration error determining data source.")
    except Exception as e:
        logger.error(f"Meta aggregation error for user {user_id}, account {request.ad_account_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database aggregation failed: {str(e)}")