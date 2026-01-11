# Legacy localStorage Keys (Pre-Supabase)

This document lists all localStorage keys used before Supabase integration. These should be cleared during testing resets.

## Main Storage Keys

### 1. Game Session (`crypto_rabbit_session`)
**Location:** `lib/game-session.ts`
**Storage:** Both `localStorage` and `sessionStorage`
**Purpose:** Stores current game session data including points and tickets
**Data Structure:**
```typescript
{
  sessionId: string
  userId: string
  username: string
  address: string | null
  thirdwebClientId: string
  tickets: number
  points: number
  timestamp: number
  avatar?: string | null
}
```

### 2. Point Updates Queue (`crypto_rabbit_point_updates`)
**Location:** `lib/game-session.ts`
**Storage:** `localStorage`
**Purpose:** Queue of point/ticket updates from external games that need to be processed
**Data Structure:**
```typescript
Array<{
  gameId: "ape-in" | "cryptoku" | "card-battle"
  points: number
  tickets: number
  achievements?: string[]
  timestamp: number
}>
```

### 3. Profile by Address (`arcade_profile_{address}`)
**Location:** `lib/profile-storage.ts`
**Storage:** `localStorage`
**Purpose:** Stores user profile data keyed by wallet address
**Key Format:** `arcade_profile_{wallet_address.toLowerCase()}`
**Data Structure:**
```typescript
{
  username: string
  avatar: string
  referralCode: string
  referralCount: number
  referralEarnings: number
  joinedAt: string // ISO date string
  points: number // Accumulated points from gameplay
  tickets: number // Accumulated tickets from gameplay
  stats: {
    gamesPlayed: number
    totalScore: number
    achievements: string[]
  }
}
```

## Cryptoku-Specific Keys

### 4. Cryptoku Player Stats (`cryptoku-player-stats`)
**Location:** `features/games/cryptoku/components/logic/playerStats.ts`
**Storage:** `localStorage`
**Purpose:** Local Cryptoku player statistics

### 5. Cryptoku Game Sessions (`cryptoku-game-sessions`)
**Location:** `features/games/cryptoku/components/logic/playerStats.ts`
**Storage:** `localStorage`
**Purpose:** Local Cryptoku game session history

### 6. Cryptoku RHT Balance (`cryptoku_rht_balance_{address}`)
**Location:** `features/games/cryptoku/components/logic/tokenRewards.ts`
**Storage:** `localStorage`
**Purpose:** Cryptoku RHT token balance (legacy)
**Key Format:** `cryptoku_rht_balance_{wallet_address.toLowerCase()}`

### 7. Cryptoku Hints (`cryptoku_hints_{address}`)
**Location:** `lib/cryptoku-store.ts` (fallback)
**Storage:** `localStorage` (fallback when KV not configured)
**Purpose:** Cryptoku hints data (fallback storage)
**Key Format:** `cryptoku_hints_{wallet_address.toLowerCase()}`

## Migration to Supabase

After Supabase integration:
- **Points & Tickets:** Now stored in `profiles` table in Supabase
- **Game Stats:** Now stored in `profiles` and `leaderboard` tables
- **Game Sessions:** Now stored in `game_sessions` table
- **Cryptoku Stats:** Now stored in Vercel KV (with localStorage fallback)
- **Cryptoku Hints:** Now stored in Vercel KV (with localStorage fallback)

**Note:** The legacy localStorage keys may still exist and should be cleared during testing to avoid conflicts.

## Clearing All Legacy Keys

Use this JavaScript snippet in browser console:

```javascript
// Comprehensive cleanup of all legacy keys
const patterns = [
  'crypto_rabbit_session',
  'crypto_rabbit_point_updates',
  'arcade_profile_',
  'cryptoku-player-stats',
  'cryptoku-game-sessions',
  'cryptoku_rht_balance_',
  'cryptoku_hints_'
];

const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && patterns.some(pattern => key.includes(pattern))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log('Removed:', key);
});

console.log(`✅ Cleared ${keysToRemove.length} legacy localStorage keys`);

// Also clear sessionStorage
sessionStorage.removeItem('crypto_rabbit_session');
```

