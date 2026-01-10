import random
from typing import Dict


# Dice profiles for different AI opponents
DICE_PROFILES: Dict[str, Dict[int, float]] = {
    "balanced": {1: 0.7, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0},  # Player advantage: ~12% chance of 1
    "sandy": {1: 0.7, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0},  # Tutorial mode: Same as player
    "aida": {1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0},  # Fair dice: equal weighting
    "lana": {1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0},  # Fair dice: equal weighting
    "enj1n": {1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0},  # Fair dice: equal weighting
    "nifty": {1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0},  # Fair dice: equal weighting
    # Aggressive variants (slightly bias toward higher outcomes, small bust increase where appropriate)
    "aida_aggressive": {1: 0.85, 2: 1.0, 3: 1.1, 4: 1.2, 5: 1.3, 6: 1.4},
    "lana_aggressive": {1: 1.0, 2: 0.9, 3: 1.0, 4: 1.2, 5: 1.6, 6: 1.8},
    "enj1n_aggressive": {1: 0.7, 2: 1.0, 3: 1.2, 4: 1.4, 5: 1.6, 6: 1.7},
    "nifty_aggressive": {1: 1.0, 2: 1.0, 3: 1.1, 4: 1.2, 5: 1.3, 6: 1.4},
}


def roll_dice(profile: str = "balanced") -> int:
    """Roll a die using the specified profile's weights"""
    weights = DICE_PROFILES.get(profile, DICE_PROFILES["balanced"])
    
    # Create choices and weights lists
    choices = list(weights.keys())
    weight_values = list(weights.values())
    
    return random.choices(choices, weights=weight_values, k=1)[0]


def check_bust(roll: int) -> bool:
    """Check if the roll is a bust (rolled a 1)"""
    return roll == 1


def check_dodge_bearish(roll: int) -> bool:
    """Check if the player dodged a bearish card (rolled even)"""
    return roll % 2 == 0

