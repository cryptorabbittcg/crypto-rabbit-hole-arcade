export type Profile = {
  id: string
  wallet_address: string | null
  username: string
  avatar_url: string | null
  ape_balance: number
  ticket_balance: number
  total_games_played: number
  total_wins: number
  total_losses: number
  win_streak: number
  highest_win_streak: number
  total_points: number
  level: number
  experience: number
  referral_code?: string | null
  referral_count?: number
  referral_earnings?: number
  created_at: string
  updated_at: string
}

export type CardInventory = {
  id: string
  user_id: string
  card_id: number
  card_name: string
  card_image: string
  rarity: "common" | "rare" | "epic" | "legendary"
  attack: number
  defense: number
  is_staked: boolean
  stake_start_date: string | null
  acquired_at: string
}

export type UpgradeInventory = {
  id: string
  user_id: string
  upgrade_type:
    | "attack_booster"
    | "defense_shield"
    | "health_badge"
    | "market_disruptor"
    | "golden_border"
    | "kill_shot"
  quantity: number
  acquired_at: string
}

export type GameSession = {
  id: string
  user_id: string
  game_type: "card_battle" | "ape_in" | "cryptoku" | "social_raid"
  score: number
  points_earned: number
  ape_earned: number
  tickets_earned: number
  duration_seconds: number
  result: "win" | "loss" | "draw" | "incomplete"
  metadata: Record<string, any>
  created_at: string
}

export type PvPMatch = {
  id: string
  player1_id: string
  player2_id: string
  player1_card_id: string
  player2_card_id: string
  winner_id: string | null
  match_status: "waiting" | "in_progress" | "completed" | "abandoned"
  player1_health: number
  player2_health: number
  turn_count: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type LeaderboardEntry = {
  id: string
  user_id: string
  game_type: string
  score: number
  rank: number
  season: string
  updated_at: string
}

export type Transaction = {
  id: string
  user_id: string
  transaction_type: "purchase" | "reward" | "stake" | "unstake" | "transfer"
  amount: number
  currency: "ape" | "tickets" | "points"
  description: string
  metadata: Record<string, any>
  created_at: string
}
