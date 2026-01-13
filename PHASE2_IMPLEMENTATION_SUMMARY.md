# Phase 2 Implementation Summary: Profile Page Redesign

## Overview
Phase 2 redesigns the `/profile` page to match "Otherside-style wallet clarity" while keeping all logic and APIs stable. This is a UI-only refactor with no changes to authentication, providers, or API routes.

## Files Modified

### `features/profile/profile-view.tsx`
- **Location:** `/app/profile/page.tsx` imports this component
- **Status:** ✅ Completely rewritten
- **Changes:**
  1. Header layout restructured into 3 zones (Identity, Wallet, Balances)
  2. Added Linked Wallets section (feature flagged)
  3. Updated Stats tab with real Supabase values
  4. Updated Referrals tab (added copy functionality)
  5. Updated Achievements tab to placeholder
  6. Updated Recent Activity to fetch real data from `game_sessions` table

## Detailed Changes

### 1. Header Layout (3 Zones)

#### Zone A: Identity (Left)
- Avatar (existing, moved to left)
- Username with edit button (existing functionality)
- Address display with copy button (new: copy functionality)
- "Member since" date (existing)

#### Zone B: Wallet (Middle/Right)
- Title: "Primary Wallet: Glyph"
- Connected address display with copy button
- Status pill: "Connected" / "Not connected" (green badge when connected)
- "Manage Wallet" button that opens https://useglyph.io/profile in new tab

#### Zone C: Balances (Right)
- Tickets card (existing, moved to right)
- Points card (existing, moved to right)

### 2. Linked Wallets Section

- **Location:** Below header card, above tabs
- **Feature Flag:** `NEXT_PUBLIC_LINKED_WALLETS_UI=true`
- **Implementation:**
  - Shows "Linked Wallets" card when env var is set
  - Displays MetaMask as "Not linked" with "Coming Soon" button (disabled)
  - Ready for future wallet linking implementation

### 3. Stats Tab

- **Real Values from Supabase:**
  - `total_games_played` → "Games Played"
  - `total_wins` → "Wins"
  - `total_losses` → "Losses"
  - `win_streak` → "Win Streak"
  - `best_win_streak` → "Best Win Streak" (handles both `best_win_streak` and `highest_win_streak` field names)
  - `total_playtime` → "Total Playtime" (formatted as human-readable duration)
- **Fallback:** Shows 0 if values are missing
- **Layout:** 3-column grid of stat cards

### 4. Referrals Tab

- **Existing Functionality:** Preserved
- **New Features:**
  - Added copy button for referral code (in addition to referral link)
  - Referral code, referral count, and referral earnings displayed
- **No Changes:** Referral rewards tiers remain unchanged

### 5. Achievements Tab

- **Changed to:** Placeholder card with "Coming Soon" message
- **Removed:** All mock achievement cards
- **UI:** Simple centered card with trophy icon and message

### 6. Recent Activity

- **Data Source:** Supabase `game_sessions` table
- **Implementation:**
  - Fetches last 10 rows using `GameService.getRecentGames()`
  - Looks up profile by wallet address, then queries `game_sessions` by `user_id`
  - Orders by `created_at` (or `started_at` if `created_at` doesn't exist)
- **Display Fields:**
  - `game_type` (formatted: "Card Battle", "Ape In", etc.)
  - `game_mode` (if available)
  - `score`
  - `points_earned`
  - `duration` (formatted as human-readable: "5m 30s", "2h 15m", etc.)
  - `created_at` / `started_at` (formatted date)
- **Error Handling:**
  - Gracefully handles missing Supabase config
  - Shows "No recent activity" if no games found
  - Shows "Loading activity..." while fetching

## Data Flow

### Profile Data Loading
1. Component loads wallet address from `useArcade()` or `useAccount()`
2. Fetches Supabase profile via `ProfileService.getProfileByWallet(address)`
3. Fetches game sessions via `GameService.getRecentGames(address, 10)`
4. Updates local state with fetched data

### Stats Display
- Uses `supabaseProfile` state (fetched from Supabase)
- Falls back to 0 if values are missing
- Handles field name mismatches (e.g., `best_win_streak` vs `highest_win_streak`)

### Recent Activity Display
- Uses `recentGames` state (fetched from Supabase)
- Handles field name mismatches (e.g., `duration` vs `duration_seconds`, `created_at` vs `started_at`)
- Formats durations and dates for display

## Constraints Maintained

✅ **No Auth Flow Changes:** All authentication logic unchanged
✅ **No Provider Changes:** `useArcade()` and `useAccount()` usage unchanged
✅ **No API Changes:** All submit-result APIs untouched
✅ **TypeScript:** All types pass (linter shows no errors)
✅ **Backward Compatible:** Existing functionality preserved

## Feature Flag

**Environment Variable:** `NEXT_PUBLIC_LINKED_WALLETS_UI`

- **Set to `"true"`:** Linked Wallets section is visible
- **Not set or any other value:** Linked Wallets section is hidden

## Known Issues / Notes

1. **Database Field Mismatch:**
   - Database schema uses `best_win_streak`, TypeScript type uses `highest_win_streak`
   - Code handles both field names
   
2. **Game Sessions Timestamp:**
   - Database table has `started_at` field
   - GameService orders by `created_at` (which may not exist)
   - Code handles both `created_at` and `started_at` for display

3. **Duration Field:**
   - Database uses `duration`, TypeScript type uses `duration_seconds`
   - Code handles both field names

## Testing Checklist

- [ ] Header displays correctly in 3 zones
- [ ] Wallet section shows connection status correctly
- [ ] Copy buttons work for address and referral code
- [ ] Stats tab shows real values from Supabase
- [ ] Recent Activity fetches and displays game sessions
- [ ] Linked Wallets section shows/hides based on feature flag
- [ ] Achievements tab shows placeholder
- [ ] All tabs work correctly
- [ ] No TypeScript errors
- [ ] No console errors

## Next Steps (Future Phases)

- Implement wallet linking functionality
- Add NFT avatar selection
- Implement achievements system
- Add more wallet providers to Linked Wallets section

