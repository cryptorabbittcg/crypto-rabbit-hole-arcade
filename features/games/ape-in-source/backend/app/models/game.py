from sqlalchemy import Column, String, Integer, DateTime, Boolean, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, default=generate_uuid)
    mode = Column(String, nullable=False)  # sandy, aida, lana, enj1n, nifty, pvp, multiplayer, tournament
    status = Column(String, default="waiting")  # waiting, playing, finished
    winning_score = Column(Integer, default=150)
    max_rounds = Column(Integer, default=10)
    current_round = Column(Integer, default=1)  # Start at Round 1
    winner_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    players = relationship("Player", back_populates="game", cascade="all, delete-orphan")
    game_state = relationship("GameState", back_populates="game", uselist=False, cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"

    id = Column(String, primary_key=True, default=generate_uuid)
    game_id = Column(String, ForeignKey("games.id"), nullable=False)
    name = Column(String, nullable=False)
    wallet_address = Column(String, nullable=True)
    score = Column(Integer, default=0)
    turn_score = Column(Integer, default=0)
    is_ai = Column(Boolean, default=False)
    ai_type = Column(String, nullable=True)  # sandy, aida, lana, enj1n, nifty
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    game = relationship("Game", back_populates="players")


class GameState(Base):
    __tablename__ = "game_states"

    id = Column(String, primary_key=True, default=generate_uuid)
    game_id = Column(String, ForeignKey("games.id"), nullable=False, unique=True)
    current_player_id = Column(String, nullable=True)
    current_card = Column(JSON, nullable=True)  # Stores card data as JSON
    last_roll = Column(Integer, nullable=True)
    ape_in_active = Column(Boolean, default=False)
    used_bearish_flags = Column(JSON, default=list)  # List of used bearish card types
    game_log = Column(JSON, default=list)  # Log of game actions
    last_completed_player_id = Column(String, nullable=True)  # Track who last stacked/busted to detect round changes
    
    # Relationships
    game = relationship("Game", back_populates="game_state")


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"

    id = Column(String, primary_key=True, default=generate_uuid)
    player_name = Column(String, nullable=False)
    wallet_address = Column(String, nullable=True, unique=True)
    total_wins = Column(Integer, default=0)
    total_losses = Column(Integer, default=0)
    total_games = Column(Integer, default=0)
    high_score = Column(Integer, default=0)
    total_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

