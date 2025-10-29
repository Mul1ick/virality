# FILE: app/services/user_service.py

from fastapi import HTTPException
from app.database.mongo_client import get_user_connection_status, get_user_by_id
from app.utils.logger import get_logger

logger = get_logger()


class UserService:
    """
    Handles user profile and platform connection logic.
    Keeps database access and validation separate from FastAPI routes.
    """

    @staticmethod
    def get_platform_connections(user_id: str) -> dict:
        """
        Fetches all connected platform statuses for a user.
        """
        try:
            connection_status = get_user_connection_status(user_id)
            if connection_status is None:
                logger.error(f"[UserService] No connection status found for user_id={user_id}")
                raise HTTPException(status_code=500, detail="Could not retrieve platform connection status.")
            logger.info(f"[UserService] Retrieved platform connections for user_id={user_id}")
            return connection_status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[UserService] Error fetching platform connections: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Internal error retrieving platform connections: {e}")

    @staticmethod
    def get_profile(user_id: str) -> dict:
        """
        Retrieves basic profile information for the given user.
        """
        try:
            user_data = get_user_by_id(user_id)
            if not user_data:
                logger.warning(f"[UserService] User not found: {user_id}")
                raise HTTPException(status_code=404, detail="User not found")

            return {
                "id": str(user_data.get("_id")),
                "name": user_data.get("name", "User"),
                "email": user_data.get("email"),
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[UserService] Error fetching profile for {user_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Internal error retrieving user profile: {e}")
