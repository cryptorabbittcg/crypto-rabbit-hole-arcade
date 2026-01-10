import { Card, GameMode } from '@/features/games/ape-in/types/game'

// Base URL for card images - Next.js public directory
const CARD_BASE_URL = '/features/games/ape-in/assets/images/cards'

// Define all cards with CORRECT values (Oracle=13, Historacle=21)
const CIPHER_CARDS: Card[] = [
  { name: "Abbie", type: "Cipher", value: 1, image_url: `${CARD_BASE_URL}/Cipher_1pt_Abbie.jpg` },
  { name: "Alita", type: "Cipher", value: 1, image_url: `${CARD_BASE_URL}/Cipher_1pt_Alita.jpg` },
  { name: "EnJ1n", type: "Cipher", value: 1, image_url: `${CARD_BASE_URL}/Cipher_1pt_EnJ1n.jpg` },
  { name: "Jakey", type: "Cipher", value: 1, image_url: `${CARD_BASE_URL}/Cipher_1pt_Jakey.jpg` },
  { name: "Ace", type: "Cipher", value: 2, image_url: `${CARD_BASE_URL}/Cipher_2pt_Ace.jpg` },
  { name: "Beats", type: "Cipher", value: 2, image_url: `${CARD_BASE_URL}/Cipher_2pt_Beats.jpg` },
  { name: "Dash", type: "Cipher", value: 2, image_url: `${CARD_BASE_URL}/Cipher_2pt_Dash.jpg` },
  { name: "Ray", type: "Cipher", value: 2, image_url: `${CARD_BASE_URL}/Cipher_2pt_Ray.jpg` },
  { name: "Jazzy", type: "Cipher", value: 3, image_url: `${CARD_BASE_URL}/Cipher_3pt_Jazzy.jpg` },
  { name: "Meemo", type: "Cipher", value: 3, image_url: `${CARD_BASE_URL}/Cipher_3pt_Meemo.jpg` },
  { name: "Sabrina", type: "Cipher", value: 3, image_url: `${CARD_BASE_URL}/Cipher_3pt_Sabrina.jpg` },
  { name: "Thea", type: "Cipher", value: 3, image_url: `${CARD_BASE_URL}/Cipher_3pt_Thea.jpg` },
  { name: "Nero", type: "Cipher", value: 5, image_url: `${CARD_BASE_URL}/Cipher_5pt_Nero.jpg` },
  { name: "Saul", type: "Cipher", value: 5, image_url: `${CARD_BASE_URL}/Cipher_5pt_Saul.jpg` },
  { name: "Somi", type: "Cipher", value: 5, image_url: `${CARD_BASE_URL}/Cipher_5pt_Somi.jpg` },
  { name: "Wick", type: "Cipher", value: 5, image_url: `${CARD_BASE_URL}/Cipher_5pt_Wick.jpg` },
  { name: "Sandy", type: "Cipher", value: 8, image_url: `${CARD_BASE_URL}/Cipher_8pt_Sandy.jpg` },
  { name: "Tala", type: "Cipher", value: 8, image_url: `${CARD_BASE_URL}/Cipher_8pt_Tala.jpg` },
  { name: "Tulip", type: "Cipher", value: 8, image_url: `${CARD_BASE_URL}/Cipher_8pt_Tulip.jpg` },
  { name: "Zacky", type: "Cipher", value: 8, image_url: `${CARD_BASE_URL}/Cipher_8pt_Zacky.jpg` },
]

// Oracle cards: ALL have value = 13 (CRITICAL!)
const ORACLE_CARDS: Card[] = [
  { name: "Aida 1", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Aida_1.jpg` },
  { name: "Aida 2", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Aida_2.jpg` },
  { name: "Aida 3", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Aida_3.jpg` },
  { name: "Lana 1", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Lana_1.jpg` },
  { name: "Lana 2", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Lana_2.jpg` },
  { name: "Lana 3", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Lana_3.jpg` },
  { name: "Nifty 1", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Nifty_1.jpg` },
  { name: "Nifty 2", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Nifty_2.jpg` },
  { name: "Nifty 3", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Nifty_3.jpg` },
  { name: "Sats 1", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Sats_1.jpg` },
  { name: "Sats 2", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Sats_2.jpg` },
  { name: "Sats 3", type: "Oracle", value: 13, image_url: `${CARD_BASE_URL}/Oracle_Sats_3.jpg` },
]

// Historacle cards: ALL have value = 21 (CRITICAL!)
const HISTORACLE_CARDS: Card[] = [
  { name: "Sats", type: "Historacle", value: 21, image_url: `${CARD_BASE_URL}/Historacle_1_Sats.jpg` },
  { name: "Fibonacci", type: "Historacle", value: 21, image_url: `${CARD_BASE_URL}/Historacle_2_Fibonacci.jpg` },
  { name: "Gann", type: "Historacle", value: 21, image_url: `${CARD_BASE_URL}/Historacle_3_Gann.jpg` },
  { name: "Dow", type: "Historacle", value: 21, image_url: `${CARD_BASE_URL}/Historacle_4_Dow.jpg` },
  { name: "Elliott", type: "Historacle", value: 21, image_url: `${CARD_BASE_URL}/Historacle_5_Elliott.jpg` },
]

const BEARISH_CARDS: Card[] = [
  { name: "Bear Reset", type: "Bearish", value: 0, image_url: `${CARD_BASE_URL}/Bear_Reset.jpg`, penalty: "Reset" },
  { name: "Bear Half", type: "Bearish", value: 0, image_url: `${CARD_BASE_URL}/Bear_Half.jpg`, penalty: "Half" },
  { name: "Bear -10", type: "Bearish", value: 0, image_url: `${CARD_BASE_URL}/Bear_Minus_10.jpg`, penalty: "Minus10" },
]

const SPECIAL_CARDS: Card[] = [
  { name: "Ape In!", type: "Special", value: 0, image_url: `${CARD_BASE_URL}/Ape_In.jpg` },
  { name: "Ape In!", type: "Special", value: 0, image_url: `${CARD_BASE_URL}/Ape_In_MAYC.jpg` },
]

// Card weights for weighted drawing
const CARD_WEIGHTS = {
  "Cipher_1pt": 6,
  "Cipher_2pt": 8,
  "Cipher_3pt": 9,
  "Cipher_5pt": 15,
  "Cipher_8pt": 15,
  "Oracle": 10,
  "Historacle": 4,
  "Bearish": 2,
  "Special": 15, // Normal Ape In! draw chance
} as const

/**
 * Weighted random selection helper (equivalent to Python's random.choices)
 */
function weightedRandomChoice<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return items[i]
    }
  }
  
  // Fallback (shouldn't happen)
  return items[items.length - 1]
}

/**
 * Draw a weighted card from the deck (no physical deck - weighted random)
 * @param usedBearishFlags - List of bearish penalties that have been used (prevents repeats)
 * @param excludeApeIn - If true, prevents consecutive Ape In! cards
 * @param gameMode - Game mode (affects bearish card distribution)
 * @returns A randomly drawn card based on weights
 */
export function drawWeightedCard(
  usedBearishFlags: string[] = [],
  excludeApeIn: boolean = false,
  gameMode: GameMode = "sandy"
): Card {
  // Filter available bearish cards
  const availableBearish = BEARISH_CARDS.filter(c => !usedBearishFlags.includes(c.penalty || ""))
  
  // Build card pool and weights
  const allCards: Card[] = []
  const weights: number[] = []
  
  // Add cipher cards with weights
  for (const card of CIPHER_CARDS) {
    let weight: number
    if (card.value === 1) {
      weight = CARD_WEIGHTS["Cipher_1pt"]
    } else if (card.value === 2) {
      weight = CARD_WEIGHTS["Cipher_2pt"]
    } else if (card.value === 3) {
      weight = CARD_WEIGHTS["Cipher_3pt"]
    } else if (card.value === 5) {
      weight = CARD_WEIGHTS["Cipher_5pt"]
    } else if (card.value === 8) {
      weight = CARD_WEIGHTS["Cipher_8pt"]
    } else {
      weight = 1
    }
    allCards.push(card)
    weights.push(weight)
  }
  
  // Add oracle cards
  for (const card of ORACLE_CARDS) {
    allCards.push(card)
    weights.push(CARD_WEIGHTS["Oracle"])
  }
  
  // Add historacle cards
  for (const card of HISTORACLE_CARDS) {
    allCards.push(card)
    weights.push(CARD_WEIGHTS["Historacle"])
  }
  
  // Add available bearish cards with different weights for harder games
  const bearishWeight = ["aida", "lana", "enj1n", "nifty"].includes(gameMode) ? 4 : CARD_WEIGHTS["Bearish"]
  
  // Create bearish card pool based on game mode
  const bearishCardsToAdd: Card[] = []
  
  // Add Bear -10 cards (4 copies for harder games, 1 for Sandy)
  const bearMinus10Count = ["aida", "lana", "enj1n", "nifty"].includes(gameMode) ? 4 : 1
  const bearMinus10Card = BEARISH_CARDS.find(c => c.penalty === "Minus10")
  if (bearMinus10Card && !usedBearishFlags.includes("Minus10")) {
    for (let i = 0; i < bearMinus10Count; i++) {
      bearishCardsToAdd.push(bearMinus10Card)
    }
  }
  
  // Add Bear Half cards (3 copies for En-J1n and Nifty, 1 for others)
  const bearHalfCount = ["enj1n", "nifty"].includes(gameMode) ? 3 : 1
  const bearHalfCard = BEARISH_CARDS.find(c => c.penalty === "Half")
  if (bearHalfCard && !usedBearishFlags.includes("Half")) {
    for (let i = 0; i < bearHalfCount; i++) {
      bearishCardsToAdd.push(bearHalfCard)
    }
  }
  
  // Add Bear Reset card (1 copy for all games except Aida)
  if (gameMode !== "aida") {
    const bearResetCard = BEARISH_CARDS.find(c => c.penalty === "Reset")
    if (bearResetCard && !usedBearishFlags.includes("Reset")) {
      bearishCardsToAdd.push(bearResetCard)
    }
  }
  
  // Add all bearish cards to the draw pool
  for (const card of bearishCardsToAdd) {
    allCards.push(card)
    weights.push(bearishWeight)
  }
  
  // Add special cards (unless excluded)
  if (!excludeApeIn) {
    for (const card of SPECIAL_CARDS) {
      allCards.push(card)
      weights.push(CARD_WEIGHTS["Special"])
    }
  }
  
  // Draw a card using weighted random
  return weightedRandomChoice(allCards, weights)
}

/**
 * Apply Ape In! effect - doubles the card value
 * @param card - The card to apply the effect to
 * @returns A new card with doubled value (if applicable)
 */
export function applyApeInEffect(card: Card): Card {
  if (["Cipher", "Oracle", "Historacle"].includes(card.type)) {
    return {
      ...card,
      value: card.value * 2
    }
  }
  return card
}

