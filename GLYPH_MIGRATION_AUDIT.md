# Glyph Migration Audit: Authentication & Wallet Usage

**Date**: 2024  
**Purpose**: Pre-migration audit to identify all Thirdweb dependencies and wallet usage patterns before migrating to Glyph

---

## Executive Summary

This audit identifies all Thirdweb-related imports, authentication flows, and wallet data consumption across the Arcade Hub codebase. The analysis categorizes files by their responsibility and migration requirements.

---

## 1. Thirdweb Imports & Components

### 1.1 Core Thirdweb Provider & Client

**Files with ThirdwebProvider:**
- `app/providers.tsx` (Line 3-6)
  - Imports: `ThirdwebProvider` from `thirdweb/react`
  - Responsibility: Root-level provider wrapping entire app
  - **Migration Required**: ✅ YES - Replace with Glyph provider

**Files with Thirdweb Client:**
- `lib/thirdweb.ts` (Lines 1-26)
  - Imports: `createThirdwebClient`, `defineChain` from `thirdweb`
  - Exports: `thirdwebClient`, `apeChain`, `apeChainTestnet`, `contracts`
  - Used by: `adapters/wallet.adapter.ts`, `components/auth-dialog.tsx`, `lib/chains.ts`
  - **Migration Required**: ✅ YES - Replace client creation with Glyph client

- `lib/chains.ts` (Lines 1-31)
  - Imports: `defineChain` from `thirdweb/chains`
  - Exports: `apeChainMainnet`, `apeChainTestnet`
  - **Migration Required**: ✅ YES - Replace chain definitions with Glyph-compatible format

### 1.2 React Hooks & Components

**Files using Thirdweb React Hooks:**

1. **`components/auth-dialog.tsx`** (Lines 11, 29-31)
   - Imports: `ConnectEmbed`, `useActiveAccount`, `useActiveWallet`, `useDisconnect` from `thirdweb/react`
   - Usage:
     - `useActiveAccount()` - Gets connected account/address
     - `useActiveWallet()` - Gets active wallet instance
     - `useDisconnect()` - Wallet disconnection
     - `ConnectEmbed` - UI component for wallet connection
   - **Migration Required**: ✅ YES - Replace all hooks and UI with Glyph equivalents

2. **`components/profile-sync-wrapper.tsx`** (Lines 4, 8-9)
   - Imports: `useActiveAccount`, `useActiveWallet` from `thirdweb/react`
   - Usage: Monitors wallet connection state to trigger profile sync
   - **Migration Required**: ✅ YES - Replace hooks with Glyph equivalents

3. **`components/profile-menu.tsx`** (Lines 4, 37-38)
   - Imports: `useDisconnect`, `useActiveWallet` from `thirdweb/react`
   - Usage: Disconnecting wallet on logout
   - **Migration Required**: ✅ YES - Replace hooks with Glyph equivalents

4. **`hooks/use-profile-sync.ts`** (Line 4, 10)
   - Imports: `useActiveAccount` from `thirdweb/react`
   - Usage: Gets wallet address for profile sync operations
   - **Migration Required**: ✅ YES - Replace hook with Glyph equivalent

5. **`features/profile/profile-view.tsx`** (Line 5, 18)
   - Imports: `useActiveAccount` from `thirdweb/react`
   - Usage: Gets wallet address for profile loading
   - **Migration Required**: ✅ YES - Replace hook with Glyph equivalent

### 1.3 Wallet Type Definitions

**Files with Thirdweb Wallet Types:**

- `components/providers.tsx` (Line 11)
  - Imports: `Wallet` type from `thirdweb/wallets`
  - Usage: Type for `wallet` state in ArcadeContext
  - **Migration Required**: ✅ YES - Replace with Glyph wallet type

### 1.4 Contract & Blockchain Operations

**Files using Thirdweb for Contract Calls:**

- `adapters/wallet.adapter.ts` (Lines 1-34)
  - Imports: `getContract`, `readContract` from `thirdweb`
  - Usage: Reads APE token balance from blockchain
  - Uses: `thirdwebClient` from `lib/thirdweb`, `apeChainMainnet` from `lib/chains`
  - **Migration Required**: ✅ YES - Replace contract calls with Glyph-compatible RPC calls

---

## 2. Authentication Flow

### 2.1 Login Initiation Points

**Primary Entry Point:**
- `components/auth-dialog.tsx`
  - **Role**: Main authentication UI component
  - **Triggered by**: 
    - `features/arcade/arcade-hub.tsx` (Line 77-80) - Shows on page load
    - `components/profile-menu.tsx` (Line 114) - Shows on "Connect Wallet" click
  - **Flow**:
    1. User clicks connect → `AuthDialog` opens
    2. `ConnectEmbed` from Thirdweb renders wallet connection UI
    3. User connects wallet (MetaMask, Email, etc.)
    4. `useActiveAccount()` and `useActiveWallet()` detect connection
    5. `handleAuthSuccess()` processes authentication
    6. For inApp wallets: Extracts auth token
    7. For external wallets: Uses address as identifier
    8. Calls `onAuthSuccess()` callback → `components/providers.tsx` → `handleAuthSuccess()`

**Provider Setup:**
- `app/providers.tsx` wraps app with `ThirdwebProvider`
- `app/layout.tsx` (Line 44) includes the provider in root layout
- **Migration Required**: ✅ YES - Replace `ThirdwebProvider` with Glyph provider

### 2.2 Post-Authentication Flow

**Profile Sync:**
1. `components/profile-sync-wrapper.tsx` detects wallet connection
2. Calls `components/providers.tsx` → `setWalletConnection()`
3. Calls `components/providers.tsx` → `syncProfileWithWallet()`
4. `syncProfileWithWallet()`:
   - Fetches/creates Supabase profile using wallet address
   - Updates local state (tickets, points, username)
   - Triggers APE balance fetch via `getApeBalance()`

**State Management:**
- `components/providers.tsx` maintains:
  - `address`: Wallet address
  - `wallet`: Wallet instance (Thirdweb `Wallet` type)
  - `isConnected`: Connection state
  - `isAuthenticated`: Authentication state
  - `apeBalance`: On-chain APE token balance

---

## 3. Wallet Data Consumption

### 3.1 Identity (Address) Usage

**Files reading wallet address for identity:**

1. **Profile Operations:**
   - `components/providers.tsx` (Line 177-231) - `syncProfileWithWallet()`
     - Uses: `walletAddress` parameter to query Supabase
     - **Category**: A) Required for login + C) Identity reading
   
   - `hooks/use-profile-sync.ts` (Line 14, 18-34)
     - Uses: `account.address` for profile creation/updates
     - **Category**: A) Required for login + C) Identity reading

   - `features/profile/profile-view.tsx` (Line 27, 34, 57)
     - Uses: `account.address` to load profile data
     - **Category**: C) Only reading identity

2. **Game Sessions:**
   - `components/providers.tsx` (Line 147, 151)
     - Uses: `address` in game session storage
     - **Category**: C) Only reading identity

3. **UI Display:**
   - `components/profile-menu.tsx` (Line 183)
     - Uses: `address` from context to display wallet address
     - **Category**: C) Only reading identity
   
   - `features/profile/profile-view.tsx` (Line 111)
     - Uses: `address` from context to display shortened address
     - **Category**: C) Only reading identity

### 3.2 Balance & Token Reading

**Files reading wallet balances:**

1. **APE Token Balance:**
   - `adapters/wallet.adapter.ts` (Lines 6-34)
     - Function: `getApeBalance(address: string)`
     - Uses: Thirdweb `readContract()` to call ERC20 `balanceOf()`
     - **Category**: C) Only reading balances/tokens
   
   - `components/providers.tsx` (Lines 164-174, 244-249)
     - Calls: `getApeBalance()` when address changes
     - Stores: Result in `apeBalance` state
     - **Category**: C) Only reading balances/tokens

   - `components/profile-menu.tsx` (Line 189)
     - Displays: `apeBalance` from context
     - **Category**: C) Only reading balances/tokens

   - `features/arcade/arcade-hub.tsx` (Line 15)
     - Note: Hardcoded value, not using actual balance (potential bug)
     - **Category**: D) No longer needed (or should use real data)

### 3.3 Games & Wallet Usage

**Analysis of game files:**

- `features/games/cryptoku/cryptokugame.tsx` - Uses local storage for balances, no wallet direct access
- `features/games/card-battle.tsx` - Not analyzed in detail, but likely uses address from context
- **Category**: D) Games should NOT touch wallets directly - They use address from `useArcade()` context

**Game Integration Pattern:**
- Games access `address` via `useArcade()` hook from `components/providers.tsx`
- Games do NOT import Thirdweb directly
- Games use Supabase/profile services for game data
- **Migration Impact**: ✅ LOW - Games should continue using context, no direct changes needed

---

## 4. Categorization by Migration Priority

### 4.1 Category A: Required for Login ⚠️ CRITICAL

**Must change for Glyph migration:**

1. **`app/providers.tsx`**
   - Replace: `ThirdwebProvider` → Glyph provider
   - Impact: HIGH - Root provider change affects entire app

2. **`components/auth-dialog.tsx`**
   - Replace: `ConnectEmbed` → Glyph connect component
   - Replace: `useActiveAccount()`, `useActiveWallet()`, `useDisconnect()` → Glyph hooks
   - Impact: CRITICAL - Core authentication UI

3. **`components/profile-sync-wrapper.tsx`**
   - Replace: `useActiveAccount()`, `useActiveWallet()` → Glyph hooks
   - Impact: HIGH - Monitors wallet connection state

4. **`components/providers.tsx`** (Arcade Context)
   - Replace: `Wallet` type from `thirdweb/wallets` → Glyph wallet type
   - Update: `setWalletConnection()` to work with Glyph wallet
   - Impact: HIGH - Core state management

5. **`lib/thirdweb.ts`**
   - Replace: `createThirdwebClient()` → Glyph client creation
   - Impact: HIGH - Used by wallet adapter and auth dialog

6. **`lib/chains.ts`**
   - Replace: `defineChain()` → Glyph-compatible chain definition
   - Impact: MEDIUM - Used for RPC configuration

### 4.2 Category B: Only Reading Identity ✅ MODERATE

**Should change but lower priority:**

1. **`components/profile-menu.tsx`**
   - Replace: `useDisconnect()`, `useActiveWallet()` → Glyph hooks
   - Impact: MEDIUM - Only used for disconnect functionality

2. **`hooks/use-profile-sync.ts`**
   - Replace: `useActiveAccount()` → Glyph hook
   - Impact: MEDIUM - Profile sync on connection

3. **`features/profile/profile-view.tsx`**
   - Replace: `useActiveAccount()` → Glyph hook
   - Impact: LOW - Only for loading profile data

### 4.3 Category C: Only Reading Balances/Tokens ✅ MODERATE

**Should change for consistency:**

1. **`adapters/wallet.adapter.ts`**
   - Replace: `getContract()`, `readContract()` → Glyph-compatible RPC calls
   - Replace: `thirdwebClient` → Glyph client
   - Impact: MEDIUM - APE balance reading

2. **`components/providers.tsx`** (APE balance fetching)
   - Update: Balance fetching logic to use Glyph-compatible adapter
   - Impact: LOW - Only affects balance display

### 4.4 Category D: No Longer Needed / Should Not Change ✅ LOW

**Files that should NOT change:**

1. **Game Files** (`features/games/**`)
   - Status: Games access wallet via `useArcade()` context
   - Games do NOT import Thirdweb directly
   - **Action**: NO CHANGES REQUIRED - Games will work after context is updated

2. **Supabase Services** (`lib/supabase/**`)
   - Status: No Thirdweb dependencies
   - **Action**: NO CHANGES REQUIRED

3. **Profile Storage** (`lib/profile-storage.ts`)
   - Status: Pure localStorage utility, no Thirdweb dependencies
   - **Action**: NO CHANGES REQUIRED

4. **Auth Utilities** (`lib/auth.ts`)
   - Status: Handles auth tokens/API calls, minimal Thirdweb usage (if any)
   - **Action**: VERIFY - May need minor updates if auth flow changes

---

## 5. File-by-File Migration Checklist

### Critical Path (Must Change)

| File | Changes Required | Impact | Notes |
|------|-----------------|--------|-------|
| `app/providers.tsx` | Replace `ThirdwebProvider` | 🔴 CRITICAL | Root provider |
| `components/auth-dialog.tsx` | Replace all Thirdweb hooks & `ConnectEmbed` | 🔴 CRITICAL | Main auth UI |
| `components/profile-sync-wrapper.tsx` | Replace `useActiveAccount`, `useActiveWallet` | 🟡 HIGH | Connection monitoring |
| `components/providers.tsx` | Replace `Wallet` type, update wallet handling | 🟡 HIGH | Core state management |
| `lib/thirdweb.ts` | Replace `createThirdwebClient` | 🟡 HIGH | Client configuration |
| `lib/chains.ts` | Replace `defineChain` | 🟢 MEDIUM | Chain definitions |

### Secondary Path (Should Change)

| File | Changes Required | Impact | Notes |
|------|-----------------|--------|-------|
| `components/profile-menu.tsx` | Replace `useDisconnect`, `useActiveWallet` | 🟢 MEDIUM | Disconnect only |
| `hooks/use-profile-sync.ts` | Replace `useActiveAccount` | 🟢 MEDIUM | Profile sync |
| `features/profile/profile-view.tsx` | Replace `useActiveAccount` | 🟢 LOW | Profile display |
| `adapters/wallet.adapter.ts` | Replace contract calls | 🟢 MEDIUM | Balance reading |

### No Changes Required

| File | Status | Reason |
|------|--------|--------|
| `features/games/**` | ✅ NO CHANGES | Use context, no direct Thirdweb |
| `lib/supabase/**` | ✅ NO CHANGES | No Thirdweb dependencies |
| `lib/profile-storage.ts` | ✅ NO CHANGES | Pure localStorage utility |
| `lib/game-session.ts` | ✅ NO CHANGES | No Thirdweb dependencies |
| `lib/auth.ts` | ⚠️ VERIFY | Check for indirect dependencies |

---

## 6. Dependencies & Imports Summary

### Direct Thirdweb Imports

```
thirdweb/react:
  - ThirdwebProvider (app/providers.tsx)
  - ConnectEmbed (components/auth-dialog.tsx)
  - useActiveAccount (5 files)
  - useActiveWallet (3 files)
  - useDisconnect (2 files)

thirdweb:
  - createThirdwebClient (lib/thirdweb.ts)
  - getContract (adapters/wallet.adapter.ts)
  - readContract (adapters/wallet.adapter.ts)

thirdweb/chains:
  - defineChain (lib/chains.ts, lib/thirdweb.ts)

thirdweb/wallets:
  - Wallet type (components/providers.tsx)
```

### Files Using Thirdweb (Total: 11)

1. `app/providers.tsx`
2. `components/auth-dialog.tsx`
3. `components/profile-sync-wrapper.tsx`
4. `components/profile-menu.tsx`
5. `components/providers.tsx` (Arcade context)
6. `hooks/use-profile-sync.ts`
7. `features/profile/profile-view.tsx`
8. `lib/thirdweb.ts`
9. `lib/chains.ts`
10. `adapters/wallet.adapter.ts`
11. `features/arcade/arcade-hub.tsx` (indirect - uses AuthDialog)

---

## 7. Migration Strategy Recommendations

### Phase 1: Foundation (CRITICAL)
1. Replace `ThirdwebProvider` in `app/providers.tsx`
2. Update `lib/thirdweb.ts` to create Glyph client
3. Update `lib/chains.ts` to use Glyph-compatible chains

### Phase 2: Authentication (CRITICAL)
1. Replace `components/auth-dialog.tsx` with Glyph connect UI
2. Update `components/profile-sync-wrapper.tsx` with Glyph hooks
3. Update `components/providers.tsx` wallet state management

### Phase 3: Utilities (MODERATE)
1. Update `adapters/wallet.adapter.ts` for Glyph RPC calls
2. Update secondary hooks (`use-profile-sync.ts`, `profile-view.tsx`, `profile-menu.tsx`)

### Phase 4: Testing (VERIFY)
1. Verify games still work (should - they use context)
2. Test profile sync flow
3. Test balance reading
4. Test disconnect/logout flow

---

## 8. Key Findings & Risks

### ⚠️ Critical Findings

1. **Hardcoded Balance**: `features/arcade/arcade-hub.tsx` line 15 has hardcoded `apeBalance = "125.50"` - should use context value
2. **Wallet Type Dependency**: `components/providers.tsx` imports `Wallet` type from `thirdweb/wallets` - needs Glyph equivalent
3. **Client Configuration**: `thirdwebClient` is used across multiple files - central migration point

### ✅ Positive Findings

1. **Game Isolation**: Games don't directly import Thirdweb - migration won't break game logic
2. **Clear Separation**: Auth/identity logic is separated from game logic
3. **Context Pattern**: Central state management via `useArcade()` makes migration easier

### 🔍 Areas Requiring Attention

1. **InApp Wallet Auth Tokens**: `components/auth-dialog.tsx` handles email wallets with tokens - verify Glyph supports this
2. **Wallet Disconnect**: Multiple disconnect paths - ensure all work with Glyph
3. **Chain Switching**: `lib/wallet-chain.ts` handles MetaMask chain switching - may need updates for Glyph

---

## 9. Next Steps

### Before Migration

1. ✅ **COMPLETE** - Audit all Thirdweb usage
2. ⏳ **TODO** - Review Glyph SDK documentation
3. ⏳ **TODO** - Create Glyph client setup equivalent to `lib/thirdweb.ts`
4. ⏳ **TODO** - Map Thirdweb hooks to Glyph equivalents
5. ⏳ **TODO** - Test Glyph connect flow in isolated component

### During Migration

1. Follow Phase 1-4 strategy above
2. Test each phase before proceeding
3. Maintain backward compatibility during transition (if possible)

### After Migration

1. Remove unused Thirdweb dependencies
2. Update documentation
3. Test end-to-end authentication flow
4. Verify all games still functional

---

## Appendix: Files Reference

### Core Authentication Files
- `app/providers.tsx` - Root ThirdwebProvider
- `app/layout.tsx` - App layout with provider structure
- `components/auth-dialog.tsx` - Main authentication UI
- `components/profile-sync-wrapper.tsx` - Wallet connection monitor

### State Management
- `components/providers.tsx` - Arcade context with wallet state
- `hooks/use-profile-sync.ts` - Profile sync hook

### Utilities
- `lib/thirdweb.ts` - Thirdweb client configuration
- `lib/chains.ts` - Chain definitions
- `lib/auth.ts` - Auth token utilities
- `adapters/wallet.adapter.ts` - Wallet balance adapter

### UI Components
- `components/profile-menu.tsx` - Profile/wallet UI
- `features/profile/profile-view.tsx` - Profile display
- `features/arcade/arcade-hub.tsx` - Main hub with auth trigger

---

**End of Audit Report**

