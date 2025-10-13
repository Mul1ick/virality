import logging
from logging.handlers import TimedRotatingFileHandler
import os
from datetime import datetime

# Force absolute root path resolution (bulletproof)
CURRENT_FILE = os.path.abspath(__file__)
BACKEND_DIR = CURRENT_FILE.split("Backend")[0] + "Backend"
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)


LOG_FILE = os.path.join(LOG_DIR, "app.log")

logger = logging.getLogger("ads_project")
logger.setLevel(logging.INFO)

class CustomTimedRotatingFileHandler(TimedRotatingFileHandler):
    """Custom handler: saves rotated logs as app_DD-MM-YYYY.log"""
    def rotation_filename(self, default_name):
        dirname, _ = os.path.split(default_name)
        date_str = datetime.now().strftime("%d-%m-%Y")
        return os.path.join(dirname, f"app_{date_str}.log")

file_handler = CustomTimedRotatingFileHandler(
    LOG_FILE, when="midnight", interval=1, backupCount=7, encoding="utf-8"
)
file_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
file_handler.setFormatter(file_formatter)

console_handler = logging.StreamHandler()
console_formatter = logging.Formatter("[%(levelname)s] %(message)s")
console_handler.setFormatter(console_formatter)

if not logger.hasHandlers():
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

def get_logger():
    return logger
