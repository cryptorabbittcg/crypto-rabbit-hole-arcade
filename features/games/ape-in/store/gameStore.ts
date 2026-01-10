import { create } from 'zustand'
import { GameState, Card, GameMode } from '../types/game'

interface GameStore extends GameState {
  // Play token fields for ranked games
  playToken?: string | null
  runId?: string | null
  
  // Actions
  setGameState: (state: Partial<GameState>) => void
  setPlayToken: (token: string | null) => void
  setRunId: (id: string | null) => void
  updateScore: (playerScore: number, opponentScore?: number) => void
  setCurrentCard: (card: Card | null) => void
  setLastRoll: (roll: number) => void
  incrementRound: () => void
  resetGame: () => void
  endGame: (winner: string) => void
  toggleTurn: () => void
  activateApeIn: () => void
  deactivateApeIn: () => void
}

const initialState: GameState = {
  gameId: '',
  mode: 'sandy',
  playerScore: 0,
  opponentScore: 0,
  playerTurnScore: 0,
  opponentTurnScore: 0,
  currentCard: null,
  lastRoll: null,
  roundCount: 0,
  maxRounds: 10,
  unlimitedRounds: false,
  winningScore: 150,
  isPlayerTurn: true,
  gameStatus: 'waiting',
  winner: null,
  apeInActive: false,
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  playToken: null,
  runId: null,

  setGameState: (state) => set((prev) => ({ ...prev, ...state })),

  setPlayToken: (token) => set({ playToken: token }),

  setRunId: (id) => set({ runId: id }),

  updateScore: (playerScore, opponentScore) =>
    set((state) => ({
      playerScore,
      opponentScore: opponentScore ?? state.opponentScore,
    })),

  setCurrentCard: (card) => set({ currentCard: card }),

  setLastRoll: (roll) => set({ lastRoll: roll }),

  incrementRound: () => set((state) => ({ roundCount: state.roundCount + 1 })),

  resetGame: () => set({ ...initialState, playToken: null, runId: null }),

  endGame: (winner) =>
    set({
      gameStatus: 'finished',
      winner,
      isPlayerTurn: false,
    }),

  toggleTurn: () => set((state) => ({ isPlayerTurn: !state.isPlayerTurn })),

  activateApeIn: () => set({ apeInActive: true }),

  deactivateApeIn: () => set({ apeInActive: false }),
}))


