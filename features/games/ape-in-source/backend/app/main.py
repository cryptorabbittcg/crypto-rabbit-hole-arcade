# URGENT: Render deployment trigger - Tue Oct 21 01:20:00 AM ACDT 2025 - CRITICAL: Force Render to use latest GitHub code
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.config import settings
from app.api import game, leaderboard, rewards
from app.websockets import game_ws
from app.database import init_db
# Import all models to ensure they are registered with Base
from app.models import *
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    print("🚀 Starting Ape In! Game API...")
    print("📊 Initializing database...")
    await init_db()
    print("✅ Database initialized successfully!")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title="Ape In! Game API",
    description="Backend API for Ape In! push-your-luck card and dice game",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - Allow all origins for development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],  # Allow all methods including OPTIONS
    allow_headers=["*"],  # Allow all headers
)

# Serve static assets (card images) if assets directory exists
assets_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
    print(f"✅ Serving assets from: {assets_path}")

# Include routers
app.include_router(game.router, prefix="/api/game", tags=["game"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["rewards"])
app.include_router(game_ws.router, prefix="/ws", tags=["websocket"])


@app.get("/")
async def root():
    return {"message": "Ape In! Game API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
