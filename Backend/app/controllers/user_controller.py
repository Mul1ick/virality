# Backend/app/controllers/user_controller.py

from fastapi import APIRouter, HTTPException, Depends
from app.database import get_user_connection_status, get_user_by_id
from app.utils.security import get_current_user_id 
from app.utils.logger import get_logger
from pydantic import BaseModel, EmailStr 
from typing import Optional 

router = APIRouter(prefix="/user", tags=["User"])
logger = get_logger()

class UserProfile(BaseModel):
    id: str # Represents the MongoDB _id as a string
    name: Optional[str] = "User" # Default if not found
    email: Optional[EmailStr] = None
    # Add other fields you might want to return, e.g., created_at

@router.get("/{user_id}/platforms", response_model=dict)
async def get_user_platforms(
    user_id: str,
    # Ensure the request is authenticated.
    # In a real app, you might add checks here to ensure the requesting user
    # is allowed to see the data for the requested user_id (e.g., they match).
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Retrieves the connection status and essential identifiers for all
    platforms associated with the given user ID.
    """
    logger.info(f"Fetching platform connection status for user_id: {user_id} (requested by {current_user_id})")
    if user_id != current_user_id:
         # Basic authorization check: Allow users to only request their own data
         logger.warning(f"Authorization failed: User {current_user_id} attempted to access data for user {user_id}")
         raise HTTPException(status_code=403, detail="Not authorized to access this user's data")


    connection_status = get_user_connection_status(user_id)

    if connection_status is None: # Function might return None on error
        logger.error(f"Failed to retrieve connection status for user_id: {user_id}")
        raise HTTPException(status_code=500, detail="Could not retrieve platform connection status.")

    # The function already formats the response as needed
    return connection_status

@router.get("/{user_id}/profile", response_model=UserProfile)
async def get_user_profile(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Retrieves the profile information (name, email) for the specified user ID.
    """
    logger.info(f"Fetching profile for user_id: {user_id} (requested by {current_user_id})")
    # Authorization check: Ensure users can only fetch their own profile
    if user_id != current_user_id:
        logger.warning(f"Authorization failed: User {current_user_id} attempted to access profile for user {user_id}")
        raise HTTPException(status_code=403, detail="Not authorized to access this user's profile")

    # Fetch user data from the database using the existing function
    user_data = get_user_by_id(user_id) # Assumes get_user_by_id takes the string _id

    if not user_data:
        logger.error(f"User profile not found for user_id: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    # Prepare and return the response using the Pydantic model
    return UserProfile(
        id=str(user_data.get("_id")), # Convert ObjectId to string
        name=user_data.get("name", "User"),
        email=user_data.get("email")
    )