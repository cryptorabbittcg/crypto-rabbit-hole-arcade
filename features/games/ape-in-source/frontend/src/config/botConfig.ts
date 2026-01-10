import { GameMode } from '../types/game'

export interface BotConfig {
  name: string
  difficulty: string
  winningScore: number
  maxRounds: number
  description: string
  personality: string
  price: number
  hasDailyFree: boolean
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
    hasDailyFree: false
  },
  aida: {
    name: 'Aida',
    difficulty: 'Medium',
    winningScore: 300,
    maxRounds: 20,
    description: 'Strategic and efficient. A balanced challenge.',
    personality: 'Strategic and analytical',
    price: 0.10,
    hasDailyFree: true
  },
  lana: {
    name: 'Lana',
    difficulty: 'Hard',
    winningScore: 200,
    maxRounds: 15,
    description: 'High-risk, high-reward gameplay. Can you keep up?',
    personality: 'Bold and daring',
    price: 0.10,
    hasDailyFree: false
  },
  enj1n: {
    name: 'En-J1n',
    difficulty: 'Expert',
    winningScore: 300,
    maxRounds: 15,
    description: 'Relentless and aggressive. Only for the brave!',
    personality: 'Calculated chaos',
    price: 0.10,
    hasDailyFree: true
  },
  nifty: {
    name: 'Nifty',
    difficulty: 'Medium-Hard',
    winningScore: 150,
    maxRounds: 10,
    description: 'Unpredictable and creative strategies await.',
    personality: 'Clever and unpredictable',
    price: 0.10,
    hasDailyFree: false
  },
  pvp: {
    name: 'PvP',
    difficulty: 'Variable',
    winningScore: 200,
    maxRounds: 12,
    description: 'Face off against another player in real-time!',
    personality: 'Competitive',
    price: 0.10,
    hasDailyFree: false
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
