from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/google/callback")
    DEVELOPER_TOKEN = os.getenv("GOOGLE_DEVELOPER_TOKEN")
    META_APP_ID = os.getenv("META_APP_ID")
    META_APP_SECRET = os.getenv("META_APP_SECRET")
    META_REDIRECT_URI = os.getenv("META_REDIRECT_URI", "http://localhost:8000/meta/callback")

    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    DB_NAME = "ads_project_db"


settings = Settings()
