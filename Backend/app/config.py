from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env from the app directory
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / '.env'

print(f"Loading environment from: {ENV_PATH}") 
load_dotenv(ENV_PATH)

class Settings:
    CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/google/callback")

    META_APP_ID = os.getenv("META_APP_ID")
    META_APP_SECRET = os.getenv("META_APP_SECRET")
    META_REDIRECT_URI = os.getenv("META_REDIRECT_URI", "http://localhost:8000/meta/callback")

    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    DB_NAME = "ads_project_db"

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    SMTP_SERVER = os.getenv("SMTP_SERVER")
    SMTP_PORT = os.getenv("SMTP_PORT")
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")



settings = Settings()

print(f"Loaded META_APP_ID: {settings.META_APP_ID}")