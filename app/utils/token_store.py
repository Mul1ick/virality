"""
Temporary in-memory token store.
Later we can replace this with MongoDB or Redis without changing controller logic.
"""

from typing import Optional
import time

# single global variable to hold tokens while app runs
_google_tokens: Optional[dict] = None


def save_google_tokens(tokens: dict):
    """Save OAuth tokens (with timestamp) in memory"""
    global _google_tokens
    tokens["saved_at"] = int(time.time())
    _google_tokens = tokens


def get_google_access_token() -> Optional[str]:
    """Return current access token if stored"""
    if _google_tokens and "access_token" in _google_tokens:
        return _google_tokens["access_token"]
    return None


def get_full_google_token() -> Optional[dict]:
    """Return full token object (useful for debug)"""
    return _google_tokens
