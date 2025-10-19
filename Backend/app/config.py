# app/config.py
from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env from Backend/.env
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
print(f"Loading environment from: {ENV_PATH}")
load_dotenv(ENV_PATH)

class Settings:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") # 👈 ADD THIS LINE

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/google/callback")

    # Back-compat with existing code that uses CLIENT_ID/SECRET/REDIRECT_URI
    CLIENT_ID = GOOGLE_CLIENT_ID
    CLIENT_SECRET = GOOGLE_CLIENT_SECRET
    REDIRECT_URI = GOOGLE_REDIRECT_URI

    # --- Google Ads API ---
    GOOGLE_DEVELOPER_TOKEN = os.getenv("GOOGLE_DEVELOPER_TOKEN")  # REQUIRED
    GOOGLE_TEST_ACCOUNT_ID = os.getenv("GOOGLE_TEST_ACCOUNT_ID")  # optional (for local tests)
    GOOGLE_LOGIN_CUSTOMER_ID = os.getenv("GOOGLE_LOGIN_CUSTOMER_ID")  # optional MCC id (no dashes)

    # --- Meta OAuth ---
    META_APP_ID = os.getenv("META_APP_ID")
    META_APP_SECRET = os.getenv("META_APP_SECRET")
    META_REDIRECT_URI = os.getenv("META_REDIRECT_URI", "http://localhost:8000/meta/callback")

    # --- Database ---
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    DB_NAME = os.getenv("DB_NAME", "ads_project_db")
    DB_NAME = "ads_project_db"

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    SMTP_SERVER = os.getenv("SMTP_SERVER")
    SMTP_PORT = os.getenv("SMTP_PORT")
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")



settings = Settings()

print(f"Loaded META_APP_ID: {settings.META_APP_ID}")