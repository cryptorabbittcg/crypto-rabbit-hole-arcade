# 🎯 Points & Tickets System - Complete Guide

## Overview

The Crypto Rabbit Hole Arcade uses two main reward currencies:
1. **Points** (displayed in cyan) - Competitive leaderboard currency
2. **Golden Tickets** 🎫 (displayed in amber/gold) - Upgrade and purchase currency

---

## 🟦 POINTS

### What Are Points?
Points are your **competitive score** used to rank on the global leaderboard. They represent your skill and performance across all arcade games.

### How Are Points Accumulated?

#### 1. **Cryptoku Game (Ranked Modes)**
- **Degen Mode**: Starting points = 5,000
  - Base score calculated, then penalties/bonuses applied
  - Minimum floor: 200 points (even with heavy penalties)
  
- **Ape Mode**: Starting points = 8,000
  - Base score calculated, then penalties/bonuses applied
  - Minimum floor: 200 points (even with heavy penalties)

- **Noob Mode**: 0 points (unranked practice mode)

**Scoring Formula:**
```
Base Score = Starting Points - (Time in seconds × 2)
Final Score = Base Score - Hint Penalties - Error Penalties + Bonuses
Minimum Floor: 200 points

Penalties:
- Hints: -150 points each
- Errors: -50 points each

Bonuses:
- Clean Run (no hints, no errors): +200 points
- Streak Bonus (clean runs only): +50 points per streak game (capped at 500)
```

#### 2. **Referral Rewards**
- Earn **150 points** for each friend who joins using your referral code

#### 3. **Other Games** (Future Integration)
- Points can be earned from other games as they integrate with the leaderboard system

### How Are Points Logged/Stored?

1. **Local State**: Points are immediately added to your local profile state
2. **Supabase Database**: Points are synced to Supabase in the `profiles` table (`points` field)
3. **Leaderboard**: Points are automatically added to your `total_points` in the `leaderboard` table
4. **Transactions**: All point changes are logged in the `transactions` table for audit trail
5. **Persistent Storage**: Points are saved to localStorage keyed by your wallet address

### What Are Points Used For?

1. **Leaderboard Rankings** ⭐
   - Your total points determine your rank on the global leaderboard
   - Points from all games are aggregated into `total_points`
   - Higher points = Higher rank

2. **On-Chain Leaderboard** (Planned)
   - Points will be logged on-chain for permanent, verifiable rankings
   - Thirdweb developer wallets will be used to log leaderboard data

3. **Competitive Standing**
   - Points represent your cumulative skill and performance
   - Track your progress across all arcade games

4. **Achievements & Milestones** (Future)
   - Points thresholds may unlock achievements
   - Special recognition for point milestones

---

## 🎫 GOLDEN TICKETS

### What Are Golden Tickets?
Golden Tickets are your **in-game currency** used for purchasing upgrades, items, and special features in the arcade.

### How Are Tickets Accumulated?

#### 1. **Game Wins**
- **Cryptoku**: Earn **1 ticket** for each completed game (win)
- **Other Games**: Tickets can be earned from wins in other integrated games

#### 2. **Referral Rewards**
- Earn **5 tickets** for each friend who joins using your referral code

#### 3. **Achievements & Rewards** (Future)
- Special achievements may reward tickets
- Seasonal events and promotions

### How Are Tickets Stored?

1. **Local State**: Tickets are immediately added to your local profile state
2. **Supabase Database**: Tickets are stored in the `profiles` table (`tickets` field, also called `ticket_balance`)
3. **Transactions**: All ticket changes are logged in the `transactions` table
4. **Persistent Storage**: Tickets are saved to localStorage keyed by your wallet address

### What Are Tickets Used For?

Based on the database schema and codebase structure, tickets are designed for:

1. **Purchasing Upgrades** 🛠️
   - The database has an `upgrades_inventory` table
   - The `purchase_upgrade` function handles upgrade purchases
   - Upgrades likely provide gameplay advantages, cosmetics, or features

2. **Special Features** (Future)
   - Unlock premium game modes
   - Purchase exclusive items
   - Access special events

3. **In-Game Purchases** (Future)
   - Tickets may be used to buy hints, power-ups, or other gameplay items

---

## 📊 Data Flow & Synchronization

### Points Flow:
```
Game Completion → addPoints() → Local State Update
                                ↓
                        Supabase Sync (async)
                                ↓
                    update_user_balance() function
                                ↓
        ┌───────────────────────┴───────────────────────┐
        ↓                                               ↓
  profiles.points                                leaderboard.total_points
        ↓                                               ↓
  localStorage (persisted)                      Displayed on leaderboard
```

### Tickets Flow:
```
Game Win/Referral → addTickets() → Local State Update
                                    ↓
                            Supabase Sync
                                    ↓
                        profiles.tickets
                                    ↓
                        localStorage (persisted)
```

---

## 🎮 Current Implementation Status

### ✅ Fully Implemented:
- Points calculation for Cryptoku (Degen & Ape modes)
- Points display in topbar and profile menu
- Points syncing to Supabase database
- Points logging to leaderboard (`total_points`)
- Ticket earning from Cryptoku wins
- Ticket earning from referrals
- Ticket display in topbar and profile menu
- Persistent storage via localStorage

### 🔄 In Progress / Planned:
- On-chain leaderboard logging (Thirdweb developer wallets)
- Ticket spending for upgrades (infrastructure exists, UI pending)
- Points from other games (Ape In, Card Battle, etc.)
- Achievement system integration
- Ticket-based purchases in games

---

## 💡 Key Differences

| Aspect | Points 🟦 | Tickets 🎫 |
|--------|-----------|------------|
| **Purpose** | Competitive ranking | In-game currency |
| **Display** | Cyan color, "Points" label | Gold/amber, ticket emoji |
| **Primary Use** | Leaderboard rankings | Purchases & upgrades |
| **Cryptoku Earning** | Based on score (200-8000+) | 1 per win |
| **Referral Reward** | 150 points | 5 tickets |
| **Database Field** | `profiles.points` | `profiles.tickets` |
| **Leaderboard Impact** | Yes (`total_points`) | No |
| **Minimum Floor** | 200 (Cryptoku) | N/A |
| **On-Chain Logging** | Planned | Not planned |

---

## 🔍 Technical Details

### Points Calculation Example (Cryptoku):
```
Degen Mode Game:
- Starting: 5,000 points
- Time: 900 seconds (15 minutes)
- Hints: 2
- Errors: 3
- Clean streak: 5

Calculation:
Base = 5,000 - (900 × 2) = 3,200
Penalties = (2 × 150) + (3 × 50) = 450
Bonuses = 200 (clean run) + 250 (5 × 50 streak, capped)
Final = 3,200 - 450 + 450 = 3,200 points

Minimum: 200 points (would apply if calculated score < 200)
```

### Database Tables:
- **profiles**: Stores `points` and `tickets` balances
- **leaderboard**: Stores `total_points` for rankings
- **transactions**: Logs all point and ticket changes with descriptions
- **game_sessions**: Records `points_earned` and `tickets_earned` per game

---

## 📝 Notes

1. **Points are persistent**: They survive browser restarts and are synced to the cloud
2. **Tickets are persistent**: Similarly saved and synced
3. **Leaderboard is competitive**: Only points affect rankings, tickets are personal currency
4. **Transaction history**: All changes are auditable via the `transactions` table
5. **Guest mode**: Points and tickets are tracked locally but not synced until wallet connection

---

## 🚀 Future Enhancements

- Points-based tournaments and competitions
- Ticket marketplace or trading system
- Daily/weekly challenges with point/ticket rewards
- Seasonal leaderboard resets with special rewards
- Cross-game point bonuses for playing multiple games
- Ticket bundles and special offers

