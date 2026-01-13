# Wallet/Auth/Profile System Audit Report

**Date:** 2024  
**Scope:** Complete audit of wallet connection, authentication, and profile management system  
**Status:** ✅ Audit Complete - No Refactoring Performed

---

## I. Inventory (Files/Modules)

### Auth Provider Setup
- **File:** `app/providers.tsx`
  - **Function:** `Providers` (default export)
  - **Purpose:** Root provider wrapper that sets up Wagmi + Glyph wallet providers
  - **Key exports:**
    - `wagmiConfig` - Wagmi configuration with ApeChain
    - `QueryClient` - React Query client for Wagmi
  - **Providers configured:**
    - `QueryClientProvider` (from `@tanstack/react-query`)
    - `WagmiProvider` (from `wagmi`)
    - `GlyphWalletProvider` (from `@use-glyph/sdk-react`)

### Wallet Provider Setup
- **File:** `lib/wagmi-chains.ts`
  - **Exports:** `apeChainMainnet`, `apeChainTestnet` chain configurations
  - **Chain ID:** 33139 (ApeChain Mainnet)
- **File:** `app/providers.tsx`
  - **Wagmi Config:** Uses `createConfig` with ApeChain and HTTP transport
  - **Glyph Provider:** Wraps app with `askForSignature={true}`

### UI Components (Modal/Toast/Dropdown)

#### Auth Dialog
- **File:** `components/auth-dialog.tsx`
  - **Component:** `AuthDialog`
  - **Props:** `open`, `onOpenChange`, `onAuthSuccess?`
  - **Purpose:** Wallet connection modal using Glyph's `NativeGlyphConnectButton`
  - **Key features:**
    - Monitors wagmi `useAccount()` hook for connection state
    - Calls `onAuthSuccess` callback when wallet connects
    - Stores auth token via `storeAuthToken(address)`
    - Supports "Continue as Guest" option

#### Global Auth Dialog
- **File:** `components/global-auth-dialog.tsx`
  - **Component:** `GlobalAuthDialog`
  - **Purpose:** Global wrapper that listens for `showAuthDialog` window events
  - **Location:** Rendered in `app/layout.tsx` as global component
  - **Integration:** Calls `handleAuthSuccess` from `useArcade()` context

#### Profile Menu (Dropdown)
- **File:** `components/profile-menu.tsx`
  - **Component:** `ProfileMenu`
  - **Purpose:** Profile dropdown menu in topbar
  - **Features:**
    - Shows wallet connection status
    - Username/avatar editing (when connected)
    - Connect/Disconnect/Logout buttons
    - Triggers `showAuthDialog` event when "Connect Wallet" clicked
  - **Location:** Used in `components/topbar.tsx`

#### Topbar
- **File:** `components/topbar.tsx`
  - **Component:** `Topbar` (default export)
  - **Purpose:** Global navigation bar
  - **Contains:** Points display, tickets display, ProfileMenu component

### Hooks

#### useSupabaseAuth
- **File:** `hooks/use-supabase-auth.ts`
  - **Purpose:** Supabase authentication hook (currently unused in main flow)
  - **Functions:** `signIn`, `signUp`, `signOut`
  - **Note:** App uses wallet-based auth, not Supabase auth

#### useProfileSync
- **File:** `hooks/use-profile-sync.ts`
  - **Purpose:** Profile synchronization hook (defined but appears unused)
  - **Uses:** `useAccount` from wagmi, `useArcade` context
  - **Note:** Profile sync happens in `ProfileSyncWrapper` instead

### API Routes

#### Cryptoku Submit Result
- **File:** `app/api/cryptoku/submit-result/route.ts`
  - **Method:** POST
  - **Purpose:** Submit Cryptoku game results
  - **Auth:** Uses `playerAddress` from request body (wallet address)
  - **Key fields:** `playerAddress`, `runId`, `mode`, `timeSeconds`, `hintsUsed`, `errors`
  - **Database:** Creates leaderboard entries, updates profile points via RPC

#### Ape In Submit Result
- **File:** `app/api/ape-in/submit-result/route.ts`
  - **Method:** POST
  - **Purpose:** Submit Ape In game results
  - **Auth:** Uses `playerAddress` from request body
  - **Key fields:** `playerAddress`, `runId`, `mode`, `score`, `durationSeconds`, `result`

#### Other API Routes
- `app/api/cryptoku/leaderboard/route.ts` - Fetch leaderboard data
- `app/api/cryptoku/hints/*/route.ts` - Hint economy management
- `app/api/ape-in/free-plays/*/route.ts` - Free play management
- `app/api/ape-in/game/*/route.ts` - Game session management

### Middleware
- **Status:** ❌ No middleware.ts file found
- **Note:** Authentication is handled client-side via wallet connection

### Supabase Clients

#### Browser Client
- **File:** `lib/supabase/client.ts`
  - **Function:** `createClient()` - Creates browser-side Supabase client
  - **Uses:** `@supabase/ssr` package
  - **Configuration:** Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **Guard:** `hasSupabaseConfig()` validates env vars before creating client
  - **Fallback:** Creates dummy client if not configured (prevents crashes)

#### Admin Client
- **File:** `lib/supabase/admin.ts` (referenced but not read)
  - **Usage:** Used in API routes for admin operations (bypasses RLS)
  - **Called from:** `app/api/cryptoku/submit-result/route.ts`

#### Server Client
- **File:** `lib/supabase/server.ts` (referenced but not read)
  - **Usage:** Server-side Supabase client for API routes

### Session Utilities

#### Game Session
- **File:** `lib/game-session.ts`
  - **Type:** `GameSession`
  - **Storage:** `localStorage` and `sessionStorage` (key: `crypto_rabbit_session`)
  - **Functions:**
    - `createGameSession()` - Creates new session
    - `storeGameSession()` - Saves to storage
    - `getGameSession()` - Retrieves from storage (24hr expiry)
    - `clearGameSession()` - Clears session
    - `syncGamePoints()` - Syncs points from external games
  - **Fields:** `sessionId`, `userId`, `username`, `address`, `thirdwebClientId`, `tickets`, `points`, `timestamp`, `avatar`

#### Arcade Session
- **File:** `lib/arcade-session.ts`
  - **Type:** `ArcadeSession`
  - **Storage:** `localStorage` and `sessionStorage` (key: `crypto_rabbit_session`)
  - **Functions:** `createArcadeSession()`, `getArcadeSession()`, `updateArcadeSession()`, `clearArcadeSession()`
  - **Note:** Similar to `GameSession`, appears to be legacy/alternative implementation

#### Auth Token
- **File:** `lib/auth.ts`
  - **Functions:**
    - `storeAuthToken(address)` - Stores wallet address as token (key: `arcade_auth_address`)
    - `getAuthToken()` - Retrieves stored address
    - `clearAuthToken()` - Clears stored address
  - **Type:** `AuthResult` interface

#### Profile Storage
- **File:** `lib/profile-storage.ts`
  - **Purpose:** LocalStorage-based profile persistence keyed by wallet address
  - **Storage key format:** `arcade_profile_{wallet_address}`
  - **Functions:**
    - `saveProfileByAddress(address, profile)`
    - `loadProfileByAddress(address)`
    - `clearProfileByAddress(address)`
  - **Type:** `StoredUserProfile` interface

---

## II. Global Entry Points

### App Layout
- **File:** `app/layout.tsx`
- **Provider Hierarchy:**
  ```
  <ErrorBoundary>
    <Providers>                    {/* Wagmi + Glyph providers */}
      <ArcadeProviders>            {/* Arcade context */}
        <ProfileSyncWrapper>       {/* Wallet connection sync */}
          <Sidebar />
          <Topbar />
          <main>{children}</main>
          <MobileNav />
          <Toaster />
          <GlobalAuthDialog />     {/* Global auth modal */}
        </ProfileSyncWrapper>
      </ArcadeProviders>
    </Providers>
  </ErrorBoundary>
  ```

### Navigation/Header Components
- **Topbar:** `components/topbar.tsx`
  - Contains `ProfileMenu` component
  - Displays points and tickets from `useArcade()` context
- **ProfileMenu:** `components/profile-menu.tsx`
  - Triggered from Topbar
  - Shows "Connect Wallet" or "Profile" button
  - Opens dialog with profile editing interface

### Auth Dialog Usage
- **Global:** `components/global-auth-dialog.tsx` (always rendered in layout)
- **Arcade Hub:** `features/arcade/arcade-hub.tsx` (local state for homepage)
- **Triggered by:**
  1. Window event: `showAuthDialog` (dispatched from ProfileMenu)
  2. ArcadeHub mounts (always shows on initial load)
  3. ProfileMenu "Connect Wallet" button

---

## III. Flow Diagrams

### A) Fresh Login Flow

1. **User clicks "Connect Wallet" button**
   - Location: `components/profile-menu.tsx` → `handleConnectClick()`
   - Action: Dispatches `window.dispatchEvent(new CustomEvent("showAuthDialog"))`

2. **GlobalAuthDialog receives event**
   - Location: `components/global-auth-dialog.tsx`
   - Action: Sets `showAuthDialog` state to `true`

3. **AuthDialog opens**
   - Location: `components/auth-dialog.tsx`
   - UI: Shows `NativeGlyphConnectButton` component

4. **User connects wallet via Glyph**
   - Glyph SDK handles wallet connection
   - Wagmi `useAccount()` hook detects connection
   - `address` and `isConnected` become available

5. **AuthDialog detects connection**
   - Location: `components/auth-dialog.tsx` → `useEffect` hook
   - Trigger: `open && address && isConnected && !hasProcessedAuth`
   - Action: Calls `handleAuthSuccess()` internal function

6. **handleAuthSuccess processes auth**
   - Creates `AuthResult` object:
     ```typescript
     {
       isNewUser: false,
       token: address,  // Address used as token
       type: "siwe",
       walletAddress: address
     }
     ```
   - Stores token: `storeAuthToken(address)` → localStorage key `arcade_auth_address`
   - Calls `onAuthSuccess(result)` callback

7. **GlobalAuthDialog receives callback**
   - Location: `components/global-auth-dialog.tsx`
   - Calls: `handleAuthSuccess` from `useArcade()` context

8. **ArcadeContext.handleAuthSuccess**
   - Location: `components/providers.tsx` → `handleAuthSuccess()` function
   - Actions:
     - Sets `isAuthenticated = true`
     - Sets `authToken = result.token`
     - Sets `address = result.walletAddress`
     - Sets `isConnected = true`
     - Calls `syncProfileWithWallet(result.walletAddress)`

9. **ProfileSyncWrapper detects connection**
   - Location: `components/profile-sync-wrapper.tsx`
   - Trigger: `useAccount()` hook detects `address && isConnected`
   - Actions:
     - Calls `setWalletConnection(address)`
     - Calls `syncProfileWithWallet(address)`

10. **syncProfileWithWallet loads/creates profile**
    - Location: `components/providers.tsx` → `syncProfileWithWallet()` function
    - Steps:
      a. Loads profile from localStorage via `loadProfileByAddress(address)`
      b. Queries Supabase for profile via `ProfileService.getProfileByWallet(address)`
      c. If exists: Merges localStorage + Supabase data, updates state
      d. If not exists: Creates new profile via `ProfileService.createProfile()`
      e. Updates local state: `profile`, `tickets`, `points`

11. **Game session created**
    - Location: `components/providers.tsx` → `useEffect` hook
    - Trigger: When `isConnected`, `address`, `tickets`, `points` change
    - Action: `storeGameSession()` saves session to localStorage

12. **Auth dialog closes**
    - `onOpenChange(false)` called
    - Dialog state resets

### B) Returning Session Flow

1. **Page loads**
   - `app/layout.tsx` renders providers
   - `ProfileSyncWrapper` mounts

2. **ArcadeContext initializes**
   - Location: `components/providers.tsx` → `useEffect` (initial mount)
   - Action: `getGameSession()` loads session from localStorage
   - If session exists:
     - Restores `tickets`, `points`, `username`
     - Sets `isConnected = true`, `address = session.address`

3. **ProfileSyncWrapper checks wagmi connection**
   - Location: `components/profile-sync-wrapper.tsx`
   - Uses: `useAccount()` from wagmi
   - If `address && isConnected` from wagmi:
     - Calls `setWalletConnection(address)`
     - Calls `syncProfileWithWallet(address)`
   - If no wagmi connection:
     - Does NOT clear connection (preserves authenticated state)
     - Only clears if `!isAuthenticated`

4. **Profile sync runs**
   - Same as step 10 in Fresh Login Flow
   - Loads from localStorage first, then syncs with Supabase

5. **Game session persists**
   - Session remains in localStorage
   - Updated whenever `tickets`, `points`, or `address` changes

**Note:** There is NO automatic reconnection. Users must manually connect wallet each session. Session data persists but wallet connection requires user action.

### C) Logout Flow

1. **User clicks "Logout" button**
   - Location: `components/profile-menu.tsx` → Logout button handler
   - Action: Calls `disconnectWallet()` from wagmi, then `logout()` from context

2. **Wagmi disconnect**
   - Location: `components/profile-menu.tsx`
   - Uses: `useDisconnect()` hook from wagmi
   - Action: Disconnects wallet from wagmi state

3. **ArcadeContext.logout**
   - Location: `components/providers.tsx` → `logout()` function
   - Actions:
     - Sets `isAuthenticated = false`
     - Sets `authToken = null`
     - Sets `address = null`
     - Sets `isConnected = false`
     - Sets `apeBalance = "0.0000"`
     - Calls `clearAuthToken()` → Removes `arcade_auth_address` from localStorage
     - Calls `clearGameSession()` → Removes `crypto_rabbit_session` from localStorage/sessionStorage

4. **ProfileMenu closes**
   - Dialog state: `setOpen(false)`

5. **ProfileSyncWrapper detects disconnect**
   - Location: `components/profile-sync-wrapper.tsx`
   - Trigger: `useAccount()` returns `!address && !isConnected`
   - Action: Only clears if `!isAuthenticated` (already cleared by logout)

**Note:** Profile data in localStorage (`arcade_profile_{address}`) is NOT cleared on logout. This allows profile to persist for next login with same wallet.

### D) Wallet Linking Flow

**Status:** ❌ **NOT IMPLEMENTED**

- No MetaMask linking functionality found
- No multi-wallet support
- Only single wallet (Glyph) connection supported
- Wallet address from wagmi `useAccount()` is the primary/only address

**Evidence:**
- `ProfileService` uses single `wallet_address` field
- No linked_wallets table or field in database schema
- No UI for linking additional wallets

### E) Avatar/PFP Selection Flow

**Status:** ⚠️ **PARTIALLY IMPLEMENTED - NO NFT INTEGRATION**

1. **Avatar selection in ProfileMenu**
   - Location: `components/profile-menu.tsx`
   - Options:
     - Preset geometric avatars (3 hardcoded options)
     - File upload (converted to base64)
   - **NOT IMPLEMENTED:** ApeChain NFT selection

2. **Avatar storage**
   - Stored as base64 string in profile
   - Saved to localStorage via `saveProfileByAddress()`
   - Synced to Supabase `profiles.avatar_url` field

3. **Avatar display**
   - Used in ProfileMenu dropdown
   - Used in Topbar ProfileMenu button
   - Stored in GameSession for cross-game access

**NFT Integration Status:**
- `adapters/nft.adapter.ts` exists but only returns mock data
- No NFT fetching from ApeChain
- No NFT selection UI in ProfileMenu
- No integration with ApeChain NFT contracts

---

## IV. Data Contracts

### User Object (from Supabase profiles table)

**Table:** `profiles`  
**Primary Key:** `id` (UUID)  
**Unique Index:** `wallet_address` (TEXT, lowercased)

**Fields Used:**
```typescript
{
  id: string                    // UUID primary key
  wallet_address: string        // Lowercased wallet address (UNIQUE)
  username: string | null       // Optional custom username
  avatar_url: string | null     // Avatar URL (base64 or URL)
  ape_balance: number          // APE token balance (default: 1000)
  tickets: number              // Game tickets (default: 5)
  points: number               // Game points (default: 0)
  referral_code: string | null // Unique referral code
  referral_count: number       // Number of referrals
  referral_earnings: number    // Earnings from referrals
  total_games_played: number   // Game statistics
  total_wins: number
  total_losses: number
  win_streak: number
  best_win_streak: number
  total_playtime: number       // Seconds
  created_at: string           // ISO timestamp
  updated_at: string           // ISO timestamp
  last_login: string | null    // ISO timestamp
}
```

**Access Pattern:**
- Primary lookup: `getProfileByWallet(walletAddress)` - queries by `wallet_address`
- Secondary lookup: `getProfile(userId)` - queries by `id`

### Profile Object (Local State)

**Type:** `UserProfile` (from `components/providers.tsx`)

```typescript
{
  username: string
  avatar: string
  referralCode: string
  referralCount: number
  referralEarnings: number
  joinedAt: Date
  stats: {
    gamesPlayed: number
    totalScore: number
    achievements: string[]
  }
}
```

**Storage:**
- **React State:** `components/providers.tsx` → `profile` state
- **LocalStorage:** `arcade_profile_{wallet_address}` (via `lib/profile-storage.ts`)
- **Supabase:** `profiles` table (synced on connect/update)

### Wallet Object

**Status:** ❌ **No dedicated wallet object**

**Wallet Address Storage:**
- **React State:** `components/providers.tsx` → `address` state (string | null)
- **Wagmi:** `useAccount().address` (from wagmi hook)
- **LocalStorage:** `arcade_auth_address` (via `lib/auth.ts`)
- **Game Session:** `GameSession.address` field

**Primary Wallet:**
- Single wallet address from Glyph connection
- Retrieved via `useAccount()` hook from wagmi
- No distinction between "primary" and "linked" wallets

**Linked Wallets:**
- ❌ Not implemented
- No database field for linked wallets
- No UI for managing multiple wallets

### Storage Locations

#### LocalStorage Keys

1. **`arcade_auth_address`**
   - **Purpose:** Stores authenticated wallet address
   - **Set by:** `lib/auth.ts` → `storeAuthToken(address)`
   - **Cleared by:** `lib/auth.ts` → `clearAuthToken()` (on logout)
   - **Used by:** Not actively read (stored but not used for restore)

2. **`crypto_rabbit_session`**
   - **Purpose:** Game session for cross-game access
   - **Set by:** `lib/game-session.ts` → `storeGameSession()`
   - **Cleared by:** `lib/game-session.ts` → `clearGameSession()` (on logout)
   - **Also stored in:** `sessionStorage` (same key)
   - **Fields:** `sessionId`, `userId`, `username`, `address`, `thirdwebClientId`, `tickets`, `points`, `timestamp`, `avatar`
   - **Expiry:** 24 hours (checked in `getGameSession()`)

3. **`arcade_profile_{wallet_address}`**
   - **Purpose:** Profile persistence by wallet address
   - **Set by:** `lib/profile-storage.ts` → `saveProfileByAddress()`
   - **Cleared by:** Manual `clearProfileByAddress()` (not called on logout)
   - **Fields:** `username`, `avatar`, `referralCode`, `referralCount`, `referralEarnings`, `joinedAt`, `points`, `tickets`, `stats`

4. **`crypto_rabbit_point_updates`**
   - **Purpose:** Pending point updates from external games
   - **Set by:** `lib/game-session.ts` → `syncGamePoints()`
   - **Cleared by:** `lib/game-session.ts` → `clearPointUpdates()`

#### Database Tables

1. **`profiles`** (Supabase)
   - **Primary Key:** `id` (UUID)
   - **Unique:** `wallet_address` (TEXT, indexed)
   - **Unique:** `username` (TEXT, nullable)
   - **Unique:** `referral_code` (TEXT, nullable)
   - **Access:** Via `ProfileService` class

2. **`game_sessions`** (Supabase)
   - **Primary Key:** `id` (UUID)
   - **Foreign Key:** `user_id` → `profiles.id`
   - **Fields:** `game_type`, `game_mode`, `duration`, `result`, `score`, `points_earned`, `run_id` (for idempotency)
   - **Access:** Via `GameService` class

3. **`cryptoku_leaderboard`** (Supabase)
   - **Fields:** `run_id` (unique), `address`, `mode`, `score`, `time_seconds`, `hints_used`, `errors`
   - **Access:** Via `CryptokuLeaderboardService`

4. **`ape_in_leaderboard`** (Supabase) - Referenced but not fully audited

#### Cookies
- **Status:** ❌ No cookies used for auth/session
- All storage is localStorage/sessionStorage

### Run ID / Arcade Session ID Generation

#### Game Session ID
- **Location:** `lib/game-session.ts` → `generateSessionId()`
- **Format:** `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
- **Example:** `session_1704067200000_k3j8h2f9x`

#### Run ID (for game submissions)
- **Location:** `features/games/cryptoku/components/logic/playerStats.ts` → `startGameSession()`
- **Format:** `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
- **Example:** `session-1704067200000-k3j8h2f9`
- **Used for:**
  - Cryptoku game submissions (`/api/cryptoku/submit-result`)
  - Ape In game submissions (`/api/ape-in/submit-result`)
  - Idempotency checks (prevents duplicate submissions)

#### Arcade Session ID
- **Location:** `lib/arcade-session.ts` → `createArcadeSession()`
- **Format:** `crypto.randomUUID()` (standard UUID v4)
- **Example:** `550e8400-e29b-41d4-a716-446655440000`

---

## V. Coupling + Risks

### What Will Break If We Change the Wallet UI

#### High Risk Areas

1. **ProfileMenu component**
   - **Dependency:** `useArcade()` context for `isConnected`, `address`, `profile`, `logout`, `disconnect`
   - **Dependency:** `useDisconnect()` from wagmi for wallet disconnection
   - **Risk:** Changing wallet UI might break connection state management
   - **Mitigation:** Maintain `useArcade()` interface, keep wagmi integration

2. **AuthDialog component**
   - **Dependency:** `NativeGlyphConnectButton` from `@use-glyph/sdk-react`
   - **Dependency:** `useAccount()` from wagmi for connection detection
   - **Dependency:** `onAuthSuccess` callback prop
   - **Risk:** Replacing Glyph button breaks connection flow
   - **Mitigation:** Maintain callback interface, keep wagmi state sync

3. **ProfileSyncWrapper**
   - **Dependency:** `useAccount()` from wagmi
   - **Dependency:** `useArcade()` context methods (`setWalletConnection`, `syncProfileWithWallet`)
   - **Risk:** Changing wallet provider breaks automatic profile sync
   - **Mitigation:** Keep wrapper interface, abstract wallet provider

4. **API Routes (submit-result)**
   - **Dependency:** `playerAddress` in request body (wallet address)
   - **Risk:** Low - API routes don't care about wallet UI, only need address
   - **Mitigation:** None needed (address is just a string)

#### Medium Risk Areas

5. **ArcadeContext state management**
   - **Dependency:** Wallet address stored in `address` state
   - **Dependency:** `isConnected` state
   - **Dependency:** `isAuthenticated` state
   - **Risk:** Changing auth flow might break state initialization
   - **Mitigation:** Keep state fields, change implementation

6. **Game session storage**
   - **Dependency:** `address` field in GameSession
   - **Risk:** Low - address is just stored, not used for auth
   - **Mitigation:** None needed

### What Depends on Wallet Address vs User ID

#### Wallet Address Dependencies

**API Routes:**
- `/api/cryptoku/submit-result` - Uses `playerAddress` from request body
- `/api/ape-in/submit-result` - Uses `playerAddress` from request body
- `/api/cryptoku/leaderboard` - Queries by wallet address
- All game submission APIs use wallet address as identifier

**Database Queries:**
- `ProfileService.getProfileByWallet(address)` - Primary lookup method
- `profiles.wallet_address` - Unique index, primary lookup field
- Leaderboard tables store `address` field

**LocalStorage:**
- `arcade_profile_{wallet_address}` - Keyed by address
- `arcade_auth_address` - Stores address as token

**Display:**
- `getDisplayName()` - Falls back to shortened address if no username
- ProfileMenu shows wallet address in connection status

#### User ID Dependencies

**Database:**
- `profiles.id` - UUID primary key
- `game_sessions.user_id` - Foreign key to profiles.id
- Used in RPC functions: `update_user_balance(p_user_id, ...)`

**Game Session:**
- `GameSession.userId` - Stored in session (but uses username, not UUID)
- **Note:** Session uses username as userId (inconsistent with database UUID)

**API Routes:**
- RPC calls use `profile.id` (UUID) after looking up profile by address
- Example: `update_user_balance(p_user_id: profile.id, ...)`

#### Hybrid Approach
- **Lookup:** Wallet address → Profile (via `getProfileByWallet`)
- **Operations:** User ID (UUID) → Database operations (via `profile.id`)
- **Storage:** Wallet address → LocalStorage keys
- **Display:** Wallet address → Fallback display name

### What Depends on Supabase Auth vs Third-Party Auth

#### Supabase Auth
- **Status:** ❌ **NOT USED**
- `hooks/use-supabase-auth.ts` exists but is not imported/used anywhere
- No Supabase auth.signIn/signUp/signOut calls in main flow
- Authentication is wallet-based only

#### Third-Party Auth (Wallet-Based)
- **Provider:** Glyph Wallet (via `@use-glyph/sdk-react`)
- **Integration:** Wagmi (via `wagmi` package)
- **Flow:** Wallet connection → Address → Profile lookup/creation

#### Database Access
- **Client:** Supabase client (browser-side)
- **Auth:** No Supabase auth required
- **Access:** Anonymous access with RLS (Row Level Security)
- **Admin:** Admin client used in API routes for bypassing RLS

#### Risk Assessment
- **Low Risk:** Changing auth provider (e.g., from Glyph to MetaMask)
  - Database doesn't care about auth method
  - Only wallet address matters
  - Profile lookup by address is provider-agnostic
- **Medium Risk:** Removing wallet-based auth
  - Would require significant refactoring
  - All API routes expect wallet address
  - Profile system is address-based

---

## VI. Recommendations

### Minimal "AuthAdapter" Interface

```typescript
/**
 * AuthAdapter Interface
 * Abstraction layer for wallet authentication
 */
interface AuthAdapter {
  // Connection state
  address: string | null
  isConnected: boolean
  
  // Connection methods
  connect(): Promise<void>
  disconnect(): Promise<void>
  
  // Events
  onConnect(callback: (address: string) => void): () => void  // Returns unsubscribe
  onDisconnect(callback: () => void): () => void
  
  // Provider info
  providerName: string  // e.g., "Glyph", "MetaMask", "Privy"
}
```

**Implementation Example:**
```typescript
// lib/auth-adapters/glyph-adapter.ts
export class GlyphAuthAdapter implements AuthAdapter {
  // Uses wagmi + Glyph SDK
  // Wraps useAccount(), NativeGlyphConnectButton, etc.
}

// lib/auth-adapters/metamask-adapter.ts
export class MetaMaskAuthAdapter implements AuthAdapter {
  // Uses wagmi + MetaMask
  // Wraps useAccount(), useConnect(), etc.
}
```

**Benefits:**
- UI components depend on interface, not implementation
- Easy to swap wallet providers
- Testable with mock adapters
- Clear contract for auth operations

### Migration Plan

#### Phase 1: Create Adapter Layer (Non-Breaking)
1. Create `AuthAdapter` interface
2. Implement `GlyphAuthAdapter` (wraps existing code)
3. Update `ArcadeContext` to use adapter (internal refactor)
4. **No UI changes** - everything works the same

#### Phase 2: Abstract Wallet UI (Breaking UI, Stable API)
1. Create `WalletConnectButton` component (replaces `NativeGlyphConnectButton`)
2. Component uses `AuthAdapter` interface
3. Update `AuthDialog` to use new component
4. **UI changes** - but APIs remain stable (address-based)

#### Phase 3: Multi-Wallet Support (Optional)
1. Add wallet selection UI
2. Support multiple `AuthAdapter` implementations
3. User can choose wallet provider
4. **Backend unchanged** - still address-based

#### Phase 4: Enhanced Features (Optional)
1. Wallet linking (multiple addresses per profile)
2. NFT avatar selection
3. Social login (if needed)

### Key Principles

1. **API Stability:** Keep wallet address as primary identifier
   - Don't change API route signatures
   - Don't change database schema (additive only)
   - Don't change localStorage keys (additive only)

2. **Provider Agnostic:** Abstract wallet provider
   - Use `AuthAdapter` interface
   - UI components depend on interface
   - Easy to swap providers

3. **Backward Compatibility:** Preserve existing data
   - Keep localStorage keys
   - Keep database fields
   - Support migration path for existing users

4. **Incremental Migration:** Change one layer at a time
   - Phase 1: Internal refactor (no UI changes)
   - Phase 2: UI changes (API stable)
   - Phase 3+: New features (optional)

### Specific Recommendations

1. **Fix Session UserId Inconsistency**
   - `GameSession.userId` currently stores username (string)
   - Database uses UUID for user_id
   - **Recommendation:** Store UUID in session, or rename field to `username`

2. **Consolidate Session Storage**
   - Two session systems: `lib/game-session.ts` and `lib/arcade-session.ts`
   - **Recommendation:** Deprecate `arcade-session.ts`, use `game-session.ts` only

3. **Add Wallet Linking Support**
   - Database: Add `linked_wallets` JSONB field to profiles
   - API: Support multiple addresses per profile
   - UI: Add wallet management in ProfileMenu

4. **Implement NFT Avatar Selection**
   - Fetch NFTs from ApeChain
   - Add NFT selection UI to ProfileMenu
   - Store NFT contract + token ID in profile

5. **Improve Error Handling**
   - Add error boundaries for auth failures
   - Better error messages in AuthDialog
   - Retry logic for network failures

6. **Add Testing**
   - Unit tests for AuthAdapter interface
   - Integration tests for auth flow
   - E2E tests for wallet connection

---

## Summary

### Current State
- **Auth Provider:** Glyph Wallet (via Wagmi)
- **Profile Storage:** Supabase (address-keyed) + localStorage (backup)
- **Session:** localStorage-based (24hr expiry)
- **Wallet Linking:** ❌ Not implemented
- **NFT Avatars:** ❌ Not implemented (only file upload/presets)

### Key Findings
1. ✅ Wallet connection works via Glyph + Wagmi
2. ✅ Profile sync works (localStorage + Supabase)
3. ✅ API routes use wallet address (provider-agnostic)
4. ⚠️ No wallet linking support
5. ⚠️ No NFT avatar integration
6. ⚠️ Two session systems (consolidate)
7. ⚠️ Session userId inconsistency (username vs UUID)

### Migration Readiness
- **API Routes:** ✅ Ready (address-based, provider-agnostic)
- **Database:** ✅ Ready (address-keyed profiles)
- **UI Components:** ⚠️ Tightly coupled to Glyph (needs adapter)
- **State Management:** ⚠️ Mixed (needs cleanup)

### Risk Level: **MEDIUM**
- Changing wallet UI requires careful refactoring
- Core APIs are stable (address-based)
- Profile system is well-abstracted (Service layer)
- Session management needs consolidation

---

**End of Audit Report**

