# FILE: app/config.py
"""
Centralized configuration loader for the backend.
-------------------------------------------------
- Loads environment variables from .env
- Provides type-safe access via Settings class
- Adds startup diagnostics for easier debugging
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ------------------------------------------------------------------
# 🌍 Load .env file
# ------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

if not ENV_PATH.exists():
    print(f"[WARN] .env file not found at {ENV_PATH}")
else:
    print(f"[CONFIG] Loading environment variables from: {ENV_PATH}")
    load_dotenv(ENV_PATH)


# ------------------------------------------------------------------
# ⚙️ Application Settings
# ------------------------------------------------------------------
class Settings:
    """Holds configuration values loaded from environment."""

    # --- Core Keys ---
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/google/callback")

    # Backward compatibility
    CLIENT_ID = GOOGLE_CLIENT_ID
    CLIENT_SECRET = GOOGLE_CLIENT_SECRET
    REDIRECT_URI = GOOGLE_REDIRECT_URI

    # --- Google Ads API ---
    GOOGLE_DEVELOPER_TOKEN: str = os.getenv("GOOGLE_DEVELOPER_TOKEN")

    # --- Meta OAuth ---
    META_APP_ID: str = os.getenv("META_APP_ID")
    META_APP_SECRET: str = os.getenv("META_APP_SECRET")
    META_REDIRECT_URI: str = os.getenv("META_REDIRECT_URI", "http://localhost:8000/meta/callback")

    # --- Shopify OAuth ---
    SHOPIFY_CLIENT_ID: str = os.getenv("SHOPIFY_CLIENT_ID")
    SHOPIFY_CLIENT_SECRET: str = os.getenv("SHOPIFY_CLIENT_SECRET")
    SHOPIFY_REDIRECT_URI: str = os.getenv("SHOPIFY_REDIRECT_URI", "http://localhost:8000/shopify/callback")

    # --- Database ---
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    DB_NAME: str = os.getenv("DB_NAME", "ads_project_db")

    # --- Security / Auth ---
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")

    # --- Email ---
    SMTP_SERVER: str = os.getenv("SMTP_SERVER")
    SMTP_PORT: str = os.getenv("SMTP_PORT")
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")

    # --- Optional Debug Mode ---
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    def validate(self):
        """Ensures critical env variables are set."""
        critical = {
            "MONGO_URI": self.MONGO_URI,
            "JWT_SECRET_KEY": self.JWT_SECRET_KEY,
            "DB_NAME": self.DB_NAME,
        }
        missing = [k for k, v in critical.items() if not v]
        if missing:
            raise RuntimeError(f"[CONFIG] Missing critical environment variables: {', '.join(missing)}")


# ------------------------------------------------------------------
# 🔧 Instantiate and Validate
# ------------------------------------------------------------------
settings = Settings()
config = settings  # backward compatibility alias

try:
    settings.validate()
except RuntimeError as e:
    print(e)

# ------------------------------------------------------------------
# 🧾 Startup Diagnostics
# ------------------------------------------------------------------
print("[CONFIG] === Environment Loaded ===")
print(f"  DB_NAME             → {settings.DB_NAME}")
print(f"  MONGO_URI           → {settings.MONGO_URI}")
print(f"  META_APP_ID         → {settings.META_APP_ID}")
print(f"  GOOGLE_CLIENT_ID    → {settings.GOOGLE_CLIENT_ID}")
print(f"  SHOPIFY_CLIENT_ID   → {settings.SHOPIFY_CLIENT_ID}")
print(f"  GEMINI_API_KEY set? → {'✅' if settings.GEMINI_API_KEY else '❌'}")
