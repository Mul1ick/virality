from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import random
import string
from datetime import datetime, timedelta
from jose import jwt

from app.utils.logger import get_logger
from app.database.mongo_client import db
from app.utils.email_sender import send_otp_email
from app.config import config

router = APIRouter(prefix='/auth', tags=["Authentication"])

# --- Security and Configuration ---
SECRET_KEY = config.settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

users_collection = db["users"]
logger = get_logger()
# --- Pydantic Models ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr

class OtpVerify(BaseModel):
    email: EmailStr
    otp: str

# --- Helper Functions ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))


@router.get("/test")
async def auth_test():
    logger.info("Auth test endpoint hit!")
    return {"message": "Auth controller is working!"}
# <<<------------------------------->>>

# --- API Endpoints ---
@router.post("/register")
def register_user(user: UserCreate):
    """Creates a new user account. No OTP is sent at this stage."""
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=409, detail="This email is already registered. Please sign in instead.")

    users_collection.insert_one({
        "name": user.name,
        "email": user.email,
        "created_at": datetime.utcnow(),
    })
    return {"message": "Account created successfully! Please sign in to continue."}

@router.post("/login")
def login_user(user: UserLogin):
    """Verifies a user exists and sends them an OTP to their email."""
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="Email not found. Please sign up first.")

    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)

    users_collection.update_one(
        {"email": user.email},
        {"$set": {"otp": otp, "otp_expiry": otp_expiry}}
    )

    if not send_otp_email(user.email, otp):
         raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again later.")

    return {"message": "OTP sent to your email. Please verify."}


@router.post("/verify-otp")
def verify_otp(data: OtpVerify):
    """Verifies the OTP and returns a JWT if successful."""
    user = users_collection.find_one({"email": data.email})

    if not user or user.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if datetime.utcnow() > user.get("otp_expiry", datetime.min):
        raise HTTPException(status_code=400, detail="OTP has expired")

    users_collection.update_one(
        {"email": data.email},
        {"$set": {"otp": None, "otp_expiry": None}}
    )

    access_token = create_access_token(data={"sub": user["email"], "user_id": str(user["_id"])})
    logger.info(f"Generated JWT for {user['email']}: {access_token}")
    return {"access_token": access_token, "token_type": "bearer", "user_id": str(user["_id"])}