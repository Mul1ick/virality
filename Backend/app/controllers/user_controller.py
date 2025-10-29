# FILE: app/controllers/user_controller.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.services.user_service import UserService
from app.utils.security import get_current_user_id
from app.utils.logger import get_logger

router = APIRouter( tags=["User"])
logger = get_logger()

# ------------------------------------------------------------
# Response Models
# ------------------------------------------------------------
class UserProfile(BaseModel):
    id: str
    name: Optional[str] = "User"
    email: Optional[EmailStr] = None


# ------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------
@router.get("/{user_id}/platforms", response_model=dict)
async def get_user_platforms(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Retrieves the platform connection status (Google, Meta, Shopify, etc.)
    for the given user ID.
    """
    logger.info(f"[UserController] GET /user/{user_id}/platforms requested by {current_user_id}")

    if user_id != current_user_id:
        logger.warning(f"[UserController] Unauthorized access: {current_user_id} → {user_id}")
        raise HTTPException(status_code=403, detail="Not authorized to access this user's data")

    return UserService.get_platform_connections(user_id)


@router.get("/{user_id}/profile", response_model=UserProfile)
async def get_user_profile(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Returns the authenticated user's basic profile info (id, name, email).
    """
    logger.info(f"[UserController] GET /user/{user_id}/profile requested by {current_user_id}")

    if user_id != current_user_id:
        logger.warning(f"[UserController] Unauthorized access: {current_user_id} → {user_id}")
        raise HTTPException(status_code=403, detail="Not authorized to access this user's profile")

    profile_data = UserService.get_profile(user_id)
    return UserProfile(**profile_data)
