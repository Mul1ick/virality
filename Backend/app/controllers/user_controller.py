# Backend/app/controllers/user_controller.py

from fastapi import APIRouter, HTTPException, Depends
from app.database import get_user_connection_status # Import the function we created
from app.utils.security import get_current_user_id # Import dependency for authentication
from app.utils.logger import get_logger

router = APIRouter(prefix="/user", tags=["User"])
logger = get_logger()

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