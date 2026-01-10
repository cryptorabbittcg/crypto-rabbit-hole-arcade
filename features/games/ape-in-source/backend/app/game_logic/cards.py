import random
import os
from typing import Dict, List
from pydantic import BaseModel


class Card(BaseModel):
    name: str
    type: str  # Cipher, Oracle, Historacle, Bearish, Special
    value: int
    image_url: str
    penalty: str | None = None


# Base URL for card images - served from frontend
from app.config import settings
import os

# FORCE PRODUCTION URL - Render deployment fix - Tue Oct 21 15:00:00 ACDT 2025
# Check if we're running locally first (most specific)
if os.getenv("LOCAL") == "true":
    CARD_BASE_URL = "http://localhost:3000/assets/cards"
    print(f"🔧 Using LOCAL development card URL: {CARD_BASE_URL}")
else:
    # FORCE PRODUCTION - Render is not detecting environment correctly
    CARD_BASE_URL = "https://ape-in-game.vercel.app/assets/cards"
    print(f"🔧 FORCING production card URL: {CARD_BASE_URL}")
    print(f"🔧 Environment detection: LOCAL={os.getenv('LOCAL')}, RENDER={os.getenv('RENDER')}, ENVIRONMENT={settings.ENVIRONMENT}, PORT={os.getenv('PORT')}")
    print(f"🔧 FORCE DEPLOY TIMESTAMP: Tue Oct 21 15:00:00 ACDT 2025")

# Define all cards
CIPHER_CARDS = [
    Card(name="Abbie", type="Cipher", value=1, image_url=f"{CARD_BASE_URL}/Cipher_1pt_Abbie.jpg"),
    Card(name="Alita", type="Cipher", value=1, image_url=f"{CARD_BASE_URL}/Cipher_1pt_Alita.jpg"),
    Card(name="EnJ1n", type="Cipher", value=1, image_url=f"{CARD_BASE_URL}/Cipher_1pt_EnJ1n.jpg"),
    Card(name="Jakey", type="Cipher", value=1, image_url=f"{CARD_BASE_URL}/Cipher_1pt_Jakey.jpg"),
    Card(name="Ace", type="Cipher", value=2, image_url=f"{CARD_BASE_URL}/Cipher_2pt_Ace.jpg"),
    Card(name="Beats", type="Cipher", value=2, image_url=f"{CARD_BASE_URL}/Cipher_2pt_Beats.jpg"),
    Card(name="Dash", type="Cipher", value=2, image_url=f"{CARD_BASE_URL}/Cipher_2pt_Dash.jpg"),
    Card(name="Ray", type="Cipher", value=2, image_url=f"{CARD_BASE_URL}/Cipher_2pt_Ray.jpg"),
    Card(name="Jazzy", type="Cipher", value=3, image_url=f"{CARD_BASE_URL}/Cipher_3pt_Jazzy.jpg"),
    Card(name="Meemo", type="Cipher", value=3, image_url=f"{CARD_BASE_URL}/Cipher_3pt_Meemo.jpg"),
    Card(name="Sabrina", type="Cipher", value=3, image_url=f"{CARD_BASE_URL}/Cipher_3pt_Sabrina.jpg"),
    Card(name="Thea", type="Cipher", value=3, image_url=f"{CARD_BASE_URL}/Cipher_3pt_Thea.jpg"),
    Card(name="Nero", type="Cipher", value=5, image_url=f"{CARD_BASE_URL}/Cipher_5pt_Nero.jpg"),
    Card(name="Saul", type="Cipher", value=5, image_url=f"{CARD_BASE_URL}/Cipher_5pt_Saul.jpg"),
    Card(name="Somi", type="Cipher", value=5, image_url=f"{CARD_BASE_URL}/Cipher_5pt_Somi.jpg"),
    Card(name="Wick", type="Cipher", value=5, image_url=f"{CARD_BASE_URL}/Cipher_5pt_Wick.jpg"),
    Card(name="Sandy", type="Cipher", value=8, image_url=f"{CARD_BASE_URL}/Cipher_8pt_Sandy.jpg"),
    Card(name="Tala", type="Cipher", value=8, image_url=f"{CARD_BASE_URL}/Cipher_8pt_Tala.jpg"),
    Card(name="Tulip", type="Cipher", value=8, image_url=f"{CARD_BASE_URL}/Cipher_8pt_Tulip.jpg"),
    Card(name="Zacky", type="Cipher", value=8, image_url=f"{CARD_BASE_URL}/Cipher_8pt_Zacky.jpg"),
]

ORACLE_CARDS = [
    Card(name="Aida 1", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Aida_1.jpg"),
    Card(name="Aida 2", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Aida_2.jpg"),
    Card(name="Aida 3", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Aida_3.jpg"),
    Card(name="Lana 1", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Lana_1.jpg"),
    Card(name="Lana 2", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Lana_2.jpg"),
    Card(name="Lana 3", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Lana_3.jpg"),
    Card(name="Nifty 1", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Nifty_1.jpg"),
    Card(name="Nifty 2", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Nifty_2.jpg"),
    Card(name="Nifty 3", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Nifty_3.jpg"),
    Card(name="Sats 1", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Sats_1.jpg"),
    Card(name="Sats 2", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Sats_2.jpg"),
    Card(name="Sats 3", type="Oracle", value=13, image_url=f"{CARD_BASE_URL}/Oracle_Sats_3.jpg"),
]

HISTORACLE_CARDS = [
    Card(name="Sats", type="Historacle", value=21, image_url=f"{CARD_BASE_URL}/Historacle_1_Sats.jpg"),
    Card(name="Fibonacci", type="Historacle", value=21, image_url=f"{CARD_BASE_URL}/Historacle_2_Fibonacci.jpg"),
    Card(name="Gann", type="Historacle", value=21, image_url=f"{CARD_BASE_URL}/Historacle_3_Gann.jpg"),
    Card(name="Dow", type="Historacle", value=21, image_url=f"{CARD_BASE_URL}/Historacle_4_Dow.jpg"),
    Card(name="Elliott", type="Historacle", value=21, image_url=f"{CARD_BASE_URL}/Historacle_5_Elliott.jpg"),
]

BEARISH_CARDS = [
    Card(name="Bear Reset", type="Bearish", value=0, image_url=f"{CARD_BASE_URL}/Bear_Reset.jpg", penalty="Reset"),
    Card(name="Bear Half", type="Bearish", value=0, image_url=f"{CARD_BASE_URL}/Bear_Half.jpg", penalty="Half"),
    Card(name="Bear -10", type="Bearish", value=0, image_url=f"{CARD_BASE_URL}/Bear_Minus_10.jpg", penalty="Minus10"),
]

SPECIAL_CARDS = [
    Card(name="Ape In!", type="Special", value=0, image_url=f"{CARD_BASE_URL}/Ape_In.jpg"),
    Card(name="Ape In!", type="Special", value=0, image_url=f"{CARD_BASE_URL}/Ape_In_MAYC.jpg"),
]

# Card weights for drawing
CARD_WEIGHTS = {
    "Cipher_1pt": 6,
    "Cipher_2pt": 8,
    "Cipher_3pt": 9,
    "Cipher_5pt": 15,
    "Cipher_8pt": 15,
    "Oracle": 10,
    "Historacle": 4,
    "Bearish": 2,
    "Special": 15,  # Normal Ape In! draw chance
}


def draw_weighted_card(used_bearish_flags: List[str] = None, exclude_ape_in: bool = False, game_mode: str = "sandy") -> Card:
    """Draw a weighted card from the deck"""
    if used_bearish_flags is None:
        used_bearish_flags = []
    
    # Filter available bearish cards
    available_bearish = [c for c in BEARISH_CARDS if c.penalty not in used_bearish_flags]
    
    # Build card pool
    all_cards = []
    weights = []
    
    # Add cipher cards with weights
    for card in CIPHER_CARDS:
        if card.value == 1:
            weight = CARD_WEIGHTS["Cipher_1pt"]
        elif card.value == 2:
            weight = CARD_WEIGHTS["Cipher_2pt"]
        elif card.value == 3:
            weight = CARD_WEIGHTS["Cipher_3pt"]
        elif card.value == 5:
            weight = CARD_WEIGHTS["Cipher_5pt"]
        elif card.value == 8:
            weight = CARD_WEIGHTS["Cipher_8pt"]
        else:
            weight = 1
        all_cards.append(card)
        weights.append(weight)
    
    # Add oracle cards
    for card in ORACLE_CARDS:
        all_cards.append(card)
        weights.append(CARD_WEIGHTS["Oracle"])
    
    # Add historacle cards
    for card in HISTORACLE_CARDS:
        all_cards.append(card)
        weights.append(CARD_WEIGHTS["Historacle"])
    
    # Add available bearish cards with different weights for harder games
    bearish_weight = 4 if game_mode in ["aida", "lana", "enj1n", "nifty"] else CARD_WEIGHTS["Bearish"]
    
    # Create bearish card pool based on game mode
    bearish_cards_to_add = []
    
    # Add Bear -10 cards (4 copies for harder games, 1 for Sandy)
    bear_minus10_count = 4 if game_mode in ["aida", "lana", "enj1n", "nifty"] else 1
    for _ in range(bear_minus10_count):
        bear_minus10_card = next((c for c in BEARISH_CARDS if c.penalty == "Minus10"), None)
        if bear_minus10_card and bear_minus10_card.penalty not in used_bearish_flags:
            bearish_cards_to_add.append(bear_minus10_card)
    
    # Add Bear Half cards (3 copies for En-J1n and Nifty, 1 for others)
    bear_half_count = 3 if game_mode in ["enj1n", "nifty"] else 1
    for _ in range(bear_half_count):
        bear_half_card = next((c for c in BEARISH_CARDS if c.penalty == "Half"), None)
        if bear_half_card and bear_half_card.penalty not in used_bearish_flags:
            bearish_cards_to_add.append(bear_half_card)
    
    # Add Bear Reset card (1 copy for all games except Aida)
    if game_mode != "aida":
        bear_reset_card = next((c for c in BEARISH_CARDS if c.penalty == "Reset"), None)
        if bear_reset_card and bear_reset_card.penalty not in used_bearish_flags:
            bearish_cards_to_add.append(bear_reset_card)
    
    # Add all bearish cards to the draw pool
    for card in bearish_cards_to_add:
        all_cards.append(card)
        weights.append(bearish_weight)
    
    # Add special cards (unless excluded)
    if not exclude_ape_in:
        for card in SPECIAL_CARDS:
            all_cards.append(card)
            weights.append(CARD_WEIGHTS["Special"])
    
    # Draw a card
    return random.choices(all_cards, weights=weights, k=1)[0]


def apply_ape_in_effect(card: Card) -> Card:
    """Double the card value (Ape In! effect)"""
    if card.type in ["Cipher", "Oracle", "Historacle"]:
        return Card(
            name=card.name,
            type=card.type,
            value=card.value * 2,
            image_url=card.image_url,
            penalty=card.penalty
        )
    return card

