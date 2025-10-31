# FILE: Backend/app/controllers/admin_controller.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId

from app.database.mongo_client import db
from app.utils.security import get_current_user_id
from app.utils.logger import get_logger

logger = get_logger()
router = APIRouter(tags=["Admin"])
users_collection = db["users"]

# --- Admin Dependency ---

async def get_admin_user(user_id: str = Depends(get_current_user_id)):
    """
    Dependency to ensure the current user is an admin.
    Fetches the user from DB based on ID from token and checks isAdmin flag.
    """
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user ID format")

    if not user or not user.get("isAdmin", False):
        logger.warning(f"Non-admin user {user_id} attempted to access admin route.")
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return user

# --- Admin Routes ---

@router.get("/users", dependencies=[Depends(get_admin_user)], summary="List all users")
async def list_users():
    """
    Retrieves all users from the database for admin review.
    Excludes sensitive fields like OTP.
    """
    try:
        users = list(users_collection.find(
            {}, 
            {"otp": 0, "otp_expiry": 0}
        ))
        
        # Convert ObjectId to string for JSON serialization
        for user in users:
            user["_id"] = str(user["_id"])
            
        return users
    except Exception as e:
        logger.error(f"Admin failed to list users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve users")


@router.post("/users/{user_id}/approve", dependencies=[Depends(get_admin_user)], summary="Approve a user")
async def approve_user(user_id: str):
    """
    Sets a user's status to 'approved'.
    """
    try:
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "approved"}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Admin approved user {user_id}")
        return {"message": "User approved successfully"}
    except Exception as e:
        logger.error(f"Admin failed to approve user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to approve user")


@router.post("/users/{user_id}/reject", dependencies=[Depends(get_admin_user)], summary="Reject a user")
async def reject_user(user_id: str):
    """
    Sets a user's status to 'rejected'.
    """
    try:
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "rejected"}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
            
        logger.info(f"Admin rejected user {user_id}")
        return {"message": "User rejected successfully"}
    except Exception as e:
        logger.error(f"Admin failed to reject user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reject user")