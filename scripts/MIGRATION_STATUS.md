# Cryptoku Hints & Ape In Free Plays - Migration Status

## Migration Completed: [DATE]

### What Was Migrated

1. **Cryptoku Hints** (`cryptoku_hints` table)
   - Hint balances
   - Total ranked games completed
   - Reward tracking

2. **Ape In Free Plays** (`ape_in_daily_free_plays` table)
   - Daily free play usage (5 per day per mode)
   - Tracks: aida, lana, enj1n, nifty modes

### How Migration Works

**Automatic Migration (Current Strategy):**
- Migration happens automatically on first user access
- When a user accesses hints or free plays:
  1. Service checks if Supabase record exists
  2. If not, migrates data from localStorage → Supabase
  3. Clears localStorage after successful migration
  4. Future access uses Supabase only

**localStorage Keys Being Migrated:**
- `cryptoku_hints_{wallet_address}` → `cryptoku_hints` table
- `dailyFreePlays_{wallet_address}` → `ape_in_daily_free_plays` table

### Migration Status

- ✅ SQL tables created
- ✅ SQL functions created
- ✅ API routes updated
- ✅ Services with migration logic deployed
- ✅ Automatic migration active

### Next Steps

**Recommended Timeline:**

1. **Week 1-2**: Monitor migration
   - Check Supabase tables for new records
   - Monitor console logs for migration success/failures
   - Verify data integrity

2. **Week 2-3**: Optional cleanup
   - Consider adding cleanup script if needed
   - Clear localStorage for migrated users (optional)

3. **Week 4+**: Verification
   - Verify all active users have been migrated
   - Consider removing migration code after extended period (optional)

### Optional: Manual Cleanup Script

If you want to force-clear localStorage after a grace period, you can create a cleanup script:

```javascript
// Optional cleanup script (run in browser console)
// Only run after confirming migration is working for a period of time

const keysToClean = [
  'cryptoku_hints_',
  'dailyFreePlays_'
];

// Clear all matching localStorage keys
Object.keys(localStorage).forEach(key => {
  keysToClean.forEach(prefix => {
    if (key.startsWith(prefix)) {
      console.log(`Clearing: ${key}`);
      localStorage.removeItem(key);
    }
  });
});
```

**Note:** Only run cleanup after:
- Migration has been running successfully for at least 2 weeks
- You've verified data is correctly stored in Supabase
- You've confirmed no errors in migration logs

### Monitoring

Check migration status in Supabase:
```sql
-- Check Cryptoku hints migration progress
SELECT COUNT(*) as migrated_users FROM cryptoku_hints;

-- Check Ape In free plays migration progress  
SELECT COUNT(DISTINCT user_id) as migrated_users FROM ape_in_daily_free_plays;
```

Check browser console for migration logs:
- `[CryptokuHintsService] Successfully migrated hints from localStorage`
- `[ApeInFreePlaysService] Migrated X free plays from localStorage`

