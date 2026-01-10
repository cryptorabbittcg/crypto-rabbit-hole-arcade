/**
 * Result types for game submission to Arcade Hub
 */

import { GameMode } from './game'

export type GameResult = 'WIN' | 'DRAW' | 'LOSS' | 'FORFEIT'

export type GameSubtype = 'single_player' | 'pvp' | 'multiplayer'

export interface ResultSubmissionPayload {
  playerAddress: string
  modeId: GameMode
  isRanked: boolean
  result: GameResult
  runId: string
  playToken?: string // Required for ranked modes
  game_type: 'ape_in' // Always 'ape_in' for this game
  game_mode: 'sandy' | 'aida' | 'lana' | 'en-j1n' | 'nifty' // Mode identifier
  game_subtype: GameSubtype // single_player, pvp, or multiplayer
  meta?: {
    durationMs?: number
    rawScore?: number
    opponent?: string // Bot id (aida/lana/nifty/enj1n/sandy) or 'pvp'/'multiplayer'
    clientVersion?: string
    errors?: number // Number of errors made
    timeSeconds?: number // Game duration in seconds
  }
}

export interface ResultSubmissionResponse {
  success: boolean
  error?: string
  message?: string
}
