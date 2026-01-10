from fastapi import APIRouter
from app.config import settings

router = APIRouter()


@router.get("/configs")
async def get_bot_configs():
    """Get all bot configurations"""
    return settings.BOT_CONFIGS


@router.get("/configs/{bot_name}")
async def get_bot_config(bot_name: str):
    """Get specific bot configuration"""
    config = settings.BOT_CONFIGS.get(bot_name)
    if not config:
        return {"error": "Bot not found"}
    return config


