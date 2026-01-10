/**
 * Central Game Mode Configuration
 * Defines ranked/unranked status, difficulty weights, and display names
 */

import { GameMode } from '../types/game'

export interface GameModeConfig {
  modeId: GameMode
  displayName: string
  isRanked: boolean
  difficultyWeight?: number // Only for ranked bots
}

/**
 * Mode configuration for all game modes
 * SANDY is UNRANKED (tutorial), all others are RANKED
 */
export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  sandy: {
    modeId: 'sandy',
    displayName: 'Sandy',
    isRanked: false, // UNRANKED - Tutorial mode
    // No difficultyWeight for unranked
  },
  aida: {
    modeId: 'aida',
    displayName: 'Aida',
    isRanked: true, // RANKED
    difficultyWeight: 100,
  },
  lana: {
    modeId: 'lana',
    displayName: 'Lana',
    isRanked: true, // RANKED
    difficultyWeight: 100,
  },
  nifty: {
    modeId: 'nifty',
    displayName: 'Nifty',
    isRanked: true, // RANKED
    difficultyWeight: 125,
  },
  enj1n: {
    modeId: 'enj1n',
    displayName: 'En-J1n',
    isRanked: true, // RANKED
    difficultyWeight: 150,
  },
  pvp: {
    modeId: 'pvp',
    displayName: 'PvP',
    isRanked: true, // RANKED - Player vs Player
    // No difficultyWeight for PvP (player skill based)
  },
  multiplayer: {
    modeId: 'multiplayer',
    displayName: 'Multiplayer',
    isRanked: true, // RANKED
    // No difficultyWeight for multiplayer (variable)
  },
  tournament: {
    modeId: 'tournament',
    displayName: 'Tournament',
    isRanked: true, // RANKED
    // No difficultyWeight for tournament (bracket-based)
  },
}

/**
 * Get mode configuration
 */
export function getModeConfig(modeId: GameMode): GameModeConfig {
  return GAME_MODE_CONFIGS[modeId]
}

/**
 * Check if a mode is ranked
 */
export function isRankedMode(modeId: GameMode): boolean {
  return GAME_MODE_CONFIGS[modeId]?.isRanked ?? false
}

/**
 * Get difficulty weight for a ranked bot mode
 * Returns undefined for unranked or non-bot modes
 */
export function getDifficultyWeight(modeId: GameMode): number | undefined {
  return GAME_MODE_CONFIGS[modeId]?.difficultyWeight
}

/**
 * Get all ranked modes
 */
export function getRankedModes(): GameMode[] {
  return Object.entries(GAME_MODE_CONFIGS)
    .filter(([_, config]) => config.isRanked)
    .map(([modeId, _]) => modeId as GameMode)
}

/**
 * Get all unranked modes
 */
export function getUnrankedModes(): GameMode[] {
  return Object.entries(GAME_MODE_CONFIGS)
    .filter(([_, config]) => !config.isRanked)
    .map(([modeId, _]) => modeId as GameMode)
}

