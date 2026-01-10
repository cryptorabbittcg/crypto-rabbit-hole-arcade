# Quick Verification Guide - Before Removing ape-in-source

## ✅ Automated Verification: PASSED (25/25)

All automated checks passed! The verification script confirmed:
- ✅ All files in place
- ✅ No Render.com dependencies
- ✅ No ape-in-source imports
- ✅ No Vite env vars
- ✅ Proper integration with arcade hub
- ✅ All assets exist

---

## 🚀 Quick Start Verification

### Step 1: Create Backup (REQUIRED)
```bash
cd /home/apedev/crypto-rabbit-hole-arcade
./scripts/backup-ape-in-source.sh
```

This will create: `ape-in-source-backup-YYYYMMDD-HHMMSS.tar.gz`

**Verify backup:**
```bash
ls -lh ape-in-source-backup-*.tar.gz
tar -tzf ape-in-source-backup-*.tar.gz | head -20
```

### Step 2: Build Test
```bash
npm run build
```

**Expected:** Build completes without errors

### Step 3: Start Dev Server
```bash
npm run dev
```

**Expected:** Server starts on http://localhost:3000

### Step 4: Test Game in Browser

1. **Navigate to:** http://localhost:3000
2. **Click:** "START GAME" on Ape In cabinet
3. **Verify:**
   - Splash screen appears ✅
   - Main menu loads with all 8 modes ✅
   - Select "Sandy" mode
   - Game launches ✅
   - Can draw cards ✅
   - Can roll dice ✅
   - Bot takes turns ✅
   - Game ends correctly ✅

### Step 5: Check Browser Console

Open DevTools (F12) → Console tab:
- ✅ No red errors
- ✅ API calls succeed (status 200)
- ✅ No missing module errors

### Step 6: Test API Directly (Optional)

```bash
# Create a game
curl -X POST http://localhost:3000/api/ape-in/game/create \
  -H "Content-Type: application/json" \
  -d '{"mode":"sandy","playerName":"TestPlayer","walletAddress":null,"isDailyFree":false}'

# Should return JSON with gameId and game state
```

---

## ✅ Verification Checklist

Before removing `ape-in-source/`, verify:

- [ ] Backup created and verified
- [ ] Build succeeds: `npm run build`
- [ ] Dev server starts: `npm run dev`
- [ ] Game launches from arcade hub
- [ ] Sandy mode works end-to-end
- [ ] No console errors
- [ ] API routes respond correctly
- [ ] All game modes display in menu (at least Sandy launches)

---

## 🗑️ Safe Removal

Once all checks pass:

```bash
# Double-check backup exists
ls -lh ape-in-source-backup-*.tar.gz

# Remove folder
rm -rf features/games/ape-in-source/

# Verify build still works
npm run build
```

---

## 🔄 Rollback (if needed)

If you encounter issues:

```bash
# Extract backup
tar -xzf ape-in-source-backup-YYYYMMDD-HHMMSS.tar.gz

# Verify files restored
ls -la features/games/ape-in-source/
```

---

## 📊 Verification Results Summary

**Automated Checks:** ✅ 25/25 PASSED  
**Status:** Ready for manual verification

**Next:** Complete manual tests above, then remove folder safely.

