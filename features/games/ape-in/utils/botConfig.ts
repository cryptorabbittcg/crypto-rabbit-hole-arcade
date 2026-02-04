import { GameMode } from '../types/game'

export interface RiskConfig {
  basePush?: number
  behindPush?: number
  behindGap?: number
  midMin?: number
  midMax?: number
  midPush?: number
  highStack?: number
  stackAt?: number
  stackBias?: number
  // Human-feel v1 lead protection gates (optional)
  leadProtectMinPlayerScore?: number
  leadProtectMinTurnScore?: number
  leadProtectChanceEarly?: number   // 0..1 soft-bank chance early
  leadProtectEnabled?: boolean      // if false, disables lead-protect entirely
}

export interface JitterConfig {
  enabled: boolean
  pct: number
}

export interface BotConfig {
  name: string
  difficulty: string
  winningScore: number
  maxRounds: number
  description: string
  personality: string
  price: number
  hasDailyFree: boolean
  // AI-specific configuration (only for single-player bot modes)
  targetScores?: number[]
  risk?: RiskConfig
  jitter?: JitterConfig
  diceModes?: string[]
  noRoundLimit?: boolean
}

export const BOT_CONFIGS: Record<GameMode, BotConfig> = {
  sandy: {
    name: 'Sandy',
    difficulty: 'Tutorial',
    winningScore: 150,
    maxRounds: 10,
    description: 'Learn the ropes with Sandy. Perfect for beginners!',
    personality: 'Friendly and encouraging',
    price: 0,
    hasDailyFree: false,
    targetScores: [21],
    risk: { basePush: 0.10, behindPush: 0.20, behindGap: 50 },
    jitter: { enabled: false, pct: 0.0 },
    diceModes: ['sandy']
  },
  aida: {
    name: 'Aida',
    difficulty: 'Medium',
    winningScore: 300,
    maxRounds: 20,
    description: 'Strategic and efficient. A balanced challenge.',
    personality: 'Strategic and analytical',
    price: 0.10,
    hasDailyFree: true,
    targetScores: [21, 26, 40],
    risk: {
      midMin: 21,
      midMax: 39,
      midPush: 0.50,
      highStack: 40,
      behindGap: 30,
      behindPush: 0.60,
      leadProtectMinPlayerScore: 21,
      leadProtectMinTurnScore: 8,
      leadProtectChanceEarly: 0.00,
    },
    jitter: { enabled: true, pct: 0.10 },
    diceModes: ['aida', 'aida_aggressive']
  },
  lana: {
    name: 'Lana',
    difficulty: 'Hard',
    winningScore: 200,
    maxRounds: 15,
    description: 'High-risk, high-reward gameplay. Can you keep up?',
    personality: 'Bold and daring',
    price: 0.10,
    hasDailyFree: false,
    targetScores: [30],
    risk: {
      stackAt: 30,
      stackBias: 0.70,
      leadProtectMinPlayerScore: 21,
      leadProtectMinTurnScore: 8,
      leadProtectChanceEarly: 0.00,
    },
    jitter: { enabled: true, pct: 0.10 },
    diceModes: ['lana', 'lana_aggressive']
  },
  enj1n: {
    name: 'En-J1n',
    difficulty: 'Expert',
    winningScore: 300,
    maxRounds: 15,
    description: 'Relentless and aggressive. Only for the brave!',
    personality: 'Calculated chaos',
    price: 0.10,
    hasDailyFree: true,
    targetScores: [34, 42, 55],
    risk: {
      behindGap: 20,
      stackAt: 50,
      basePush: 0.75,
      leadProtectMinPlayerScore: 34,
      leadProtectMinTurnScore: 21,
      leadProtectChanceEarly: 0.00,
    },
    jitter: { enabled: true, pct: 0.10 },
    diceModes: ['enj1n', 'enj1n_aggressive'],
    noRoundLimit: true
  },
  nifty: {
    name: 'Nifty',
    difficulty: 'Medium-Hard',
    winningScore: 150,
    maxRounds: 10,
    description: 'Unpredictable and creative strategies await.',
    personality: 'Clever and unpredictable',
    price: 0.10,
    hasDailyFree: false,
    targetScores: [50],
    risk: {
      stackAt: 50,
      behindGap: 20,
      leadProtectMinPlayerScore: 34,
      leadProtectMinTurnScore: 13,
      leadProtectChanceEarly: 0.10,
    },
    jitter: { enabled: true, pct: 0.10 },
    diceModes: ['nifty', 'nifty_aggressive'],
    noRoundLimit: true
  },
  pvp: {
    name: 'PvP',
    difficulty: 'Variable',
    // PvP gameplay parity with Sandy: first to 150 wins; unlimited rounds (tracked for stats/UI)
    winningScore: 150,
    maxRounds: 10,
    description: 'Face off against another player in real-time!',
    personality: 'Competitive',
    price: 0.10,
    hasDailyFree: false,
    noRoundLimit: true
  },
  multiplayer: {
    name: 'Multiplayer',
    difficulty: 'Variable',
    winningScore: 250,
    maxRounds: 15,
    description: '3-10 players compete for the top spot!',
    personality: 'Social',
    price: 0.10,
    hasDailyFree: false
  },
  tournament: {
    name: 'Tournament',
    difficulty: 'Elite',
    winningScore: 300,
    maxRounds: 20,
    description: 'Compete in brackets for ultimate glory!',
    personality: 'Champion',
    price: 0.10,
    hasDailyFree: false
  }
}
