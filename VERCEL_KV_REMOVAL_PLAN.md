# Vercel KV Removal Plan

## Problem
The codebase is trying to use Vercel KV (Redis) but the environment variables are not configured. Since we're using Supabase exclusively, all Vercel KV references need to be removed or replaced.

## Error
```
"@vercel/kv: Missing required environment variables KV_REST_API_URL and KV_REST_API_TOKEN"
```

## Files Using Vercel KV

### ✅ FIXED: `app/api/cryptoku/submit-result/route.ts`
- **Was using:** `lib/cryptoku-store.ts` (Vercel KV)
- **Now using:** `lib/cryptoku-stats.ts` (Supabase/in-memory)
- **Status:** ✅ Fixed - imports updated

### ⚠️ NEEDS REVIEW: `lib/apein-store.ts`
- **Uses:** Vercel KV for Ape In game stats
- **Status:** Not currently causing errors (not used in active API routes)
- **Action:** Can be left for now, or replaced with Supabase if Ape In is active

### 📦 PACKAGE: `package.json`
- **Has:** `"@vercel/kv": "^1.0.1"` dependency
- **Action:** Can be removed after confirming no other usage

## Changes Made

### 1. Created `lib/cryptoku-stats.ts`
- Replaces `lib/cryptoku-store.ts` for stats operations
- Uses Supabase `CryptokuHintsService` for persistence
- Falls back to in-memory cache if Supabase unavailable
- No Vercel KV dependency

### 2. Updated `app/api/cryptoku/submit-result/route.ts`
- Changed import from `@/lib/cryptoku-store` to `@/lib/cryptoku-stats`
- Now uses Supabase-based stats instead of Vercel KV

## Next Steps

### Immediate (Required)
1. ✅ **DONE:** Created `lib/cryptoku-stats.ts`
2. ✅ **DONE:** Updated API route import
3. **TODO:** Test the fix - play a Cryptoku game and verify no Vercel KV errors
4. **TODO:** Commit and deploy changes

### Optional (Future Cleanup)
1. **Remove `@vercel/kv` from package.json** (after confirming no other usage)
2. **Review `lib/apein-store.ts`** - replace with Supabase if Ape In is active
3. **Remove `lib/cryptoku-store.ts`** - no longer needed (keep for reference or delete)

## Testing Checklist

- [ ] Play a Cryptoku game (DEGEN or APE mode)
- [ ] Complete the game
- [ ] Verify no Vercel KV errors in console
- [ ] Verify leaderboard entry is saved
- [ ] Verify points are awarded
- [ ] Verify clean streak is tracked correctly

## Notes

- The new `cryptoku-stats.ts` uses in-memory cache for clean streak
- Clean streak persists during server session but resets on server restart
- Future improvement: Store clean streak in `cryptoku_hints` table in Supabase
- The `cryptoku-store.ts` file can be kept for reference or deleted later
