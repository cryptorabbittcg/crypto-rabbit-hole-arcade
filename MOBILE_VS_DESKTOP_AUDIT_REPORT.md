# Mobile vs Desktop Supabase Integration Audit Report

**Date:** 2024-12-XX  
**Status:** AUDIT ONLY - NO CODE CHANGES  
**Objective:** Identify root causes of mobile (iOS Chrome) Supabase integration failures compared to desktop reference

---

## 1. EXECUTIVE SUMMARY

### Top 3 Most Likely Issues on Mobile (Ranked by Likelihood)

#### 🔴 **Issue #1: localStorage Persistence/Partitioning on iOS (HIGHEST LIKELIHOOD)**
**Problem:** iOS Safari/Chrome have aggressive storage management that clears localStorage more frequently than desktop. The app relies heavily on `localStorage` for:
- Auth token storage (`arcade_auth_address`) - `lib/auth.ts:17-22`
- Profile data cache - `components/providers.tsx:206-224`
- Game session storage - `lib/game-session.ts:43-48`

**Impact:** User appears "connected" (wagmi address present) but `getAuthToken()` returns null, causing profile sync to fail or create duplicate profiles.

**Evidence:** 
- `lib/auth.ts:28-31` - `getAuthToken()` only checks localStorage
- No fallback to wallet address from `useAccount()` when localStorage is empty
- Profile sync depends on localStorage profile data before Supabase fetch (`components/providers.tsx:206-224`)

---

#### 🟡 **Issue #2: Wallet Connection → Profile Sync Race Condition (HIGH LIKELIHOOD)**
**Problem:** On mobile, Glyph wallet connection timing differs. The `ProfileSyncWrapper` triggers `syncProfileWithWallet()` immediately when `address && isConnected`, but:
- Wallet may not be fully "settled" when address becomes available
- Profile lookup happens before wallet state is consistent
- Auth dialog closes too quickly on mobile (`auth-dialog.tsx:136` - 500ms delay vs 100ms desktop)

**Impact:** Profile creation/fetch fails silently, or creates duplicate profiles if called multiple times before wallet fully connects.

**Evidence:**
- `components/profile-sync-wrapper.tsx:11-18` - Immediate sync on address change
- `components/auth-dialog.tsx:134-136` - Different delays for mobile vs desktop
- No debouncing or "settled" state check before profile sync
- Mobile timeout is longer (8s vs instant on desktop) but may still race

**Files:**
- `components/profile-sync-wrapper.tsx:12-18`
- `components/providers.tsx:204-310`
- `components/auth-dialog.tsx:37-46, 134-136`

---

#### 🟠 **Issue #3: Supabase Client Session/Cookie Handling on Mobile (MEDIUM-HIGH LIKELIHOOD)**
**Problem:** The app uses `@supabase/ssr`'s `createBrowserClient` which relies on browser storage for session tokens. However:
- **No Supabase Auth is actually used** - the app uses wallet-based auth only (`lib/auth.ts` stores address as token)
- Client-side Supabase queries use anon client (`lib/supabase/client.ts:108`) with no session
- RLS policies may block anon access on mobile if cookies aren't set correctly
- API routes use admin client (`createAdminClient`) but client-side services use anon client

**Impact:** Profile reads/writes fail on mobile due to RLS, or race conditions where profile doesn't exist when leaderboard submission happens.

**Evidence:**
- `lib/supabase/client.ts:45-116` - Creates browser client with no explicit auth
- `lib/supabase/services/profile.service.ts:34-80` - Uses anon client for profile lookups
- `app/api/cryptoku/submit-result/route.ts:133-141` - API route fails if profile not found
- No middleware for cookie management found

**Files:**
- `lib/supabase/client.ts:45-116`
- `lib/supabase/services/profile.service.ts:8-80`
- `app/api/cryptoku/submit-result/route.ts:133-141`

---

## 2. DESKTOP KNOWN-GOOD FLOW MAP

### A. Authentication Flow (Wallet Connect)

**Entry Points:**
1. Header/Profile Menu → `components/profile-menu.tsx:130-151` → Dispatches `showAuthDialog` event
2. Auth Dialog → `components/auth-dialog.tsx:26-342` → Shows `NativeGlyphConnectButton`
3. Global Auth Dialog → `components/global-auth-dialog.tsx` (if exists) → Same pattern

**Sequence (Desktop):**
```
User clicks "Connect Wallet"
  ↓
components/profile-menu.tsx:handleConnectClick()
  → window.dispatchEvent(new CustomEvent("showAuthDialog"))
  ↓
components/auth-dialog.tsx renders with open=true
  ↓
NativeGlyphConnectButton clicked (no popup test on desktop, line 163-164)
  ↓
wagmi useAccount() updates: address and isConnected become true
  ↓
auth-dialog.tsx:37-46 useEffect triggers handleAuthSuccess()
  ↓
handleAuthSuccess() (line 100-147):
  - storeAuthToken(address) → localStorage.setItem("arcade_auth_address", address)
  - onAuthSuccess callback → components/providers.tsx:handleAuthSuccess() (line 312-326)
  ↓
providers.tsx:handleAuthSuccess():
  - setIsAuthenticated(true)
  - setAddress(result.walletAddress)
  - syncProfileWithWallet(result.walletAddress) ← KEY STEP
  ↓
Dialog closes after 100ms (line 136)
```

**Files:**
- `components/profile-menu.tsx:130-151`
- `components/auth-dialog.tsx:26-147, 163-164, 254-342`
- `components/providers.tsx:312-326`

---

### B. Profile Creation/Sync Flow (Desktop)

**Sequence:**
```
Wallet connected (address available)
  ↓
ProfileSyncWrapper:11-18 useEffect detects address && isConnected
  → setWalletConnection(address)
  → syncProfileWithWallet(address)
  ↓
components/providers.tsx:syncProfileWithWallet() (line 204-310):
  1. Load from localStorage (line 207-224):
     - loadProfileByAddress(walletAddress)
     - Restore profile, tickets to state
     - Points NOT loaded from localStorage (line 222-223)
  2. Create Supabase client (line 226):
     - createClient() → lib/supabase/client.ts:45
     - Returns anon browser client
  3. Profile lookup (line 234):
     - profileService.getProfileByWallet(walletAddress)
     - lib/supabase/services/profile.service.ts:34-80
     - Queries: SELECT * FROM profiles WHERE wallet_address = normalized
  4. If profile exists (line 236-283):
     - Merge localStorage + Supabase data
     - setProfile(), setTickets(), setPoints() from Supabase
  5. If profile missing (line 284-306):
     - profileService.createProfile()
     - lib/supabase/services/profile.service.ts:83-145
     - INSERT INTO profiles (wallet_address, username, ...)
```

**Files:**
- `components/profile-sync-wrapper.tsx:11-18`
- `components/providers.tsx:204-310`
- `lib/supabase/services/profile.service.ts:34-145`
- `lib/supabase/client.ts:45-116`

---

### C. Game Result Submission Flow (Cryptoku Example)

**Sequence:**
```
Game completes (cryptokugame.tsx)
  ↓
Submit result API call:
  POST /api/cryptoku/submit-result
  Body: { playerAddress, mode, runId, timeSeconds, hintsUsed, errors, completed, forfeited }
  ↓
app/api/cryptoku/submit-result/route.ts:POST() (line 48-305):
  1. Validation (line 63-69)
  2. NOOB/forfeited early return (line 74-89)
  3. Get player stats from localStorage (line 102):
     - getCryptokuStats(normalizedAddress)
  4. Calculate score (line 106)
  5. Update stats in localStorage (line 109-128)
  6. Get profile (line 133):
     - profileService.getProfileByWallet(normalizedAddress)
     - CRITICAL: Fails if profile missing (line 135-140)
  7. Reward hints (line 152)
  8. Create admin client (line 159-168):
     - createAdminClient() → lib/supabase/admin.ts:7
     - Uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
  9. Idempotency check (line 171-188):
     - SELECT id FROM cryptoku_leaderboard WHERE run_id = runId
  10. Add leaderboard entry (line 192-216):
      - CryptokuLeaderboardService.addEntry()
      - Calls RPC: add_cryptoku_leaderboard_entry()
  11. Award points (line 220-279):
      - adminClient.rpc('update_user_balance', { p_points_change: pointsEarned })
      - Only if !isDuplicateRun && completed && ranked
```

**Files:**
- `features/games/cryptoku/cryptokugame.tsx` (submit call location TBD)
- `app/api/cryptoku/submit-result/route.ts:48-305`
- `lib/supabase/services/cryptoku-leaderboard.service.ts:43-111`
- `lib/supabase/admin.ts:7-48`

---

### D. Leaderboard Fetch Flow (Desktop)

**Sequence:**
```
User navigates to leaderboard page
  ↓
features/leaderboard/leaderboard-view.tsx renders
  ↓
useEffect triggers (line 76-117):
  1. Fetch overall leaderboard:
     - LeaderboardService.getTopByPoints(100)
     - lib/supabase/services/leaderboard.service.ts
     - RPC: get_leaderboard()
  2. Map results to UI format
  ↓
Cryptoku tab fetch (line 132-163):
  - fetch(`/api/cryptoku/leaderboard?mode=${mode}&limit=100`)
  - app/api/cryptoku/leaderboard/route.ts:GET()
  - CryptokuLeaderboardService.getLeaderboard()
  - RPC: get_cryptoku_leaderboard()
```

**Files:**
- `features/leaderboard/leaderboard-view.tsx:76-163`
- `app/api/cryptoku/leaderboard/route.ts:4-34`
- `lib/supabase/services/cryptoku-leaderboard.service.ts:116-157`

---

## 3. MOBILE FLOW MAP

### A. Authentication Flow (Mobile - Divergences)

**Key Differences from Desktop:**

1. **Popup Permission Test** (`auth-dialog.tsx:158-198`):
   - Desktop: Skips popup test (line 163-164)
   - Mobile: Tests `window.open()` before Glyph button click (line 168-198)
   - Sets `popupBlocked` state if popup fails
   - Can block click event propagation (line 171-173)

2. **Connection Timeout** (`auth-dialog.tsx:72-98`):
   - Desktop: No timeout check
   - Mobile: 8-second timeout before showing "taking longer" error (line 75, 95)
   - Uses `isMobileDevice` flag to trigger

3. **Dialog Close Delay** (`auth-dialog.tsx:134-136`):
   - Desktop: 100ms delay
   - Mobile: 500ms delay (line 136)
   - Rationale: "give a moment for connection to fully establish"

**Sequence (Mobile - Annotated):**
```
User taps "Connect Wallet"
  ↓
auth-dialog.tsx:handleGlyphButtonClick() (line 160)
  ↓ [MOBILE BRANCH]
  Popup test: window.open("about:blank", "_blank")
  If blocked → setPopupBlocked(true), show error, prevent click
  If allowed → close test popup, allow click to proceed
  ↓
NativeGlyphConnectButton clicked
  ↓
wagmi connection (may take 5-10 seconds on mobile, per comments)
  ↓
auth-dialog.tsx:37-46 useEffect triggers (same as desktop)
  BUT: Timeout check (line 72-98) may show error if connection takes >8s
  ↓
handleAuthSuccess() called (same as desktop)
  ↓
Dialog closes after 500ms (vs 100ms desktop)
  ↓
ProfileSyncWrapper triggers syncProfileWithWallet() (same as desktop)
```

**Potential Failures:**
- Popup test blocks legitimate connection (false positive)
- Connection timeout shows error even if connection succeeds later
- 500ms delay may not be enough on slow mobile networks
- Race: Dialog closes before wallet fully "settled"

**Files:**
- `components/auth-dialog.tsx:33-34, 72-98, 134-136, 158-198`
- `lib/utils/mobile-detection.ts:10-36`

---

### B. Profile Sync Flow (Mobile - Potential Issues)

**Same Sequence as Desktop BUT with Mobile Risks:**

1. **localStorage Access** (`providers.tsx:207-224`):
   - iOS may clear localStorage between page loads
   - If `loadProfileByAddress()` returns null on mobile (but exists on desktop):
     - Profile merge logic skipped (line 236-283)
     - May create duplicate profile or use stale Supabase data

2. **Supabase Client Creation** (`lib/supabase/client.ts:45-116`):
   - No differences, but browser storage for Supabase session tokens may be cleared on iOS
   - If Supabase client loses session, RLS may block queries

3. **Network Timing**:
   - Mobile networks slower → profile lookup may timeout
   - If `getProfileByWallet()` fails silently (error swallowed, line 56-70):
     - Profile creation may create duplicate

**Files:**
- `components/providers.tsx:204-310` (same as desktop)
- `lib/supabase/services/profile.service.ts:34-80` (error handling)

---

### C. Game Result Submission (Mobile - Failure Points)

**Same API Route BUT:**

1. **Profile Lookup May Fail** (`submit-result/route.ts:133-141`):
   - If profile sync didn't complete on mobile, `getProfileByWallet()` returns null
   - API returns 404: "Profile not found" (line 137-140)
   - Submission fails, no points awarded, no leaderboard entry

2. **Admin Client Creation** (`submit-result/route.ts:159-168`):
   - Same as desktop (uses service role key)
   - But if profile missing, admin client can't help (needs user_id)

3. **Network Failures**:
   - Mobile networks may drop requests mid-flight
   - If RPC call fails, no retry logic
   - Idempotency check (line 171-188) may not prevent duplicate if retry happens

**Files:**
- `app/api/cryptoku/submit-result/route.ts:133-141, 159-168`

---

## 4. SUPABASE TOUCHPOINTS INVENTORY

| Table/RPC | Read/Write | Client Type | Auth Required | Called From | Mobile Risk |
|-----------|------------|-------------|---------------|-------------|-------------|
| **TABLES** |
| `profiles` | Read | Anon (`createClient()`) | No (RLS allows) | `ProfileService.getProfileByWallet()` | ⚠️ RLS may block if no session |
| `profiles` | Write (INSERT) | Anon | No (RLS allows) | `ProfileService.createProfile()` | ⚠️ Race condition if called twice |
| `profiles` | Write (UPDATE) | Anon | No (RLS allows) | `ProfileService.updateProfile()` | ⚠️ Same |
| `cryptoku_leaderboard` | Read | Anon | No | `CryptokuLeaderboardService.getLeaderboard()` | ✅ Low risk (read-only) |
| `cryptoku_leaderboard` | Write | Admin (`createAdminClient()`) | No (bypasses RLS) | `CryptokuLeaderboardService.addEntry()` (via API) | ✅ Admin client safe |
| `cryptoku_hints` | Read/Write | Anon | No | `CryptokuHintsService` (various methods) | ⚠️ RLS check |
| `game_sessions` | Write | Anon | No | `GameService.createGameSession()` | ⚠️ RLS check |
| `leaderboard` | Read | Anon | No | `LeaderboardService.getTopByPoints()` | ✅ Low risk |
| **RPCs** |
| `update_user_balance` | Write | Admin (API) / Anon (direct) | No (admin bypasses) | `submit-result/route.ts:235` (admin) | ✅ Admin safe |
| `update_user_balance` | Write | Anon | No | `ProfileService.updateBalance()` | ⚠️ RLS may block |
| `add_cryptoku_leaderboard_entry` | Write | Admin | No | `submit-result/route.ts` (via service) | ✅ Admin safe |
| `get_cryptoku_leaderboard` | Read | Anon | No | `CryptokuLeaderboardService.getLeaderboard()` | ✅ Low risk |
| `get_leaderboard` | Read | Anon | No | `LeaderboardService.getTopByPoints()` | ✅ Low risk |
| `use_cryptoku_hint` | Write | Anon | No | `CryptokuHintsService.useHint()` | ⚠️ RLS check |
| `reward_cryptoku_hint` | Write | Anon | No | `CryptokuHintsService.rewardHint()` | ⚠️ RLS check |
| `ensure_cryptoku_hints` | Write | Anon | No | `CryptokuHintsService.ensureHintsRow()` | ⚠️ RLS check |

**Client Creation:**
- **Anon Client:** `lib/supabase/client.ts:45-116` → `createBrowserClient()` from `@supabase/ssr`
- **Admin Client:** `lib/supabase/admin.ts:7-48` → `createClient()` with `SUPABASE_SERVICE_ROLE_KEY`

**RLS Behavior:**
- Anon client relies on RLS policies (not explicitly checked in code)
- Admin client bypasses RLS (SECURITY DEFINER functions)
- No Supabase Auth session (wallet-based auth only)

---

## 5. DIVERGENCES LIST (Desktop vs Mobile)

| Feature | Desktop Behavior | Mobile Behavior | Impact |
|---------|-----------------|-----------------|--------|
| **Auth Dialog - Popup Test** | None (line 163-164) | `window.open()` test before click (line 168-198) | 🟡 May block legitimate connection |
| **Auth Dialog - Close Delay** | 100ms (line 136) | 500ms (line 136) | 🟠 May not be enough on slow networks |
| **Auth Dialog - Timeout** | None | 8s timeout check (line 72-98) | 🟡 False positive errors |
| **localStorage Persistence** | Stable | iOS may clear between sessions | 🔴 Profile data lost, auth token lost |
| **Wallet Connection Timing** | Fast (1-2s) | Slow (5-10s per comments) | 🟡 Race conditions with profile sync |
| **Network Latency** | Low | Variable/high | 🟠 Supabase queries may timeout |
| **Browser Storage** | Stable | iOS Safari/Chrome restrictive | 🔴 Supabase session tokens may clear |
| **Profile Sync Trigger** | Immediate on address change | Immediate (same) | 🟡 Race: wallet not fully settled |
| **Error Visibility** | Console + UI | Same, but slower networks hide errors | 🟠 Harder to debug on mobile |

**Code References:**
- `components/auth-dialog.tsx:33-34, 72-98, 134-136, 158-198`
- `components/providers.tsx:207-224` (localStorage access)
- `lib/auth.ts:17-31` (localStorage-only auth token)

---

## 6. ROOT-CAUSE HYPOTHESES (Ranked)

### Hypothesis #1: localStorage Cleared on iOS → Auth Token Missing
**Likelihood:** ⭐⭐⭐⭐⭐ (95%)  
**Evidence:**
- `lib/auth.ts:28-31` - `getAuthToken()` only checks localStorage
- No fallback to `useAccount().address` when localStorage is empty
- iOS Safari/Chrome clear localStorage aggressively
- Profile sync depends on `isAuthenticated` state which may be false if token missing

**Impact:**
- User appears "connected" (wagmi address exists) but app thinks not authenticated
- Profile sync may be skipped or fail
- Game submissions fail because profile lookup fails

**Verification:**
- Check `localStorage.getItem("arcade_auth_address")` on mobile after page refresh
- Check `isAuthenticated` state vs `address` from `useAccount()`

---

### Hypothesis #2: Profile Sync Race Condition (Wallet Not Settled)
**Likelihood:** ⭐⭐⭐⭐ (85%)  
**Evidence:**
- `profile-sync-wrapper.tsx:12-18` - Triggers immediately on `address && isConnected`
- Mobile connection takes 5-10 seconds (per code comments)
- `auth-dialog.tsx:136` - 500ms delay may not be enough
- No "wallet settled" state check before profile sync

**Impact:**
- Profile lookup happens before wallet fully connected
- `getProfileByWallet()` returns null → creates duplicate profile
- Or: Profile lookup fails → submission API fails with 404

**Verification:**
- Log timestamps: wallet connect → profile sync → Supabase query
- Check for duplicate profiles in database with same wallet_address

---

### Hypothesis #3: RLS Blocks Anon Queries on Mobile (No Session Cookie)
**Likelihood:** ⭐⭐⭐ (70%)  
**Evidence:**
- Client uses anon client (`lib/supabase/client.ts:108`)
- No Supabase Auth session (wallet-based only)
- iOS may not send cookies correctly for Supabase
- RLS policies may require specific conditions not met on mobile

**Impact:**
- `getProfileByWallet()` fails silently (error swallowed, `profile.service.ts:56-70`)
- Profile creation fails silently
- Leaderboard reads may fail

**Verification:**
- Check Supabase logs for RLS policy violations on mobile requests
- Compare network requests: desktop vs mobile (cookie headers)

---

### Hypothesis #4: API Route Profile Lookup Fails (Profile Not Created)
**Likelihood:** ⭐⭐⭐ (75%)  
**Evidence:**
- `submit-result/route.ts:133-141` - Returns 404 if profile missing
- Profile creation happens in client (`providers.tsx:290-306`)
- If client-side creation fails silently, API route will fail
- No retry logic in API route

**Impact:**
- Game submission returns 404: "Profile not found"
- No points awarded
- No leaderboard entry

**Verification:**
- Check Supabase `profiles` table for missing entries after mobile wallet connect
- Check API route logs for 404 responses

---

### Hypothesis #5: Network Timeouts on Mobile → Silent Failures
**Likelihood:** ⭐⭐ (60%)  
**Evidence:**
- Mobile networks slower/unreliable
- Profile service swallows errors (`profile.service.ts:56-70, 73-79`)
- No timeout handling in Supabase client configuration
- Silent failures mean UI doesn't update

**Impact:**
- Profile sync appears to succeed but actually fails
- User sees stale data or "not connected" state

**Verification:**
- Check network tab for failed/timeout requests on mobile
- Compare request durations: desktop vs mobile

---

## 7. FIX PLAN (NO CODE CHANGES - PROPOSAL ONLY)

### Fix #1: Add Fallback Auth Token from Wallet Address
**Files:** `lib/auth.ts`, `components/providers.tsx`

**Change:**
- `getAuthToken()`: If localStorage empty, check `useAccount().address` and return that
- `isAuthenticated` check: Use `address` from `useAccount()` if token missing but address exists

**Why Fixes Mobile:**
- iOS localStorage clearing won't break auth state
- Wallet connection is the source of truth, not localStorage

**Why Won't Break Desktop:**
- Desktop localStorage is stable, so fallback never triggers
- Same logic path, just adds safety net

**Rollback:**
- Revert `lib/auth.ts` changes, restore localStorage-only check

---

### Fix #2: Add "Wallet Settled" Check Before Profile Sync
**Files:** `components/profile-sync-wrapper.tsx`, `components/providers.tsx`

**Change:**
- Add debounce (500ms) or "settled" state check before `syncProfileWithWallet()`
- Or: Wait for `isConnected` to be stable for 1-2 seconds before sync
- Or: Add `isConnecting` state and wait for it to be false

**Why Fixes Mobile:**
- Prevents race condition where sync happens before wallet fully connected
- Mobile connection is slower, needs more time

**Why Won't Break Desktop:**
- Desktop connection is fast, so delay is negligible
- Still triggers on connection, just waits for stability

**Rollback:**
- Remove debounce/settled check, restore immediate sync

---

### Fix #3: Add Retry Logic for Profile Lookup in API Routes
**Files:** `app/api/cryptoku/submit-result/route.ts`

**Change:**
- If `getProfileByWallet()` returns null, wait 1-2 seconds and retry (max 2 retries)
- Or: Create profile in API route if missing (instead of 404)
- Log profile creation attempts for debugging

**Why Fixes Mobile:**
- Handles case where profile sync hasn't completed when submission happens
- Prevents 404 errors that block submissions

**Why Won't Break Desktop:**
- Desktop profile sync is fast, so retry rarely triggers
- Idempotency check prevents duplicates if profile created twice

**Rollback:**
- Restore immediate 404 if profile missing, remove retry

---

### Fix #4: Improve Error Handling and Logging
**Files:** `lib/supabase/services/profile.service.ts`, `components/providers.tsx`

**Change:**
- Stop swallowing errors in `profile.service.ts:56-70, 73-79`
- Log errors to console on mobile (not just network errors)
- Add error state to UI to show when profile sync fails

**Why Fixes Mobile:**
- Makes failures visible for debugging
- Users can see when something goes wrong

**Why Won't Break Desktop:**
- Same error handling, just more visible
- Desktop already works, so errors won't appear

**Rollback:**
- Restore error swallowing, remove logging

---

### Fix #5: Add localStorage Persistence Check
**Files:** `components/providers.tsx`, `lib/auth.ts`

**Change:**
- On profile sync, if localStorage profile missing but Supabase profile exists, restore localStorage
- On auth success, immediately check if localStorage token persists (iOS test)

**Why Fixes Mobile:**
- Restores localStorage after iOS clears it
- Maintains consistency between localStorage and Supabase

**Why Won't Break Desktop:**
- Desktop localStorage is stable, so restore rarely triggers
- Same logic, just adds persistence layer

**Rollback:**
- Remove localStorage restore logic, rely on Supabase only

---

## 8. TEST PLAN

### Test Environment Setup

**Desktop:**
- Chrome (latest) on macOS/Windows
- Firefox (if relevant)
- Network: Fast (WiFi/Ethernet)

**Mobile:**
- iOS Chrome (primary)
- iOS Safari (secondary)
- Network: Variable (WiFi + cellular)

**Test Accounts:**
- Use same wallet address on desktop and mobile for cross-device consistency testing

---

### Test Case 1: Wallet Connect/Login Flow

**Desktop:**
1. Open app → Click "Connect Wallet" in header
2. Click Glyph button → Wait for connection
3. **Verify:** Dialog closes within 2 seconds
4. **Verify:** Profile menu shows wallet address
5. **Check localStorage:** `arcade_auth_address` exists
6. **Check Network:** Profile lookup request succeeds (200)

**Mobile (iOS Chrome):**
1. Open app → Tap "Connect Wallet"
2. Tap Glyph button → Wait for connection (may take 5-10s)
3. **Verify:** Dialog closes (may take longer than desktop)
4. **Verify:** Profile menu shows wallet address
5. **Check localStorage:** `arcade_auth_address` exists
6. **Check Network:** Profile lookup request succeeds (200)
7. **Refresh page:** Verify `arcade_auth_address` still exists (iOS localStorage test)

**Expected Results:**
- ✅ Desktop: All checks pass
- ❓ Mobile: localStorage may be missing after refresh (Hypothesis #1)

**Network Calls to Monitor:**
- `GET /api/profile` (if exists)
- Supabase: `SELECT * FROM profiles WHERE wallet_address = ...`

---

### Test Case 2: Profile Creation/Consistency

**Desktop:**
1. Connect wallet (new address never used)
2. **Verify:** Profile created in Supabase (`profiles` table)
3. **Verify:** Username is `Rabbit{address.slice(2,8)}`
4. **Verify:** Points = 0, tickets = 5 (or default)
5. Disconnect → Reconnect same wallet
6. **Verify:** Same profile loaded (not duplicate)

**Mobile:**
1. Connect same wallet address (from desktop test)
2. **Verify:** Same profile loaded (not new profile created)
3. **Verify:** Points/tickets match desktop
4. **Check Database:** Only ONE profile with this wallet_address

**Expected Results:**
- ✅ Desktop: Profile created once, persists on reconnect
- ❓ Mobile: May create duplicate if localStorage missing (Hypothesis #2)

**Database Checks:**
```sql
SELECT id, wallet_address, username, created_at 
FROM profiles 
WHERE wallet_address = '0x...' 
ORDER BY created_at;
```

---

### Test Case 3: Game Result Submission (Cryptoku)

**Desktop:**
1. Connect wallet → Play Cryptoku (DEGEN or APE mode)
2. Complete game → Wait for submission
3. **Verify:** Success response from `/api/cryptoku/submit-result`
4. **Verify:** Points increased in UI
5. **Check Database:**
   - `cryptoku_leaderboard` has entry with run_id
   - `profiles.points` increased by score amount
   - `transactions` table has entry

**Mobile:**
1. Connect wallet → Play same game mode
2. Complete game → Wait for submission
3. **Verify:** Success response (not 404 "Profile not found")
4. **Verify:** Points increased
5. **Check Database:** Same as desktop

**Expected Results:**
- ✅ Desktop: Submission succeeds, points awarded
- ❓ Mobile: May fail with 404 if profile missing (Hypothesis #4)

**Network Calls to Monitor:**
- `POST /api/cryptoku/submit-result`
- Supabase RPC: `update_user_balance`
- Supabase RPC: `add_cryptoku_leaderboard_entry`

**Database Checks:**
```sql
-- Check points awarded
SELECT points FROM profiles WHERE wallet_address = '0x...';

-- Check leaderboard entry
SELECT * FROM cryptoku_leaderboard WHERE run_id = '...';

-- Check transactions
SELECT * FROM transactions WHERE user_id = (SELECT id FROM profiles WHERE wallet_address = '0x...') ORDER BY created_at DESC LIMIT 5;
```

---

### Test Case 4: Leaderboard Fetch/Display

**Desktop:**
1. Navigate to Leaderboard page
2. **Verify:** Overall Points leaderboard loads
3. **Verify:** Cryptoku tab loads (DEGEN and APE modes)
4. **Verify:** User's rank/score appears if applicable

**Mobile:**
1. Navigate to Leaderboard page
2. **Verify:** Same data loads as desktop
3. **Verify:** No infinite loading or errors

**Expected Results:**
- ✅ Desktop: Leaderboards load quickly
- ✅ Mobile: Should load (read-only, low risk)

**Network Calls:**
- `GET /api/cryptoku/leaderboard?mode=DEGEN&limit=100`
- Supabase RPC: `get_cryptoku_leaderboard`
- Supabase RPC: `get_leaderboard`

---

### Test Case 5: Cross-Device Consistency

**Test:**
1. Connect wallet on Desktop → Earn 100 points
2. Open same wallet on Mobile
3. **Verify:** Points show 100 on mobile (not 0)
4. Play game on Mobile → Earn 50 points
5. **Verify:** Points show 150 on mobile
6. Refresh Desktop → **Verify:** Points show 150 (synced)

**Expected Results:**
- ✅ Same wallet = same profile = same points across devices
- ❓ Mobile may show 0 if profile sync fails (Hypothesis #1, #2)

**Database Checks:**
```sql
-- Verify single profile
SELECT id, wallet_address, points FROM profiles WHERE wallet_address = '0x...';

-- Verify points transactions
SELECT * FROM transactions 
WHERE user_id = (SELECT id FROM profiles WHERE wallet_address = '0x...') 
AND currency = 'points' 
ORDER BY created_at;
```

---

### Test Case 6: Idempotency (Duplicate Submissions)

**Test:**
1. Complete game → Submission succeeds
2. Manually trigger submission again with same `run_id` (simulate retry)
3. **Verify:** Second submission returns success but doesn't award points twice
4. **Check Database:** Only ONE leaderboard entry, points awarded only once

**Expected Results:**
- ✅ Duplicate submissions don't double-award points
- ✅ `run_id` check prevents duplicates

---

### Test Case 7: Error Scenarios

**Test A: Profile Missing on Submission**
1. Manually delete profile from database (or use new wallet)
2. Try to submit game result
3. **Expected:** 404 error or automatic profile creation (depending on fix)

**Test B: Network Failure During Submission**
1. Throttle network to "Slow 3G" (Chrome DevTools)
2. Submit game result
3. **Expected:** Retry or clear error message

**Test C: localStorage Cleared (iOS)**
1. Connect wallet on mobile
2. Manually clear localStorage (`localStorage.clear()` in console)
3. Refresh page
4. **Expected:** Wallet still connected (fallback to `useAccount().address`)

---

## 9. MONITORING AND DEBUGGING RECOMMENDATIONS

### Add Client-Side Logging

**Recommended Log Points:**
1. `components/auth-dialog.tsx:100-147` - Log auth success with timing
2. `components/providers.tsx:234` - Log profile lookup result (found/not found)
3. `components/providers.tsx:290` - Log profile creation attempt
4. `app/api/cryptoku/submit-result/route.ts:133` - Log profile lookup in API

### Add Server-Side Logging

**Recommended:**
- Log all profile lookups (wallet_address → user_id)
- Log profile creation attempts (wallet_address, success/failure)
- Log API route profile lookups (404s indicate missing profiles)

### Database Monitoring

**Queries to Run:**
```sql
-- Check for duplicate profiles
SELECT wallet_address, COUNT(*) 
FROM profiles 
GROUP BY wallet_address 
HAVING COUNT(*) > 1;

-- Check profiles created in last 24h
SELECT wallet_address, username, created_at 
FROM profiles 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check failed submissions (if error logging added)
-- (Requires error log table or API logs)
```

---

## 10. APPENDIX: KEY FILE REFERENCES

**Auth/Profile:**
- `lib/auth.ts` - Auth token storage (localStorage only)
- `components/auth-dialog.tsx` - Wallet connection UI (mobile branches)
- `components/profile-sync-wrapper.tsx` - Profile sync trigger
- `components/providers.tsx:204-310` - Profile sync logic
- `lib/supabase/services/profile.service.ts` - Supabase profile operations

**Supabase Clients:**
- `lib/supabase/client.ts` - Anon browser client
- `lib/supabase/admin.ts` - Admin client (service role)

**Game Submission:**
- `app/api/cryptoku/submit-result/route.ts` - Cryptoku submission API
- `lib/supabase/services/cryptoku-leaderboard.service.ts` - Leaderboard service

**Mobile Detection:**
- `lib/utils/mobile-detection.ts` - `isMobile()`, `isIOS()` utilities

---

**END OF AUDIT REPORT**

**Next Steps:**
1. Review this audit with team
2. Prioritize fixes based on likelihood/impact
3. Implement fixes one at a time with rollback plan
4. Run test plan after each fix
5. Monitor production logs for improvements
