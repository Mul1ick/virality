from fastapi import FastAPI
from app.utils.logger import get_logger
from app.controllers import google_controller,meta_controller,auth_controller,analytics_controller
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler # 👈 Import scheduler
from app.scheduler import sync_all_meta_data # 👈 Import your job


logger = get_logger()
app = FastAPI(title="Ads Integration Backend")
scheduler = AsyncIOScheduler()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",  # Add other ports if needed
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Register routers
app.include_router(auth_controller.router) # 👈 Add this line first
app.include_router(google_controller.router)
app.include_router(meta_controller.router) # <-- Add this line
app.include_router(analytics_controller.router)


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 FastAPI app started")
    scheduler.add_job(sync_all_meta_data, "interval", minutes=5)
    scheduler.start()
    logger.info("Scheduler started, Meta sync job scheduled.")


@app.get("/")
def root():
    logger.info("Root endpoint called")
    return {"message": "Welcome to Ads Project Backend"}
