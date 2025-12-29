# FILE: app/utils/security.py

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pymongo import MongoClient
from jose import JWTError, jwt
from datetime import datetime, timedelta
from bson import ObjectId
import os

from app.config.config import settings
from app.utils.logger import get_logger

logger = get_logger()

# --------------------------------------------------------------------
# 🔐 JWT Configuration
# --------------------------------------------------------------------
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))
STATE_TOKEN_EXPIRE_MINUTES = 15

# --------------------------------------------------------------------
# 🧭 OAuth2 Scheme
# --------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/verify-otp")

# --------------------------------------------------------------------
# 🧱 Mongo Setup (Rate Limiting)
# --------------------------------------------------------------------
client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]
users_collection = db["users"]
HOURLY_LIMIT = 50

# --------------------------------------------------------------------
# 🔑 JWT Helpers
# --------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates an access token with default 24-hour expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_state_token(data: dict):
    """Creates a short-lived token used only for OAuth state verification."""
    expire = datetime.utcnow() + timedelta(minutes=STATE_TOKEN_EXPIRE_MINUTES)
    to_encode = data.copy()
    to_encode.update({"exp": expire, "purpose": "oauth_state"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    """Validates and decodes any JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_identifier = payload.get("sub")
        if not user_identifier:
            logger.warning("[AUTH] Token missing 'sub' claim.")
            raise credentials_exception
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.error(f"[AUTH] JWT decode error: {e}")
        raise credentials_exception


# --------------------------------------------------------------------
# 👤 Current User Extraction
# --------------------------------------------------------------------
async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """Extracts MongoDB user ID from JWT."""
    payload = decode_token(token)
    mongo_user_id = payload.get("user_id")

    if not mongo_user_id:
        logger.error("[AUTH] JWT missing 'user_id' claim.")
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    logger.debug(f"[AUTH] Authenticated user → {mongo_user_id}")
    return mongo_user_id


# --------------------------------------------------------------------
# ⏱️ Rate Limiter
# --------------------------------------------------------------------
async def rate_limiter(user_id: str = Depends(get_current_user_id)) -> str:
    """Allows up to HOURLY_LIMIT API requests per user per hour."""
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)

    try:
        query_user_oid = ObjectId(user_id)
    except Exception:
        logger.warning(f"[RATE] Invalid ObjectId for user_id={user_id}")
        raise HTTPException(status_code=401, detail="Invalid user identifier.")

    user = users_collection.find_one({"_id": query_user_oid})

    # 🧹 Filter old timestamps
    if user and "query_timestamps" in user:
        recent_queries = [
            ts for ts in user["query_timestamps"]
            if isinstance(ts, datetime) and ts > one_hour_ago
        ]
        if len(recent_queries) >= HOURLY_LIMIT:
            logger.warning(f"[RATE] User {user_id} exceeded {HOURLY_LIMIT}/hr limit.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )

        # Update timestamps
        users_collection.update_one(
            {"_id": query_user_oid},
            {"$push": {"query_timestamps": now}}
        )
    else:
        # Create or reset timestamps list
        users_collection.update_one(
            {"_id": query_user_oid},
            {"$set": {"query_timestamps": [now]}},
            upsert=True
        )
        if not user:
            logger.info(f"[RATE] Created rate tracking doc for user {user_id}")

    return user_id
