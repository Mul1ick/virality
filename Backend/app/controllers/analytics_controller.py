# FILE: app/controllers/analytics_controller.py

from fastapi import APIRouter, HTTPException, Depends
from app.services.analytics_service import AnalyticsService
from app.utils.security import rate_limiter
from app.utils.logger import get_logger

router = APIRouter(tags=["Cross-Platform Analytics"])
logger = get_logger()

# Instantiate once (can also be dependency-injected)
service = AnalyticsService()


@router.post("/{platform}")
def platform_nl_query(platform: str, request: dict, user_id: str = Depends(rate_limiter)):
    """
    Cross-platform NL analytics endpoint.
    Example: POST /analytics/meta → body {"question": "..."}
    """
    question = request.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Missing 'question'")

    return service.run_nl_query(platform, question, user_id)
