# Mobile vs Desktop Supabase + Glyph Auth Parity Audit

**Date:** 2024-12-XX  
**Status:** AUDIT ONLY - NO CODE CHANGES  
**Objective:** Identify all parity gaps between mobile (iOS Chrome) and desktop Supabase integration

---

## Executive Summary

**Desktop Status:** ✅ Fully working - wallet connect, profile sync, points, leaderboards, game submissions  
**Mobile Status:** ⚠️ Inconsistent - connection timing issues, profile sync races, potential state mismatches

**Key Findings:**
1. **Auth State Logic Gap:** `isAuthenticated` can be `true` when `address` is `null` (ghost auth state)
2. **ProfileService Defaults:** `ape_balance` defaults to 1000 if not provided (should be 0)
3. **localStorage Dependency:** Mobile may lose localStorage, but wagmi is source of truth (partially fixed)
4. **Profile Sync Lock:** Lock release depends on `.finally()` - must verify it always executes
5. **Client-Side Points Updates:** `addPoints()` uses anon RPC which may fail on mobile due to RLS/timing

---

## A. AUTH + WALLET CONNECTION FLOW

### Desktop Flow

```
User clicks "Connect Wallet" (ProfileMenu:130)
  ↓
window.dispatchEvent("showAuthDialog")
  ↓
AuthDialog opens (auth-dialog.tsx:26)
  ↓
User clicks NativeGlyphConnectButton
  ↓ [NO popup test on desktop - line 184-185]
NativeGlyphConnectButton triggers wagmi connection
  ↓
wagmi useAccount() updates: address && isConnected = true
  ↓
AuthDialog:37-46 useEffect detects connection
  ↓
handleAuthSuccess() called (auth-dialog.tsx:113)
  - storeAuthToken(address) → localStorage.setItem("arcade_auth_address", address)
  - onAuthSuccess callback → Providers.handleAuthSuccess() (providers.tsx:384)
  ↓
Dialog closes after 100ms (auth-dialog.tsx:152)
  ↓
Providers:106-127 useEffect syncs wagmi state
  - setAddress(wagmiAddress)
  - setIsConnected(wagmiConnected)
  - if (wagmiAddress && wagmiConnected) setIsAuthenticated(true)
  - localStorage.setItem("arcade_auth_address", wagmiAddress) [cache update]
  ↓
ProfileSyncWrapper:17-87 useEffect detects address && isConnected
  - setWalletConnection(address) [immediate]
  - syncProfileWithWallet(address) [immediate, 0ms delay]
```

**Files:**
- `components/profile-menu.tsx:130-151`
- `components/auth-dialog.tsx:26-163, 184-185`
- `components/providers.tsx:106-127, 384-398`
- `components/profile-sync-wrapper.tsx:17-87`

---

### Mobile Flow (iOS Chrome)

```
User taps "Connect Wallet" (ProfileMenu:130)
  ↓
window.dispatchEvent("showAuthDialog")
  ↓
AuthDialog opens (auth-dialog.tsx:26)
  ↓
User taps NativeGlyphConnectButton
  ↓ [MOBILE BRANCH - line 187-226]
handleGlyphButtonClick() intercepts in capture phase
  ↓
Popup test: window.open("about:blank", "_blank")
  - If blocked → setPopupBlocked(true), prevent click, show error
  - If allowed → close test popup, defer state updates (queueMicrotask)
  ↓
NativeGlyphConnectButton click proceeds (gesture preserved)
  ↓
wagmi connection (may take 5-10 seconds on mobile)
  ↓
AuthDialog:37-46 useEffect detects connection
  ↓
handleAuthSuccess() called
  - storeAuthToken(address) → localStorage [may be cleared on iOS]
  - onAuthSuccess callback
  ↓
Dialog closes after 500ms (auth-dialog.tsx:152) [vs 100ms desktop]
  ↓
Providers:106-127 useEffect syncs wagmi state
  - setAddress(wagmiAddress)
  - setIsConnected(wagmiConnected)
  - if (wagmiAddress && wagmiConnected) setIsAuthenticated(true)
  - localStorage.setItem() [cache update, may fail silently on iOS]
  ↓
ProfileSyncWrapper:17-87 useEffect detects address && isConnected
  - setWalletConnection(address) [immediate]
  - Wait 1000ms settle delay (profile-sync-wrapper.tsx:38)
  - syncProfileWithWallet(address) [after delay]
```

**Key Differences:**
1. **Popup test on mobile** (auth-dialog.tsx:187-226) - Desktop skips
2. **State update deferral** (auth-dialog.tsx:217-221) - `queueMicrotask` on mobile
3. **Dialog close delay** (auth-dialog.tsx:152) - 500ms mobile vs 100ms desktop
4. **Profile sync delay** (profile-sync-wrapper.tsx:38) - 1000ms mobile vs 0ms desktop
5. **localStorage reliability** - iOS may clear, but wagmi is source of truth

---

### Auth State Logic Analysis

**Current Logic (providers.tsx:106-127):**
```typescript
if (wagmiAddress && wagmiConnected) {
  setIsAuthenticated(true)
  localStorage.setItem("arcade_auth_address", wagmiAddress.toLowerCase())
} else if (!wagmiAddress && !wagmiConnected) {
  setIsAuthenticated(false)
}
// If address exists but isConnected is false, keep authenticated state (may be temporary)
```

**Parity Gap #1: Ghost Auth State**
- **Location:** `components/providers.tsx:126`
- **Issue:** Comment says "keep authenticated state if address exists but isConnected is false"
- **Problem:** This can create `isAuthenticated = true` while `address = null` if wagmi flips states
- **Impact:** UI thinks user is authenticated but profile sync doesn't run (address is null)
- **Mobile Risk:** Higher - mobile wagmi state can be flaky during connection

**Fix Needed:**
```typescript
// Should be: isAuthenticated = !!wagmiAddress (address is source of truth)
// Not: isAuthenticated = wagmiAddress && wagmiConnected (both required)
```

---

## B. PROFILE SYNC + PERSISTENCE FLOW

### Desktop Profile Sync

```
ProfileSyncWrapper detects address && isConnected
  ↓
setWalletConnection(address) [immediate]
  ↓
syncProfileWithWallet(address) [immediate, 0ms delay]
  ↓
providers.tsx:syncProfileWithWallet() (line 222-382)
  1. Load from localStorage (line 225-242)
     - loadProfileByAddress(walletAddress)
     - Restore profile, tickets to state
     - Points NOT loaded from localStorage (line 240-241)
  2. Create Supabase client (line 244-245)
     - createClient() → anon browser client
  3. Profile lookup (line 254)
     - profileService.getProfileByWallet(walletAddress)
     - SELECT * FROM profiles WHERE wallet_address = normalized
  4. If profile exists (line 288-335)
     - Merge localStorage + Supabase data
     - setProfile(), setTickets(), setPoints() from Supabase
  5. If profile missing (line 336-369)
     - Retry once after 1000ms (line 256-280) [retry logic]
     - profileService.createProfile()
     - INSERT INTO profiles (wallet_address, username, ape_balance: 0, tickets, ...)
```

**Files:**
- `components/profile-sync-wrapper.tsx:17-87`
- `components/providers.tsx:222-382`
- `lib/supabase/services/profile.service.ts:34-150`

---

### Mobile Profile Sync

```
ProfileSyncWrapper detects address && isConnected
  ↓
setWalletConnection(address) [immediate]
  ↓
Wait 1000ms settle delay (profile-sync-wrapper.tsx:38)
  ↓
syncProfileWithWallet(address) [after delay]
  ↓
Same sequence as desktop BUT:
  - localStorage may be empty on iOS (line 225-242)
  - Profile lookup may return null due to race (line 254)
  - Retry logic handles transient failures (line 256-280)
  - Profile creation uses same defaults (line 349-355)
```

**Parity Gap #2: ProfileService Defaults**
- **Location:** `lib/supabase/services/profile.service.ts:113`
- **Issue:** `ape_balance: params.ape_balance ?? 1000` - defaults to 1000 if not provided
- **Problem:** Providers passes `ape_balance: 0` (line 352), but if any other code path calls `createProfile()` without it, new profiles get 1000 APE
- **Impact:** Inconsistent profile creation across code paths
- **Mobile Risk:** Medium - if profile creation happens in API route (ape-in/submit-result:52-55), defaults apply

**Fix Needed:**
```typescript
ape_balance: params.ape_balance ?? 0  // Should default to 0, not 1000
tickets: params.tickets ?? 0  // Or whatever intended starter tickets
```

---

### Profile Sync Lock Analysis

**Current Implementation (profile-sync-wrapper.tsx:40-64):**
```typescript
syncLockRef.current = true
syncTimeoutRef.current = setTimeout(() => {
  if (address && isConnected && syncLockRef.current) {
    syncProfileWithWallet(address).finally(() => {
      syncLockRef.current = false
      syncTimeoutRef.current = null
    })
  } else {
    syncLockRef.current = false
  }
}, settleDelay)
```

**Parity Gap #3: Lock Release Dependency**
- **Location:** `components/profile-sync-wrapper.tsx:60-64`
- **Issue:** Lock release depends on `.finally()` callback
- **Problem:** If `syncProfileWithWallet()` throws before promise creation, `.finally()` never attaches, lock never releases
- **Impact:** Mobile can get stuck with `syncLockRef.current = true`, preventing future syncs
- **Mobile Risk:** High - network failures on mobile more likely

**Fix Needed:**
```typescript
// Wrap in try/finally to ensure lock always releases
try {
  await syncProfileWithWallet(address)
} finally {
  syncLockRef.current = false
  syncTimeoutRef.current = null
}
```

---

## C. SUPABASE CONNECTIVITY + CONFIG

### Client Creation (Desktop vs Mobile)

**Implementation:** `lib/supabase/client.ts:45-116`

**Analysis:**
- ✅ Same code path for both desktop and mobile
- ✅ Uses `createBrowserClient` from `@supabase/ssr`
- ✅ Environment variables checked at build time (`NEXT_PUBLIC_*`)
- ✅ Client instance cached (singleton pattern)

**Potential Issues:**
1. **Cookie/Session Storage:** `@supabase/ssr` uses browser storage for session tokens
   - iOS Safari/Chrome may clear storage more aggressively
   - No explicit cookie configuration found
   - RLS policies may block anon queries if session missing

2. **Network Failures:** Mobile networks more unreliable
   - Profile service swallows network errors (profile.service.ts:56-85)
   - Returns `null` on failure, which triggers profile creation
   - Could create duplicate profiles if retry succeeds later

**Parity Gap #4: Error Handling**
- **Location:** `lib/supabase/services/profile.service.ts:57-72, 76-84`
- **Issue:** Network errors return `null` silently
- **Problem:** On mobile, transient network failures look like "profile doesn't exist"
- **Impact:** May create duplicate profiles or skip profile sync
- **Mobile Risk:** High - mobile networks more prone to timeouts

---

## D. SCORES, POINTS, LEADERBOARDS

### Desktop Points Flow

```
Game completes (e.g., Cryptoku)
  ↓
POST /api/cryptoku/submit-result
  Body: { playerAddress, mode, runId, timeSeconds, ... }
  ↓
submit-result/route.ts:48-305
  1. Validate input (line 63-69)
  2. Get profile (line 133)
     - profileService.getProfileByWallet(normalizedAddress)
     - Returns profile.id (user_id)
  3. Create admin client (line 159-168)
     - createAdminClient() → uses SUPABASE_SERVICE_ROLE_KEY
  4. Idempotency check (line 171-188)
     - SELECT id FROM cryptoku_leaderboard WHERE run_id = runId
  5. Add leaderboard entry (line 192-216)
     - CryptokuLeaderboardService.addEntry() → RPC: add_cryptoku_leaderboard_entry()
  6. Award points (line 226-279)
     - adminClient.rpc('update_user_balance', { p_points_change: pointsEarned })
```

**Files:**
- `app/api/cryptoku/submit-result/route.ts:48-305`
- `lib/supabase/admin.ts:7-48`

---

### Mobile Points Flow

```
Same API route BUT:
  - Profile lookup (line 133) may fail if profile sync incomplete
  - Returns 404: "Profile not found" (line 137-140)
  - No points awarded, no leaderboard entry
```

**Parity Gap #5: Profile Lookup in API Routes**
- **Location:** `app/api/cryptoku/submit-result/route.ts:133-141`
- **Issue:** Returns 404 if profile not found
- **Problem:** On mobile, profile sync may not complete before game submission
- **Impact:** Game submissions fail with 404, no points, no leaderboard
- **Mobile Risk:** High - timing race between profile sync and game completion

**Fix Needed:**
- Add retry logic in API route (wait 1-2s, retry profile lookup)
- Or: Create profile in API route if missing (ape-in/submit-result:50-60 does this)

---

### Client-Side Points Updates

**Current Implementation (providers.tsx:510-566):**
```typescript
const addPoints = useCallback(async (amount: number) => {
  setPoints((prev) => prev + amount)  // Optimistic update
  if (isAuthenticated && address) {
    // Async sync to Supabase
    const profile = await profileService.getProfileByWallet(address)
    if (profile) {
      await profileService.updateBalance(profile.id, 0, 0, amount)  // Anon RPC
    }
  }
}, [isAuthenticated, address])
```

**Parity Gap #6: Client-Side Points Updates**
- **Location:** `components/providers.tsx:510-566`
- **Issue:** Uses anon client RPC `update_user_balance`
- **Problem:** RLS policies may block anon RPC calls on mobile
- **Impact:** Points update locally but not in Supabase
- **Mobile Risk:** Medium - RLS may be stricter or network timing different

**Note:** Game submissions use admin client (server-side), which is safe. Client-side `addPoints()` is only for manual updates (referrals, etc.).

---

## PARITY GAPS SUMMARY TABLE

| # | Gap | File + Line | Desktop Impact | Mobile Impact | Risk |
|---|-----|-------------|----------------|---------------|------|
| 1 | Ghost auth state (`isAuthenticated = true` when `address = null`) | `providers.tsx:126` | Low | High | High |
| 2 | ProfileService defaults (`ape_balance` defaults to 1000) | `profile.service.ts:113` | Low | Medium | Medium |
| 3 | Profile sync lock may not release on error | `profile-sync-wrapper.tsx:60-64` | Low | High | High |
| 4 | Network errors return `null` (looks like missing profile) | `profile.service.ts:57-84` | Low | High | High |
| 5 | API route returns 404 if profile missing (no retry) | `submit-result/route.ts:133-141` | Low | High | High |
| 6 | Client-side points updates use anon RPC (RLS risk) | `providers.tsx:510-566` | Low | Medium | Medium |

---

## PRIORITIZED FIX PLAN

### Phase 1: Critical Mobile Blockers (High Risk, High Impact)

#### Fix 1.1: Tighten `isAuthenticated` Logic
**File:** `components/providers.tsx:106-127`

**Change:**
```typescript
// Current:
if (wagmiAddress && wagmiConnected) {
  setIsAuthenticated(true)
} else if (!wagmiAddress && !wagmiConnected) {
  setIsAuthenticated(false)
}
// If address exists but isConnected is false, keep authenticated state

// Fixed:
if (wagmiAddress) {  // Address is source of truth
  setIsAuthenticated(true)
  if (typeof window !== "undefined") {
    window.localStorage.setItem("arcade_auth_address", wagmiAddress.toLowerCase().trim())
  }
} else {
  setIsAuthenticated(false)
}
// isConnected is informational, not required for auth state
```

**Why:** Prevents ghost auth states where `isAuthenticated = true` but `address = null`

**Risk:** Low - Desktop behavior unchanged (address always exists when connected)

**Test:**
- Desktop: Connect wallet → Verify `isAuthenticated = true` when address exists
- Mobile: Connect wallet → Verify no ghost auth state during connection

---

#### Fix 1.2: Ensure Profile Sync Lock Always Releases
**File:** `components/profile-sync-wrapper.tsx:48-68`

**Change:**
```typescript
// Current:
syncProfileWithWallet(address).finally(() => {
  syncLockRef.current = false
  syncTimeoutRef.current = null
})

// Fixed:
try {
  await syncProfileWithWallet(address)
} catch (error) {
  console.error("[MOBILE-AUTH] Profile sync error:", error)
  // Don't throw - allow UI to continue
} finally {
  syncLockRef.current = false
  syncTimeoutRef.current = null
}
```

**Why:** Ensures lock always releases even if sync throws before promise creation

**Risk:** Low - Only adds error handling, doesn't change logic

**Test:**
- Mobile: Simulate network failure during profile sync → Verify lock releases
- Desktop: Normal sync → Verify no regression

---

#### Fix 1.3: Add Profile Retry in API Routes
**File:** `app/api/cryptoku/submit-result/route.ts:133-141`

**Change:**
```typescript
// Current:
const profile = await profileService.getProfileByWallet(normalizedAddress)
if (!profile) {
  return NextResponse.json({ error: "Profile not found" }, { status: 404 })
}

// Fixed:
let profile = await profileService.getProfileByWallet(normalizedAddress)
if (!profile) {
  // Retry once after 1s (mobile profile sync may be in progress)
  await new Promise(resolve => setTimeout(resolve, 1000))
  profile = await profileService.getProfileByWallet(normalizedAddress)
  
  if (!profile) {
    // Still not found - create profile (like ape-in/submit-result does)
    profile = await profileService.createProfile({
      wallet_address: normalizedAddress,
      username: `Player${normalizedAddress.slice(2, 8)}`,
      ape_balance: 0,
      tickets: 0,
    })
    
    if (!profile) {
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }
  }
}
```

**Why:** Handles mobile race condition where profile sync hasn't completed

**Risk:** Low - Desktop profile sync is fast, retry rarely triggers

**Test:**
- Mobile: Submit game immediately after connect → Verify profile created/retrieved
- Desktop: Normal submission → Verify no regression

---

### Phase 2: Data Consistency Fixes (Medium Risk, Medium Impact)

#### Fix 2.1: Fix ProfileService Defaults
**File:** `lib/supabase/services/profile.service.ts:110-121`

**Change:**
```typescript
// Current:
ape_balance: params.ape_balance ?? 1000,
tickets: params.tickets ?? 5,

// Fixed:
ape_balance: params.ape_balance ?? 0,  // Default to 0, not 1000
tickets: params.tickets ?? 0,  // Or 5 if that's intended starter amount
```

**Why:** Prevents inconsistent profile creation across code paths

**Risk:** Low - Only changes defaults, Providers already passes explicit values

**Test:**
- Create profile via API route (ape-in/submit-result) → Verify `ape_balance = 0`
- Create profile via Providers → Verify same defaults

---

#### Fix 2.2: Improve Network Error Handling
**File:** `lib/supabase/services/profile.service.ts:57-84`

**Change:**
```typescript
// Current: Returns null on all errors (including network)

// Fixed: Distinguish network errors from "profile not found"
if (error) {
  if (error.code === "PGRST116") {
    return null  // Profile doesn't exist (expected)
  }
  
  // Network errors - log but don't treat as "profile missing"
  if (error.message?.includes("Failed to fetch") || error.message?.includes("ERR_NAME_NOT_RESOLVED")) {
    console.error("[MOBILE-AUTH] Network error fetching profile:", error)
    throw error  // Re-throw to trigger retry in calling code
  }
  
  // Other errors - log and return null
  console.warn("[MOBILE-AUTH] ProfileService: Error fetching profile", { code: error.code, message: error.message })
  return null
}
```

**Why:** Allows retry logic to distinguish network failures from missing profiles

**Risk:** Medium - Changes error handling, may need adjustments in calling code

**Test:**
- Mobile: Simulate network failure → Verify error logged, retry triggered
- Desktop: Normal lookup → Verify no regression

---

### Phase 3: Client-Side Points Safety (Low Risk, Low Impact)

#### Fix 3.1: Add Fallback for Client-Side Points Updates
**File:** `components/providers.tsx:510-566`

**Change:**
```typescript
// Current: Uses anon RPC, may fail silently

// Fixed: Add error handling and fallback
const success = await profileService.updateBalance(profile.id, 0, 0, amount)
if (!success) {
  logger.warn("⚠️ Failed to sync points to Supabase (anon RPC may be blocked)")
  // Points updated locally, will sync on next profile load
}
```

**Why:** Makes failures visible, doesn't break UI

**Risk:** Low - Only adds logging, doesn't change behavior

**Test:**
- Mobile: Trigger `addPoints()` → Verify error logged if RPC fails
- Desktop: Normal points update → Verify no regression

**Note:** This is low priority - game submissions use admin client (server-side), which is safe.

---

## TEST CHECKLISTS

### Phase 1 Tests

#### Test 1.1: Ghost Auth State Prevention
**Desktop:**
- [ ] Connect wallet → Verify `isAuthenticated = true` only when `address` exists
- [ ] Disconnect wallet → Verify `isAuthenticated = false` immediately

**Mobile (iOS Chrome):**
- [ ] Connect wallet → Verify no `isAuthenticated = true` when `address = null`
- [ ] During connection (address appears but isConnected flaky) → Verify auth state consistent
- [ ] Disconnect wallet → Verify `isAuthenticated = false` immediately

---

#### Test 1.2: Profile Sync Lock Release
**Desktop:**
- [ ] Connect wallet → Verify profile sync completes
- [ ] Disconnect and reconnect → Verify second sync runs (lock released)

**Mobile (iOS Chrome):**
- [ ] Connect wallet → Verify profile sync completes
- [ ] Simulate network failure (airplane mode during sync) → Verify lock releases
- [ ] Reconnect → Verify second sync runs (lock released)

---

#### Test 1.3: API Route Profile Retry
**Desktop:**
- [ ] Connect wallet → Play game → Submit result → Verify success
- [ ] Submit result immediately after connect → Verify profile found/created

**Mobile (iOS Chrome):**
- [ ] Connect wallet → Play game immediately → Submit result → Verify success (profile created/retrieved)
- [ ] Submit result before profile sync completes → Verify retry works, profile created
- [ ] Submit duplicate run_id → Verify idempotency (no double points)

---

### Phase 2 Tests

#### Test 2.1: ProfileService Defaults
**Desktop:**
- [ ] Create profile via Providers → Verify `ape_balance = 0`
- [ ] Create profile via API route → Verify `ape_balance = 0`

**Mobile (iOS Chrome):**
- [ ] Create profile via Providers → Verify `ape_balance = 0`
- [ ] Create profile via API route (ape-in/submit-result) → Verify `ape_balance = 0`

---

#### Test 2.2: Network Error Handling
**Desktop:**
- [ ] Normal profile lookup → Verify works
- [ ] Simulate network failure → Verify error logged (if implemented)

**Mobile (iOS Chrome):**
- [ ] Normal profile lookup → Verify works
- [ ] Simulate network failure (airplane mode) → Verify error logged, retry triggered
- [ ] Network recovery → Verify profile sync succeeds

---

### Phase 3 Tests

#### Test 3.1: Client-Side Points Updates
**Desktop:**
- [ ] Trigger referral → Verify points update locally and in Supabase
- [ ] Check database → Verify `points` field updated

**Mobile (iOS Chrome):**
- [ ] Trigger referral → Verify points update locally
- [ ] Check console → Verify error logged if RPC fails (anon RLS block)
- [ ] Reload page → Verify points loaded from Supabase (source of truth)

---

## FLOW DIAGRAMS

### Desktop: Connect → Profile → Play → Submit → Leaderboard

```
1. CONNECT
   User clicks "Connect" → AuthDialog → NativeGlyphConnectButton
   → wagmi connects → Providers.setIsAuthenticated(true)
   → ProfileSyncWrapper triggers syncProfileWithWallet() [0ms delay]

2. PROFILE SYNC
   syncProfileWithWallet() → getProfileByWallet() → Profile found
   → setProfile(), setPoints(), setTickets() from Supabase
   → localStorage updated (cache)

3. PLAY GAME
   Game uses playerAddress from Providers
   → Game completes → Calculate score

4. SUBMIT RESULT
   POST /api/cryptoku/submit-result
   → getProfileByWallet() → Profile found [immediate]
   → Admin client → Add leaderboard entry
   → Admin RPC → update_user_balance(pointsEarned)
   → Return success

5. LEADERBOARD UPDATE
   GET /api/cryptoku/leaderboard
   → CryptokuLeaderboardService.getLeaderboard()
   → RPC: get_cryptoku_leaderboard()
   → Return entries with updated scores
```

---

### Mobile: Connect → Profile → Play → Submit → Leaderboard

```
1. CONNECT
   User taps "Connect" → AuthDialog → Popup test → NativeGlyphConnectButton
   → wagmi connects [5-10s delay] → Providers.setIsAuthenticated(true)
   → ProfileSyncWrapper triggers syncProfileWithWallet() [1000ms settle delay]

2. PROFILE SYNC
   syncProfileWithWallet() → getProfileByWallet() → Profile found/created
   → Retry if null (1000ms delay) → setProfile(), setPoints(), setTickets()
   → localStorage updated [may be cleared on iOS]

3. PLAY GAME
   Game uses playerAddress from Providers
   → Game completes → Calculate score

4. SUBMIT RESULT
   POST /api/cryptoku/submit-result
   → getProfileByWallet() → Profile found [or retry/create]
   → Admin client → Add leaderboard entry
   → Admin RPC → update_user_balance(pointsEarned)
   → Return success

5. LEADERBOARD UPDATE
   GET /api/cryptoku/leaderboard
   → Same as desktop (read-only, low risk)
```

**Key Differences:**
- Mobile has 1000ms settle delay before profile sync
- Mobile has retry logic in profile lookup
- Mobile API route may need to create profile if missing
- Mobile localStorage may be cleared (wagmi is source of truth)

---

## CONCLUSION

**Desktop Status:** ✅ Stable - all flows working correctly

**Mobile Status:** ⚠️ Needs Phase 1 fixes for parity

**Priority:**
1. **Phase 1 (Critical):** Fix ghost auth state, lock release, API route retry
2. **Phase 2 (Important):** Fix defaults, improve error handling
3. **Phase 3 (Nice-to-have):** Client-side points safety

**Estimated Impact:**
- Phase 1 fixes should resolve 80% of mobile issues
- Phase 2 fixes prevent data inconsistencies
- Phase 3 fixes improve visibility but don't block functionality

**Risk Assessment:**
- All fixes are low-risk for desktop (minimal changes, same logic paths)
- Mobile improvements are additive (retries, error handling)
- No breaking changes to existing flows

---

**END OF AUDIT REPORT**

**Next Steps:**
1. Review audit findings
2. Prioritize Phase 1 fixes
3. Implement fixes one at a time with testing
4. Monitor production logs for improvements
