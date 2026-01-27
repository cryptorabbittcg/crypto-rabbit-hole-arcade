# Ape In PvP - Phase 1 Implementation Summary

## ✅ Phase 1 Complete: Matching Infrastructure

### Database Migrations (3 files)

1. **`supabase/migrations/20250120000000_create_ape_in_pvp_tables.sql`**
   - Creates `ape_in_pvp_matches` table with all required fields
   - Creates `ape_in_pvp_leaderboard` table
   - Adds indexes for performance

2. **`supabase/migrations/20250120000001_create_ape_in_pvp_rls.sql`**
   - RLS policies for `ape_in_pvp_matches`:
     - SELECT: Participants only (player1_id or player2_id = auth.uid)
     - INSERT/UPDATE/DELETE: Blocked for clients (USING false)
   - RLS policies for `ape_in_pvp_leaderboard`:
     - SELECT: Public read
     - All writes: Blocked for clients (USING false)

3. **`supabase/migrations/20250120000002_create_pvp_find_or_create_public_match_rpc.sql`**
   - Postgres RPC function: `pvp_find_or_create_public_match`
   - Uses `FOR UPDATE SKIP LOCKED` for atomic matchmaking
   - Precomputes first-player rolls when second player joins
   - Initializes `game_state` with strict schema

### API Routes (2 files)

4. **`app/api/ape-in/pvp/match/public/route.ts`**
   - POST endpoint: Find or create public match
   - Uses `createAdminClient()` (service-role)
   - Calls atomic RPC function
   - Returns `{ matchId }`

5. **`app/api/ape-in/pvp/match/[matchId]/route.ts`**
   - GET endpoint: Get match status (read-only)
   - Validates participant via wallet address → profile.id
   - Returns match info: status, type, code, player IDs, timestamps
   - Returns 403 if not a participant

### PvP Module Structure (3 files)

6. **`features/games/ape-in/pvp/utils/pvp-storage.ts`**
   - localStorage utilities for `ape_in_active_pvp_match_id`
   - Functions: `storeActivePvPMatch()`, `getActivePvPMatch()`, `clearActivePvPMatch()`

7. **`features/games/ape-in/pvp/components/PvPMatchModal.tsx`**
   - Match-making modal component
   - Three options: Find Public, Create Private (stub), Join Private (stub)
   - Transitions to waiting room when match found

8. **`features/games/ape-in/pvp/components/PvPWaitingRoom.tsx`**
   - Waiting room component with polling
   - Polls match status every 2 seconds
   - 60-second timeout
   - Shows "Opponent found!" when `match_status = 'rolling_for_first'`
   - Stores active match in localStorage

### MainMenu Integration (1 file modified)

9. **`features/games/ape-in/components/MainMenu.tsx`**
   - Added PvP modal state and import
   - Enabled PvP button (removed from disabled list)
   - Added handler to open PvP modal instead of starting game
   - Removed "Coming Soon" overlay for PvP card

---

## 📋 Files Changed/Added Checklist

### New Files (8)
- ✅ `supabase/migrations/20250120000000_create_ape_in_pvp_tables.sql`
- ✅ `supabase/migrations/20250120000001_create_ape_in_pvp_rls.sql`
- ✅ `supabase/migrations/20250120000002_create_pvp_find_or_create_public_match_rpc.sql`
- ✅ `app/api/ape-in/pvp/match/public/route.ts`
- ✅ `app/api/ape-in/pvp/match/[matchId]/route.ts`
- ✅ `features/games/ape-in/pvp/utils/pvp-storage.ts`
- ✅ `features/games/ape-in/pvp/components/PvPMatchModal.tsx`
- ✅ `features/games/ape-in/pvp/components/PvPWaitingRoom.tsx`

### Modified Files (1)
- ✅ `features/games/ape-in/components/MainMenu.tsx`

---

## 🧪 Testing Checklist

Before Phase 2, test:

- [ ] Two browsers, two wallets
- [ ] Click "Find Public Match" in both
- [ ] Verify match is created and second player joins
- [ ] Verify `match_status` becomes `rolling_for_first`
- [ ] Verify `game_state` is initialized correctly
- [ ] Verify `first_roll_seat1` and `first_roll_seat2` are precomputed
- [ ] Refresh page mid-wait - verify resume works
- [ ] Cancel match - verify cleanup
- [ ] Let timeout trigger (60 seconds) - verify error handling
- [ ] Verify localStorage stores `ape_in_active_pvp_match_id`
- [ ] Verify GET endpoint returns 403 for non-participants
- [ ] Verify RLS policies block client writes

---

## 🚀 Next Steps (Phase 2)

- Implement first-player roll reveal endpoint
- Implement `usePvPGameState` hook
- Add WebSocket/real-time sync
- Create PvP game board component
- Implement game actions (draw, roll, stack, forfeit)

---

## 📝 Notes

- All API routes use `createAdminClient()` (service-role)
- Identity model: wallet address → ProfileService → profile.id
- No game logic implemented yet (Phase 1 only)
- Polling used instead of WebSocket (Phase 1)
- Private matches are stubs (Phase 1)
