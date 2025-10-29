# FILE: app/main.py
"""
Main FastAPI application entrypoint
-----------------------------------
- Registers all platform and analytics controllers
- Enables CORS for local frontend dev
- Integrates centralized logging
- Provides a root endpoint for quick health check
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.utils.logger import get_logger
from app.controllers import (
    google_controller,
    meta_controller,
    auth_controller,
    analytics_controller,
    shopify_controller,
    user_controller,
    aggregation_controller,
)

logger = get_logger()
app = FastAPI(
    title="Ads Integration Backend",
    description="Unified backend for Google, Meta, and Shopify Ads integrations.",
    version="1.0.0",
)

# --------------------------------------------------------------------
# 🌐 CORS Configuration
# --------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",  # Frontend ports (React/Vue)
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],  # Allow all custom headers
)
logger.info("✅ CORS middleware initialized.")

# --------------------------------------------------------------------
# 🔗 Router Registration
# --------------------------------------------------------------------
app.include_router(auth_controller.router, tags=["Authentication"])
app.include_router(google_controller.router, prefix="/google", tags=["Google Ads"])
app.include_router(meta_controller.router, prefix="/meta", tags=["Meta Ads"])
app.include_router(shopify_controller.router, prefix="/shopify", tags=["Shopify"])
app.include_router(analytics_controller.router, prefix="/analytics", tags=["Analytics"])
app.include_router(user_controller.router, prefix="/user", tags=["User"])
app.include_router(aggregation_controller.router, prefix="/aggregate", tags=["Aggregation"])

logger.info("✅ All routers registered successfully.")

# --------------------------------------------------------------------
# 🚀 Startup / Shutdown Events
# --------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 FastAPI backend started successfully.")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 FastAPI backend shutting down.")


# --------------------------------------------------------------------
# 🏠 Root Endpoint
# --------------------------------------------------------------------
@app.get("/", tags=["Health"])
async def root():
    """Root health check endpoint."""
    logger.info("Root endpoint accessed.")
    return {"message": "Welcome to Ads Integration Backend 🚀"}
