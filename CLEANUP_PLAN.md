# Database Cleanup Plan

## Overview
Remove unused Vercel KV code to prevent future conflicts and confusion.

---

## Step 1: Remove Unused Vercel KV Functions

### File: `lib/cryptoku-store.ts`

**Functions to Remove:**
- `addCryptokuLeaderboardEntry()` (lines 310-333)
- `getCryptokuLeaderboard()` (lines 336-380)

**Keep:**
- Type definitions (`LeaderboardEntry`, `PlayerStats`, `PlayerHints`) - may be used elsewhere
- Or move types to a separate file

**Action:**
```typescript
// Remove these functions from lib/cryptoku-store.ts:
// - addCryptokuLeaderboardEntry()
// - getCryptokuLeaderboard()
```

---

## Step 2: Review and Remove `lib/apein-store.ts`

**Check if Ape In is using Supabase:**
```bash
grep -r "apein-store" app/api
grep -r "getApeInStats" app/api
grep -r "addApeInLeaderboardEntry" app/api
```

**If not used:**
- Delete `lib/apein-store.ts` entirely
- Or mark as deprecated with a comment

---

## Step 3: Remove Vercel KV Package

**After confirming no usage:**
```bash
npm uninstall @vercel/kv
```

**Verify no imports remain:**
```bash
grep -r "@vercel/kv" --exclude-dir=node_modules --exclude="*.md" .
```

---

## Step 4: Update Documentation

**Files to update:**
1. `VERCEL_KV_REMOVAL_PLAN.md` - Mark as complete
2. `DATABASE_CONFLICT_AUDIT.md` - Update status
3. Add comment to `lib/cryptoku-store.ts` if keeping:
   ```typescript
   /**
    * @deprecated This file contains legacy Vercel KV code.
    * Only type definitions are kept for backwards compatibility.
    * All functionality has been migrated to Supabase.
    */
   ```

---

## Step 5: Verification

**After cleanup, verify:**
- [ ] No Vercel KV imports in active code
- [ ] All API routes use Supabase
- [ ] No runtime errors about missing KV env vars
- [ ] Tests pass (if applicable)

---

## Safe to Delete Files

1. `lib/cryptoku-store.ts` - After extracting types (if needed)
2. `lib/apein-store.ts` - If Ape In uses Supabase

## Safe to Keep (By Design)

1. `lib/profile-storage.ts` - Client-side cache (intentional)
2. localStorage usage in services - Migration/fallback (intentional)

---

## Execution Order

1. ✅ **DONE:** Created `lib/cryptoku-stats.ts` (Supabase replacement)
2. ✅ **DONE:** Updated `app/api/cryptoku/submit-result/route.ts`
3. **TODO:** Remove unused functions from `lib/cryptoku-store.ts`
4. **TODO:** Review and remove `lib/apein-store.ts`
5. **TODO:** Remove `@vercel/kv` package
6. **TODO:** Update documentation

---

## Risk Assessment

**Risk Level:** LOW
- Unused code doesn't cause runtime errors
- Cleanup is safe (code not imported)
- Can be done incrementally

**Recommendation:** Perform cleanup in next maintenance window
