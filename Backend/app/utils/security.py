from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer # Changed from APIKeyHeader
from pymongo import MongoClient
from app.config import settings
from datetime import datetime, timedelta
from jose import JWTError, jwt # Import JWTError and jwt
from app.utils.logger import get_logger
from bson import ObjectId

logger = get_logger()

# --- JWT Configuration ---
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
# Access token expiry is already defined in auth_controller, but we need one for state
STATE_TOKEN_EXPIRE_MINUTES = 15 # State token valid for 15 minutes

# --- OAuth2 Scheme ---
# This tells FastAPI to look for 'Authorization: Bearer <token>' header
# The tokenUrl is technically not used here for validation itself, but required by OAuth2PasswordBearer
# Point it to your token verification endpoint (e.g., /auth/verify-otp, though it doesn't fit perfectly)
# Or just a placeholder like "token" if you handle validation purely via decoding.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/verify-otp") # Adjusted

# --- Database for Rate Limiting ---
client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]
users_collection = db.users
HOURLY_LIMIT = 50 # Keep rate limiting


# --- NEW: JWT Helper Functions ---

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Creates the main authentication JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default expiry from auth_controller (e.g., 24 hours)
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES or 60 * 24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_state_token(data: dict):
    """Creates a short-lived JWT specifically for the OAuth state parameter."""
    expire = datetime.utcnow() + timedelta(minutes=STATE_TOKEN_EXPIRE_MINUTES)
    to_encode = data.copy()
    to_encode.update({"exp": expire, "purpose": "oauth_state"}) # Add expiry and purpose claim
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    """Decodes and validates a JWT (used for both auth and state tokens)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_identifier: str | None = payload.get("sub") # 'sub' usually holds the user ID/email
        if user_identifier is None:
            logger.warning("Token payload missing 'sub' claim.")
            raise credentials_exception
        # You could add more checks here, e.g., check token purpose if needed
        # if payload.get("purpose") == "oauth_state":
        #    logger.info("Decoded OAuth state token.")
        # elif payload.get("purpose") == "access_token": # Assuming you add this claim
        #    logger.info("Decoded access token.")

        return payload
    except JWTError as e:
        logger.error(f"JWT Error: {e}")
        # Reraise specific exceptions based on JWTError if needed
        if "expired" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise credentials_exception # For other errors (invalid signature etc.)
    except Exception as e:
         logger.error(f"Unexpected error during token decoding: {e}")
         raise credentials_exception


# --- UPDATED: Dependency to get User ID from JWT ---

async def get_current_user_id(token: str = Depends(oauth2_scheme)):
    """
    Dependency that decodes the JWT from the Authorization header
    and returns the user ID ('sub' claim).
    """
    payload = decode_token(token)
    user_id = payload.get("sub")
    # Note: 'sub' contains whatever you put in it during token creation.
    # In auth_controller.py's create_access_token, it uses:
    # data={"sub": user["email"], "user_id": str(user["_id"])}
    # So, payload.get("sub") will be the email.
    # If you consistently need the MongoDB _id, use payload.get("user_id").
    # Let's return the MongoDB _id string for consistency with database operations.
    mongo_user_id = payload.get("user_id")
    if not mongo_user_id:
         logger.error("JWT payload missing 'user_id' claim needed for database operations.")
         raise HTTPException(status_code=401, detail="Invalid token payload.")

    logger.debug(f"Authenticated user ID (from token): {mongo_user_id}")
    return mongo_user_id

async def rate_limiter(user_id: str = Depends(get_current_user_id)):
    """Rate limits requests based on user ID obtained from JWT."""
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    # --- ADD ObjectId import and conversion ---
    try:
        query_user_oid = ObjectId(user_id)
    except Exception as e:
         logger.error(f"Rate limiter received invalid user_id format for ObjectId conversion: {user_id}. Error: {e}")
         # Cannot proceed without a valid ObjectId to query the primary key
         raise HTTPException(
             status_code=status.HTTP_401_UNAUTHORIZED, # Or 400 Bad Request
             detail="Invalid user identifier for rate limiting.",
         )
    # --- Use "_id" and the ObjectId for querying/updating ---
    user = users_collection.find_one({"_id": query_user_oid})

    if user and "query_timestamps" in user:
        # Filter timestamps (ensure they are datetime objects)
        recent_queries = [
            ts for ts in user.get("query_timestamps", [])
            if isinstance(ts, datetime) and ts > one_hour_ago
        ]

        if len(recent_queries) >= HOURLY_LIMIT:
             logger.warning(f"Rate limit exceeded for user {user_id}")
             raise HTTPException(
                 status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                 detail="Rate limit exceeded. Please try again later."
             )

        # Add current timestamp
        users_collection.update_one(
             {"_id": query_user_oid}, # Use _id
             {"$push": {"query_timestamps": now}}
         )
    else:
         # If user or timestamps don't exist, create/set them
         # Note: If user is None here, it means the user_id from the valid JWT wasn't found in DB?
         if not user:
             logger.warning(f"User {user_id} not found in DB during rate limiting check, but JWT was valid. Creating timestamp entry.")
             # Consider if upsert is truly desired if the user *should* always exist
         users_collection.update_one(
             {"_id": query_user_oid}, # Use _id
             {"$set": {"query_timestamps": [now]}},
             upsert=True # Creates the user doc if it doesn't exist, ONLY sets timestamps if it does
         )

    return user_id # Return the original string ID