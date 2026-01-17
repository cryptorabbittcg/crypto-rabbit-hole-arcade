# Clear Game Data - Guide

## 🎯 What This Does

Clears all game-related data while **preserving**:
- ✅ User profiles (wallet addresses, usernames, avatars)
- ✅ Database structure (tables, functions, RLS policies)
- ✅ Profile balances (APE, tickets, points) - **by default**

## 📋 Data That Will Be Cleared

### Main Data Cleared:
1. **Game Sessions** - All game session records
2. **Cryptoku Leaderboard** - All Cryptoku game entries
3. **Main Leaderboard** - Reset scores to 0 (total_points, cryptoku_high_score, etc.)
4. **Profile Game Stats** - Reset to 0:
   - total_games_played
   - total_wins
   - total_losses
   - win_streak
   - best_win_streak
   - total_playtime
5. **Cryptoku Hints** - Reset to default (3 hints, 0 completed)
6. **Game Transactions** - Clear game reward transactions
7. **PvP/Match Data** - Clear match history and PvP matches

### Data Preserved (by default):
- ✅ Profile balances (APE, tickets, points)
- ✅ User profiles (wallet, username, avatar)
- ✅ Card inventory (commented out - uncomment to clear)
- ✅ Upgrades inventory (commented out - uncomment to clear)
- ✅ Pack openings (commented out - uncomment to clear)
- ✅ Achievements (commented out - uncomment to clear)
- ✅ Other transactions (purchases, etc.)

## 🚀 How to Use

### Option 1: Standard Cleanup (Recommended)
Run: `CLEAR_ALL_GAME_DATA.sql`

This will:
- ✅ Clear all game data
- ✅ Reset leaderboards to 0
- ✅ Reset profile stats
- ✅ Keep balances and inventory

### Option 2: Choose Your Level
See: `CLEAR_GAME_DATA_OPTIONS.sql` for different cleanup levels:
- **MINIMAL** - Reset stats only
- **MODERATE** - Stats + leaderboards
- **COMPLETE** - Full reset (recommended)
- **NUCLEAR** - Everything including balances

## ⚠️ Important Notes

1. **This is PERMANENT** - Data cannot be recovered after deletion
2. **Make a backup** if you want to restore later
3. **Points are cleared** - Both in profiles and leaderboard
4. **APE and tickets are preserved** by default - uncomment lines in the script to reset them
5. **Transactions** - Game-related and points transactions are cleared, purchases are kept

## 🔍 Before Running

Check what will be affected:
```sql
SELECT 
  (SELECT COUNT(*) FROM game_sessions) as game_sessions,
  (SELECT COUNT(*) FROM cryptoku_leaderboard) as cryptoku_entries,
  (SELECT COUNT(*) FROM profiles WHERE total_games_played > 0) as profiles_with_games,
  (SELECT SUM(total_points) FROM leaderboard) as total_points;
```

## ✅ After Running

Verify cleanup:
```sql
SELECT 
  'Game sessions' as check_name,
  COUNT(*) as count
FROM game_sessions
UNION ALL
SELECT 
  'Cryptoku entries',
  COUNT(*)
FROM cryptoku_leaderboard
UNION ALL
SELECT 
  'Profiles with games',
  COUNT(*)
FROM profiles
WHERE total_games_played > 0;
```

All should return 0 (except profiles with games if you kept balances).

## 🎮 What Happens Next

After clearing:
1. ✅ All leaderboards will be empty/fresh
2. ✅ Profile stats reset to 0
3. ✅ Game sessions cleared
4. ✅ Players can start fresh
5. ✅ New games will log properly
6. ✅ Leaderboards will populate as players play

## 🔧 Customization

To also reset balances, uncomment these lines in `CLEAR_ALL_GAME_DATA.sql`:
```sql
-- ape_balance = 1000,
-- tickets = 5,
-- points = 0,
```

To also clear inventory/achievements, uncomment the DELETE statements in Section 7-8.
