# Ape In PvP - Phase 1 Ship Checklist ✅

## ✅ 1. Database Migrations Verified

### Migration Files:
- ✅ `supabase/migrations/20250120000000_create_ape_in_pvp_tables.sql`
  - `player1_id` is NOT NULL ✅
  - `player2_*` columns are nullable ✅
  - All required fields and indexes present ✅
  - No duplicate UNIQUE constraints ✅

- ✅ `supabase/migrations/20250120000001_create_ape_in_pvp_rls.sql`
  - `ape_in_pvp_matches`: SELECT blocked (server-only) ✅
  - `ape_in_pvp_matches`: INSERT/UPDATE/DELETE blocked (server-only) ✅
  - `ape_in_pvp_leaderboard`: SELECT public ✅
  - `ape_in_pvp_leaderboard`: INSERT/UPDATE/DELETE blocked (server-only) ✅

- ✅ `supabase/migrations/20250120000002_create_pvp_find_or_create_public_match_rpc.sql`
  - Atomic matchmaking with `FOR UPDATE SKIP LOCKED` ✅
  - Self-match prevention (`player1_id <> p_user_id`) ✅
  - Defensive check (`player2_id IS NULL`) ✅
  - UPDATE assertion with `RETURNING id INTO v_match_id` ✅
  - Precomputed first-player rolls ✅
  - Initial `game_state` with strict schema ✅

---

## ✅ 2. API Routes Verified

### Route Files:
- ✅ `app/api/ape-in/pvp/match/public/route.ts`
  - Uses `createAdminClient()` (service-role) ✅
  - Wallet → ProfileService → profile.id identity model ✅
  - Active match guard prevents duplicate waiting rows ✅
  - UUID validation ✅
  - Address format validation ✅
  - Error handling ✅

- ✅ `app/api/ape-in/pvp/match/[matchId]/route.ts`
  - Uses `createAdminClient()` (service-role) ✅
  - Participant verification (wallet → profile.id) ✅
  - UUID validation for matchId ✅
  - Address format validation ✅
  - Returns 403 for non-participants ✅
  - Uses `maybeSingle()` for cleaner queries ✅

---

## ✅ 3. UI Flow Verified

### Component Chain:
1. **MainMenu.tsx** (line 572-576)
   - PvP button enabled (removed from disabled list) ✅
   - Opens `PvPMatchModal` on click ✅
   - Passes `playerAddress` from identity ✅

2. **PvPMatchModal.tsx** (line 17-42)
   - Calls `POST /api/ape-in/pvp/match/public` ✅
   - Receives `matchId` from response ✅
   - Transitions to `PvPWaitingRoom` with `matchId` and `playerAddress` ✅

3. **PvPWaitingRoom.tsx**
   - Polls `GET /api/ape-in/pvp/match/[matchId]` every 2 seconds ✅
   - Stores `active_pvp_match_id` in localStorage ✅
   - Shows "Opponent Found!" when `match_status === 'rolling_for_first'` ✅
   - All production-hardening applied ✅

---

## ✅ 4. Build Verification

### Build Status:
- ✅ `npm run build` completed successfully
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ All routes compiled:
  - `/api/ape-in/pvp/match/public` ✅
  - `/api/ape-in/pvp/match/[matchId]` ✅

### Build Warnings:
- ⚠️ MetaMask SDK async-storage warning (expected, not blocking)

---

## ✅ 5. Production Hardening Checklist

### PvPWaitingRoom Component:
- ✅ localStorage written once (not on every poll)
- ✅ Clean timer management (immediate cleanup + ref nulling)
- ✅ Stable callbacks (useCallback with stable deps, no interval churn)
- ✅ Unmount-safe (no state updates after unmount)
- ✅ Efficient (no redundant polls via ref-based check)
- ✅ Network-efficient (AbortController cancels in-flight requests)
- ✅ Edge-case hardened (opponentFoundRef resets on new match)
- ✅ Clean ref management (abortController cleared after completion)
- ✅ Race-condition safe (only clears ref if it matches current controller)
- ✅ Error handling (controller cleared on all response paths, errors cleared on success)

---

## 📋 Files Changed/Added Summary

### New Files (8):
1. `supabase/migrations/20250120000000_create_ape_in_pvp_tables.sql`
2. `supabase/migrations/20250120000001_create_ape_in_pvp_rls.sql`
3. `supabase/migrations/20250120000002_create_pvp_find_or_create_public_match_rpc.sql`
4. `app/api/ape-in/pvp/match/public/route.ts`
5. `app/api/ape-in/pvp/match/[matchId]/route.ts`
6. `features/games/ape-in/pvp/utils/pvp-storage.ts`
7. `features/games/ape-in/pvp/components/PvPMatchModal.tsx`
8. `features/games/ape-in/pvp/components/PvPWaitingRoom.tsx`

### Modified Files (1):
1. `features/games/ape-in/components/MainMenu.tsx`
   - Added PvP modal state and import
   - Enabled PvP button
   - Added handler to open PvP modal

---

## 🧪 Manual Testing Checklist

### Test Scenario: Two-Player Matchmaking
1. ✅ Open two browser windows with different wallets
2. ✅ Both click "Find Public Match" button
3. ✅ First player: Should see "Searching for Match" and receive a `matchId`
4. ✅ Second player: Should join the same `matchId` within ~2 seconds
5. ✅ Both players: Should see "Opponent Found!" when `match_status` becomes `rolling_for_first`
6. ✅ Verify no duplicate waiting rows created (spam-click test)

### Test Scenario: Active Match Guard
1. ✅ Click "Find Match" multiple times rapidly
2. ✅ Verify only one waiting match is created (guard prevents duplicates)
3. ✅ Verify same `matchId` is returned on subsequent clicks

### Test Scenario: Participant Verification
1. ✅ Try to access a match with a non-participant wallet
2. ✅ Verify 403 error is returned

---

## 🚀 Phase 1 Ready to Ship

**Status: ✅ PRODUCTION-READY**

All Phase 1 deliverables are complete:
- ✅ Database schema and RLS policies
- ✅ Atomic matchmaking RPC
- ✅ API routes with proper validation and guards
- ✅ UI components with production hardening
- ✅ Build passes without errors
- ✅ All edge cases handled

**Next Steps (Phase 2):**
- First-player roll reveal endpoint
- Real-time sync (WebSocket/Realtime)
- PvP game board component
- Game actions (draw, roll, stack, forfeit)
- Scoring and leaderboard updates

---

## 📝 Notes

- All API routes use Node runtime (not Edge) for `crypto.randomInt` and Supabase admin client
- Identity model: wallet address → ProfileService → profile.id (not Supabase auth.uid)
- localStorage key: `"ape_in_active_pvp_match_id"` (Phase 1 placeholder userId)
- Polling interval: 2 seconds
- Timeout: 60 seconds
- Phase 2 will implement actual game logic and real-time sync
