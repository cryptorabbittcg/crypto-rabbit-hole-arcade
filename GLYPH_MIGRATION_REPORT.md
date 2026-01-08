# Glyph Migration Report - Thirdweb to Glyph Auth Migration

## 1. FIND & REPORT

### Files Importing Thirdweb Auth Components

**Files that import `thirdweb/react` or Thirdweb auth components:**

1. **`app/providers.tsx`**
   - Imports: `ThirdwebProvider` from `thirdweb/react`
   - Usage: Root provider wrapper

2. **`components/auth-dialog.tsx`**
   - Imports: `ConnectEmbed`, `useActiveAccount`, `useActiveWallet`, `useDisconnect` from `thirdweb/react`
   - Usage: 
     - `ConnectEmbed` - Main connection UI
     - `useActiveAccount()` - Gets connected account/address
     - `useActiveWallet()` - Gets active wallet instance
     - `useDisconnect()` - Wallet disconnection

3. **`components/profile-sync-wrapper.tsx`**
   - Imports: `useActiveAccount`, `useActiveWallet` from `thirdweb/react`
   - Usage: Monitors wallet connection and syncs profile

4. **`components/profile-menu.tsx`**
   - Imports: `useDisconnect`, `useActiveWallet` from `thirdweb/react`
   - Usage: Disconnect functionality in profile menu

5. **`hooks/use-profile-sync.ts`**
   - Imports: `useActiveAccount` from `thirdweb/react`
   - Usage: Profile synchronization hook

6. **`features/profile/profile-view.tsx`**
   - Imports: `useActiveAccount` from `thirdweb/react`
   - Usage: Profile display component

7. **`components/providers.tsx`**
   - Imports: `Wallet` type from `thirdweb/wallets`
   - Usage: Type definition for wallet state

### Current Login Trigger Flow

1. **Initial Mount**: `features/arcade/arcade-hub.tsx` shows `AuthDialog` on mount if not authenticated
2. **Profile Menu**: `components/profile-menu.tsx` has "Connect Wallet" button that dispatches `showAuthDialog` event
3. **Auth Dialog**: `components/auth-dialog.tsx` renders `ConnectEmbed` which opens Thirdweb connection modal
4. **Connection Detection**: `components/profile-sync-wrapper.tsx` monitors `useActiveAccount()` and syncs profile when connected
5. **State Management**: `components/providers.tsx` manages connection state via `setWalletConnection()` callback

### State Storage

- **Thirdweb**: Stores connection in localStorage (keys starting with "thirdweb")
- **Arcade Session**: Stores profile data in localStorage (keys starting with "arcade_profile_")
- **Auth Token**: Stored via `storeAuthToken()` in `lib/auth.ts`

## 2. IMPLEMENTATION PLAN

### Dependencies to Install/Verify
- `@use-glyph/sdk-react` (new)
- `wagmi@^2.15.x` (verify current: 2.19.1 - compatible)
- `viem@^2.29.x` (verify current: 2.38.5 - compatible, but may need downgrade)
- `@tanstack/react-query@^5.x` (verify current: 5.90.5 - compatible)

### Files to Modify

1. **`app/providers.tsx`** - Replace ThirdwebProvider with GlyphWalletProvider
2. **`components/auth-dialog.tsx`** - Replace ConnectEmbed with NativeGlyphConnectButton, replace hooks
3. **`components/profile-sync-wrapper.tsx`** - Replace useActiveAccount/useActiveWallet with wagmi hooks
4. **`components/profile-menu.tsx`** - Replace useDisconnect/useActiveWallet with wagmi hooks
5. **`hooks/use-profile-sync.ts`** - Replace useActiveAccount with wagmi hooks
6. **`features/profile/profile-view.tsx`** - Replace useActiveAccount with wagmi hooks
7. **`components/providers.tsx`** - Update to use wagmi address instead of thirdweb wallet

### Chain Configuration

- Current: Uses `apeChainMainnet` (chain ID 33139) from `lib/chains.ts`
- Glyph: Needs chain configuration in GlyphWalletProvider

## 3. MIGRATION CHECKLIST

- [ ] Install @use-glyph/sdk-react
- [ ] Verify/update wagmi/viem/react-query versions
- [ ] Replace ThirdwebProvider with GlyphWalletProvider
- [ ] Replace ConnectEmbed with NativeGlyphConnectButton
- [ ] Replace all useActiveAccount with useAccount (wagmi)
- [ ] Replace all useActiveWallet with wagmi hooks (if needed)
- [ ] Replace useDisconnect with wagmi useDisconnect
- [ ] Update profile-sync-wrapper to use wagmi
- [ ] Update profile-menu disconnect logic
- [ ] Update use-profile-sync hook
- [ ] Update profile-view component
- [ ] Update providers.tsx wallet state management
- [ ] Remove unused thirdweb auth imports
- [ ] Test session persistence
- [ ] Test disconnect functionality
- [ ] Verify games still receive identity props

