from sqlalchemy import Column, String, Integer, DateTime, Float
from datetime import datetime
from app.database.database import Base

class RewardsPool(Base):
    __tablename__ = "rewards_pool"
    
    id = Column(String, primary_key=True)
    total_apecoin_collected = Column(Float, default=0.0)
    total_games_played = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GamePayment(Base):
    __tablename__ = "game_payments"
    
    id = Column(String, primary_key=True)
    game_id = Column(String, nullable=False)
    player_id = Column(String, nullable=False)
    wallet_address = Column(String, nullable=False)
    amount_apecoin = Column(Float, nullable=False)
    game_mode = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
