# FILE: app/utils/logger.py
"""
Centralized logger setup.
--------------------------
- Writes rotating daily logs to /logs/app_<DD-MM-YYYY>.log
- Prints to console in readable format
- Uses timezone-aware timestamps
- Controlled via LOG_LEVEL or DEBUG in .env
"""

import logging
from logging.handlers import TimedRotatingFileHandler
import os
from datetime import datetime
from zoneinfo import ZoneInfo  # Python 3.9+

# ---------------------------------------------------------------------
# 🔧 Directories
# ---------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "app.log")

# ---------------------------------------------------------------------
# 🧠 Environment-based log level
# ---------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_TZ = os.getenv("LOG_TZ", "Asia/Kolkata")

# ---------------------------------------------------------------------
# 🧩 Custom Timezone-Aware Formatter
# ---------------------------------------------------------------------
class TZFormatter(logging.Formatter):
    """Formats timestamps in a consistent timezone (default Asia/Kolkata)."""

    def formatTime(self, record, datefmt=None):
        dt = datetime.fromtimestamp(record.created, ZoneInfo(LOG_TZ))
        return dt.strftime(datefmt or "%Y-%m-%d %H:%M:%S")

# ---------------------------------------------------------------------
# 🧾 Custom File Rotation Handler
# ---------------------------------------------------------------------
class CustomTimedRotatingFileHandler(TimedRotatingFileHandler):
    """Rotates logs daily, naming files as app_DD-MM-YYYY.log."""
    def rotation_filename(self, default_name):
        dirname, _ = os.path.split(default_name)
        date_str = datetime.now().strftime("%d-%m-%Y")
        return os.path.join(dirname, f"app_{date_str}.log")

# ---------------------------------------------------------------------
# 🏗️ Logger Configuration
# ---------------------------------------------------------------------
logger = logging.getLogger("virality_backend")
logger.setLevel(LOG_LEVEL)

file_handler = CustomTimedRotatingFileHandler(
    LOG_FILE, when="midnight", interval=1, backupCount=7, encoding="utf-8"
)
file_formatter = TZFormatter("%(asctime)s - %(levelname)s - %(message)s")
file_handler.setFormatter(file_formatter)

console_handler = logging.StreamHandler()
console_formatter = TZFormatter("[%(levelname)s] %(message)s")
console_handler.setFormatter(console_formatter)

# Prevent duplicate handlers if re-imported
if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

def get_logger():
    """Returns the singleton logger instance."""
    return logger
