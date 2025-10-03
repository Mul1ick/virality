from fastapi import FastAPI
from app.utils.logger import get_logger
from app.controllers import google_controller

logger = get_logger()
app = FastAPI(title="Ads Integration Backend")

# Register routers
app.include_router(google_controller.router)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 FastAPI app started")

@app.get("/")
def root():
    logger.info("Root endpoint called")
    return {"message": "Welcome to Ads Project Backend"}
