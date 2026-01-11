/**
 * Dice profiles for different AI opponents and player
 * Each profile maps dice faces (1-6) to their weights
 */
export const DICE_PROFILES: Record<string, Record<number, number>> = {
  // Player advantage: ~30% chance of rolling 1 (0.7 weight vs 1.0 for others)
  "balanced": { 1: 0.7, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0 },
  
  // Tutorial mode: Same as player (friendly)
  "sandy": { 1: 0.7, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0 },
  
  // Fair dice: equal weighting for all bots
  "aida": { 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0 },
  "lana": { 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0 },
  "enj1n": { 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0 },
  "nifty": { 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0 },
  
  // Aggressive variants: slightly biased toward higher outcomes
  "aida_aggressive": { 1: 0.85, 2: 1.0, 3: 1.1, 4: 1.2, 5: 1.3, 6: 1.4 },
  "lana_aggressive": { 1: 1.0, 2: 0.9, 3: 1.0, 4: 1.2, 5: 1.6, 6: 1.8 },
  "enj1n_aggressive": { 1: 0.7, 2: 1.0, 3: 1.2, 4: 1.4, 5: 1.6, 6: 1.7 },
  "nifty_aggressive": { 1: 1.0, 2: 1.0, 3: 1.1, 4: 1.2, 5: 1.3, 6: 1.4 },
}

/**
 * Weighted random selection helper for dice
 */
function weightedRandomChoice(choices: number[], weights: number[]): number {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight
  
  for (let i = 0; i < choices.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return choices[i]
    }
  }
  
  // Fallback (shouldn't happen)
  return choices[choices.length - 1]
}

/**
 * Roll a die using the specified profile's weights
 * @param profile - Dice profile name (default: "balanced")
 * @returns Dice roll value (1-6)
 */
export function rollDice(profile: string = "balanced"): number {
  const weights = DICE_PROFILES[profile] || DICE_PROFILES["balanced"]
  
  // Ensure choices are sorted (1, 2, 3, 4, 5, 6) to match weights array order
  const choices = Object.keys(weights).map(Number).sort((a, b) => a - b)
  const weightValues = choices.map(choice => weights[choice])
  
  const result = weightedRandomChoice(choices, weightValues)
  
  // Log for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎲 Rolled ${result} using profile "${profile}" (weights: 1=${weights[1]}, 2=${weights[2]}, 3=${weights[3]}, 4=${weights[4]}, 5=${weights[5]}, 6=${weights[6]})`)
  }
  
  return result
}

/**
 * Check if the roll is a bust (rolled a 1)
 * @param roll - The dice roll value
 * @returns True if busted (rolled 1)
 */
export function checkBust(roll: number): boolean {
  return roll === 1
}

/**
 * Check if the player dodged a bearish card (rolled even)
 * @param roll - The dice roll value
 * @returns True if dodged (rolled even number: 2, 4, or 6)
 */
export function checkDodgeBearish(roll: number): boolean {
  return roll % 2 === 0
}

