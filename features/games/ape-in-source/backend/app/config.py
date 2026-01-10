from pydantic_settings import BaseSettings
from typing import Dict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./ape_in_game.db"  # Using SQLite for production due to asyncpg compatibility issues
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    CORS_ORIGINS: str = "*"
    ENVIRONMENT: str = "development"  # Will be overridden by environment variable
    
    class Config:
        env_file = ".env"
    
    # Game settings
    MAX_SCORE: int = 150
    MAX_ROUNDS: int = 10
    TURN_TIMEOUT_SECONDS: int = 60
    
    # Bot configurations
    BOT_CONFIGS: Dict[str, Dict] = {
        "sandy": {
            "name": "Sandy",
            "difficulty": "Tutorial",
            "winning_score": 150,
            "max_rounds": 10,
            "target_scores": [21],
            "risk": {"basePush": 0.10, "behindPush": 0.20, "behindGap": 50},
            "jitter": {"enabled": False, "pct": 0.0},
            "diceModes": ["sandy"],
            "description": "Tutorial bot - Perfect for beginners!",
            "personality": "Friendly and encouraging"
        },
        "aida": {
            "name": "Aida",
            "difficulty": "Medium",
            "winning_score": 300,  # legacy: 300
            "max_rounds": 20,      # legacy: 20
            "target_scores": [21, 26, 40],
            "risk": {"midMin": 21, "midMax": 39, "midPush": 0.50, "highStack": 40, "behindGap": 30, "behindPush": 0.60},
            "jitter": {"enabled": True, "pct": 0.10},
            "diceModes": ["aida", "aida_aggressive"],
            "description": "Balanced strategy with smart plays",
            "personality": "Strategic and analytical"
        },
        "lana": {
            "name": "Lana",
            "difficulty": "Hard",
            "winning_score": 200,  # legacy: 200
            "max_rounds": 15,      # legacy: 15
            "target_scores": [30],
            "risk": {"stackAt": 30, "stackBias": 0.70},
            "jitter": {"enabled": True, "pct": 0.10},
            "diceModes": ["lana", "lana_aggressive"],
            "description": "Aggressive player who takes big risks",
            "personality": "Bold and daring"
        },
        "enj1n": {
            "name": "EnJ1n",
            "difficulty": "Expert",
            "winning_score": 300,  # legacy: 300
            "max_rounds": 15,      # legacy: 15
            "no_round_limit": True,
            "target_scores": [34, 42, 55],
            "risk": {"behindGap": 20, "stackAt": 50, "basePush": 0.75},
            "jitter": {"enabled": True, "pct": 0.10},
            "diceModes": ["enj1n", "enj1n_aggressive"],
            "description": "Master player with unpredictable moves",
            "personality": "Calculated chaos"
        },
        "nifty": {
            "name": "Nifty",
            "difficulty": "Medium-Hard",
            "winning_score": 150,  # legacy: 150
            "max_rounds": 10,      # legacy: 10
            "no_round_limit": True,
            "target_scores": [50],
            "risk": {"stackAt": 50, "behindGap": 20},
            "jitter": {"enabled": True, "pct": 0.10},
            "diceModes": ["nifty", "nifty_aggressive"],
            "description": "Adaptable player who changes tactics",
            "personality": "Clever and unpredictable"
        }
    }

settings = Settings()
