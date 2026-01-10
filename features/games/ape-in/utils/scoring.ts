/**
 * Points Calculation Service
 * Calculates points based on game mode and rounds remaining (bonus system)
 */

import { GameMode } from '../types/game'

export interface PointsCalculationParams {
  gameMode: GameMode
  roundsRemaining: number // Rounds left when game completed
  maxRounds: number // Maximum rounds for the game
  hasForfeited: boolean // If player forfeited, return 0
}

/**
 * Calculate points based on game mode and rounds remaining
 * Fewer rounds = more points (bonus system)
 * Sandy: 0 points (tutorial)
 * Forfeits: 0 points
 * 
 * Base points by mode:
 * - Aida: 500 base
 * - Lana: 1000 base
 * - En-J1n: 2000 base
 * - Nifty: 750 base
 * 
 * Bonus formula: base * (1 + (roundsRemaining / maxRounds) * bonusMultiplier)
 * This means completing in fewer rounds gives more points
 */
export function calculatePoints(params: PointsCalculationParams): number {
  const { gameMode, roundsRemaining, maxRounds, hasForfeited } = params

  // Sandy (tutorial) gives 0 points
  if (gameMode === 'sandy') {
    return 0
  }

  // Forfeits give 0 points
  if (hasForfeited) {
    return 0
  }

  // Base points by mode
  const basePoints: Record<GameMode, number> = {
    sandy: 0,
    aida: 500,
    lana: 1000,
    enj1n: 2000,
    nifty: 750,
    pvp: 1000, // Default for PvP
    multiplayer: 1500, // Default for multiplayer
    tournament: 2000, // Default for tournament
  }

  const base = basePoints[gameMode] || 500

  // Bonus multiplier based on rounds remaining
  // More rounds remaining = higher bonus
  // Formula: base * (1 + (roundsRemaining / maxRounds) * 1.5)
  // This gives up to 2.5x the base points if completed in round 1
  const bonusMultiplier = 1.5
  const roundsBonus = (roundsRemaining / maxRounds) * bonusMultiplier
  const points = base * (1 + roundsBonus)

  // Cap at reasonable maximum (3x base for very fast completions)
  const maxPoints = base * 3

  return Math.round(Math.min(points, maxPoints))
}

// Note: Points are now handled via onGameEnd callback in GameBoard component
// This integrates with the arcade hub context instead of using postMessage
