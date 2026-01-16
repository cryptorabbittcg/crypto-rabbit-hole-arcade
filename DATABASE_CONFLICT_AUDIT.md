# Database Conflict Audit Report

## Executive Summary
This audit identifies all places where multiple database/storage systems are being used for the same purpose, which could cause conflicts, data inconsistencies, or errors.

## Storage Systems Found

1. **Supabase** (Primary) - PostgreSQL database
2. **Vercel KV** (Legacy) - Redis key-value store
3. **localStorage** (Client-side fallback) - Browser storage
4. **In-memory cache** (Temporary) - Server-side session storage

---

## ✅ RESOLVED CONFLICTS

### 1. Cryptoku Stats Storage
**Status:** ✅ FIXED
- **Was:** `lib/cryptoku-store.ts` using Vercel KV
- **Now:** `lib/cryptoku-stats.ts` using Supabase + in-memory fallback
- **Location:** `app/api/cryptoku/submit-result/route.ts`
- **Impact:** No longer tries to use Vercel KV for stats

---

## ⚠️ POTENTIAL CONFLICTS

### 1. Cryptoku Leaderboard Storage
**Status:** ⚠️ DUPLICATE FUNCTIONS EXIST (Not Currently Used)

**Vercel KV Implementation:**
- File: `lib/cryptoku-store.ts`
- Functions: `addCryptokuLeaderboardEntry()`, `getCryptokuLeaderboard()`
- **Status:** NOT imported anywhere ✅

**Supabase Implementation:**
- File: `lib/supabase/services/cryptoku-leaderboard.service.ts`
- Functions: `addEntry()`, `getLeaderboard()`
- **Status:** ACTIVE - Used in `app/api/cryptoku/leaderboard/route.ts` ✅
- **Status:** ACTIVE - Used in `app/api/cryptoku/submit-result/route.ts` ✅

**Risk:** LOW - Vercel KV functions exist but are not being called
**Action:** Can safely delete Vercel KV leaderboard functions from `cryptoku-store.ts`

---

### 2. Cryptoku Hints Storage
**Status:** ⚠️ MULTIPLE STORAGE LAYERS (By Design)

**Storage Layers:**
1. **Supabase** (Primary) - `cryptoku_hints` table
2. **localStorage** (Fallback/Migration) - Client-side backup
3. **In-memory cache** (Temporary) - Server-side session

**Implementation:**
- File: `lib/supabase/services/cryptoku-hints.service.ts`
- Uses Supabase as primary, localStorage as fallback/migration source
- **Status:** ✅ WORKING - Designed to use multiple layers gracefully

**Risk:** LOW - Multiple layers are intentional fallbacks, not conflicts
**Action:** No action needed - this is by design

---

### 3. Ape In Game Stats
**Status:** ⚠️ VERCEL KV EXISTS BUT NOT USED

**Vercel KV Implementation:**
- File: `lib/apein-store.ts`
- Functions: `getApeInStats()`, `updateApeInStats()`, `addApeInLeaderboardEntry()`
- **Status:** NOT imported in any API routes ✅

**Supabase Implementation:**
- File: `lib/supabase/services/ape-in-free-plays.service.ts`
- Tables: `ape_in_game_states`, `ape_in_sessions`, `ape_in_daily_free_plays`
- **Status:** ACTIVE - Used in `app/api/ape-in/submit-result/route.ts` ✅

**Risk:** LOW - Vercel KV functions exist but are not being called
**Action:** Can safely delete `lib/apein-store.ts` if Ape In is fully migrated

---

### 4. Profile Storage
**Status:** ✅ MULTIPLE LAYERS (By Design)

**Storage Layers:**
1. **Supabase** (Primary) - `profiles` table
2. **localStorage** (Client-side cache) - `lib/profile-storage.ts`
3. **In-memory** (Temporary) - Component state

**Implementation:**
- Supabase: `lib/supabase/services/profile.service.ts`
- localStorage: `lib/profile-storage.ts`
- **Status:** ✅ WORKING - localStorage is used as client-side cache, Supabase is source of truth

**Risk:** LOW - Multiple layers are intentional (cache + source of truth)
**Action:** No action needed - this is by design

---

### 5. Game Session Storage
**Status:** ✅ SUPABASE ONLY

**Implementation:**
- File: `lib/supabase/services/game.service.ts`
- Table: `game_sessions`
- **Status:** ✅ CLEAN - Only uses Supabase

**Risk:** NONE

---

## 🔍 FILES TO REVIEW

### Files with Vercel KV (Legacy - Not Used)
1. `lib/cryptoku-store.ts` - Contains Vercel KV functions (not imported)
2. `lib/apein-store.ts` - Contains Vercel KV functions (not imported)

### Files with localStorage (Client-side Fallback)
1. `lib/profile-storage.ts` - Profile cache (intentional)
2. `lib/supabase/services/cryptoku-hints.service.ts` - Hints migration (intentional)
3. `features/games/cryptoku/components/logic/playerStats.ts` - Client-side stats (legacy?)

---

## 📋 RECOMMENDATIONS

### High Priority
1. ✅ **DONE:** Replace `cryptoku-store.ts` usage with `cryptoku-stats.ts`
2. **TODO:** Remove unused Vercel KV functions from `cryptoku-store.ts`:
   - `addCryptokuLeaderboardEntry()` (line 310)
   - `getCryptokuLeaderboard()` (line 336)
   - Keep file for reference or delete entirely

### Medium Priority
3. **TODO:** Review `lib/apein-store.ts`:
   - Confirm Ape In is fully migrated to Supabase
   - If yes, delete `lib/apein-store.ts`
   - If no, migrate remaining functions

4. **TODO:** Review `features/games/cryptoku/components/logic/playerStats.ts`:
   - Check if localStorage stats are still needed
   - Consider migrating to Supabase if still in use

### Low Priority
5. **TODO:** Remove `@vercel/kv` from `package.json`:
   - After confirming no other usage
   - Run: `npm uninstall @vercel/kv`

6. **TODO:** Document storage strategy:
   - Update documentation to clarify which storage is used where
   - Mark Vercel KV files as legacy/deprecated

---

## ✅ VERIFICATION CHECKLIST

- [x] Cryptoku submit-result uses Supabase (not Vercel KV)
- [x] Cryptoku leaderboard uses Supabase (not Vercel KV)
- [x] Cryptoku hints use Supabase (with localStorage fallback)
- [x] Ape In uses Supabase (Vercel KV not imported)
- [x] Profiles use Supabase (with localStorage cache)
- [ ] Vercel KV functions removed from codebase
- [ ] `@vercel/kv` package removed from package.json

---

## 🎯 SUMMARY

**Current Status:** ✅ MOSTLY CLEAN
- All active API routes use Supabase
- Vercel KV code exists but is not being called
- Multiple storage layers are intentional (cache/fallback)

**Risk Level:** LOW
- No active conflicts
- Legacy code exists but doesn't interfere
- Cleanup recommended but not urgent

**Next Steps:**
1. Remove unused Vercel KV functions
2. Remove `@vercel/kv` package
3. Document storage strategy
