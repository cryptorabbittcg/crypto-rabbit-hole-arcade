# TypeScript Errors - Fix Plan

This document tracks TypeScript errors that need to be fixed before removing `ignoreBuildErrors: true` from `next.config.mjs`.

## Missing Function Implementations

### `updateArcadeSession`
- **Used in**: `components/providers.tsx` (multiple locations)
- **Action**: Implement or import from appropriate module (likely `lib/arcade-session.ts`)

### `loadProfileByAddress`
- **Used in**: `components/providers.tsx` (multiple locations)
- **Action**: Implement or import from appropriate module (likely `lib/profile-storage.ts`)

### `saveProfileByAddress`
- **Used in**: `components/providers.tsx` (multiple locations)
- **Action**: Implement or import from appropriate module (likely `lib/profile-storage.ts`)

## Service Method Issues

### ProfileService
- `getProfileByWallet` - Method doesn't exist on ProfileService
- `createProfile` - Method doesn't exist on ProfileService
- `getProfile` - Static method doesn't exist
- `updateProfile` - Static method doesn't exist
- `updateBalance` - Method doesn't exist

### GameService
- `getRecentGames` - Static method doesn't exist

**Action**: Review service implementations and fix method names/types or add missing methods.

## Type Issues

### ArcadeContextType
- Missing properties: `apeBalance`, `isAuthenticated`, `logout`, `handleAuthSuccess`
- **Action**: Add missing properties to context type definition

### Navigation Items
- `soon` property doesn't exist on navigation item type
- **Files**: `components/mobile-nav.tsx`, `components/sidebar.tsx`
- **Action**: Update type definition or fix property access

### Chain Configuration
- `rpc` type mismatch (string vs readonly string[])
- **File**: `lib/chains.ts`
- **Action**: Fix chain configuration type

### BigInt Literals
- BigInt literals not available when targeting ES6
- **File**: `adapters/bridge.adapter.ts`
- **Action**: Update tsconfig.json target to ES2020+ or use BigInt constructor

### Thirdweb Client ID
- `clientId` possibly undefined
- **File**: `lib/thirdweb.ts`
- **Action**: Add proper null checks or default values

### Other Type Issues
- Various possibly undefined/null type issues
- **Action**: Add proper type guards and null checks

## Priority

1. **High**: Missing function implementations (blocks functionality)
2. **Medium**: Service method issues (affects data access)
3. **Medium**: Context type issues (affects type safety)
4. **Low**: Type guard improvements (improves safety but non-blocking)

## Progress

- [ ] Missing function implementations
- [ ] Service method issues  
- [ ] Context type issues
- [ ] Type guard improvements
- [ ] Remove `ignoreBuildErrors: true` from next.config.mjs




