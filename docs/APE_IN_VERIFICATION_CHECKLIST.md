# Ape In Migration Verification Checklist
**Date:** 2025-01-10  
**Purpose:** Verify all functionality works before removing `ape-in-source/` folder

## Pre-Verification: Backup Strategy

### 1. Create Backup Archive
```bash
# Create a timestamped backup of ape-in-source
cd /home/apedev/crypto-rabbit-hole-arcade
tar -czf ape-in-source-backup-$(date +%Y%m%d-%H%M%S).tar.gz features/games/ape-in-source/
```

### 2. Verify Backup Created
- [ ] Backup archive exists
- [ ] Backup size > 0
- [ ] Backup contains expected files

---

## Verification Tests

### Test 1: Build Verification
**Run:** `npm run build`
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No missing dependencies
- [ ] All API routes compile correctly

### Test 2: Development Server
**Run:** `npm run dev`
- [ ] Server starts successfully
- [ ] No runtime errors in console
- [ ] Arcade hub loads correctly

### Test 3: Arcade Hub Integration
**Navigate to:** `/` (home page)
- [ ] "Ape In!" cabinet displays
- [ ] Clicking "START GAME" opens GameModal
- [ ] GameModal renders ApeInGame component (not iframe)
- [ ] No console errors

### Test 4: Game Flow - Sandy (Tutorial)
**Steps:**
1. Click "START GAME" on Ape In cabinet
2. Wait for splash screen
3. Wait for main menu
4. Select "Sandy" mode
5. Complete intro (or skip)
6. Play game

**Verify:**
- [ ] Splash screen displays correctly
- [ ] Main menu displays all 8 modes
- [ ] Sandy mode launches without errors
- [ ] Intro screen displays (or can be skipped)
- [ ] Game board renders correctly
- [ ] Can draw cards
- [ ] Can roll dice
- [ ] Bot takes turns
- [ ] Bot actions replay correctly
- [ ] Can stack sats
- [ ] Game ends when winner reaches winning score
- [ ] Game over screen displays
- [ ] Can return to arcade hub

### Test 5: API Routes - Game Creation
**Test:** Create game via API
```bash
curl -X POST http://localhost:3000/api/ape-in/game/create \
  -H "Content-Type: application/json" \
  -d '{"mode":"sandy","playerName":"TestPlayer","walletAddress":null,"isDailyFree":false}'
```

**Verify:**
- [ ] API responds with 200 status
- [ ] Response contains `gameId`
- [ ] Response contains game state with all required fields
- [ ] `winningScore` is set correctly (150 for Sandy)
- [ ] `opponentName` is set correctly ("Sandy")
- [ ] `playerName` matches input

### Test 6: API Routes - Draw Card
**Test:** Draw card for created game
```bash
# Replace {gameId} with actual game ID from Test 5
curl -X POST http://localhost:3000/api/ape-in/game/{gameId}/draw \
  -H "Content-Type: application/json"
```

**Verify:**
- [ ] API responds with card object
- [ ] Card has `name`, `type`, `value`, `image_url`
- [ ] Card is valid (not null)
- [ ] Game state updated with current card

### Test 7: API Routes - Roll Dice
**Test:** Roll dice for game with current card
```bash
curl -X POST http://localhost:3000/api/ape-in/game/{gameId}/roll \
  -H "Content-Type: application/json"
```

**Verify:**
- [ ] API responds with roll result
- [ ] Result contains `value` (1-6)
- [ ] Result contains `success` (boolean)
- [ ] If player busts, `botActions` array is returned
- [ ] Bot actions are valid

### Test 8: API Routes - Stack Sats
**Test:** Stack current turn score
```bash
curl -X POST http://localhost:3000/api/ape-in/game/{gameId}/stack \
  -H "Content-Type: application/json"
```

**Verify:**
- [ ] API responds with updated game state
- [ ] Player score increased by turn score
- [ ] Turn score reset to 0
- [ ] Bot takes turn automatically
- [ ] `botActions` array returned if bot plays

### Test 9: Weighted Card Drawing
**Verify in Gameplay:**
- [ ] Cards are drawn randomly (not sequential)
- [ ] Cipher cards appear more frequently than special cards
- [ ] Bearish cards are rare
- [ ] Oracle and Historacle cards appear occasionally
- [ ] "Ape In!" special card can appear

### Test 10: Bot AI Behavior
**Verify in Gameplay:**
- [ ] Bot makes decisions based on turn score
- [ ] Bot stacks at appropriate times
- [ ] Bot risk-taking varies by difficulty
- [ ] Bot actions replay correctly (sequential animations)
- [ ] Bot dice rolls use correct profiles

### Test 11: Game Modes - Sandy
**Test:** Complete full game
- [ ] Game can be won by reaching 150 sats
- [ ] Game can be won by opponent reaching 150 sats
- [ ] Game can be forfeited
- [ ] Points calculated correctly on win
- [ ] No points awarded for Sandy (tutorial)

### Test 12: Game Modes - Aida (if wallet connected)
**Test:** Launch Aida mode
- [ ] Payment validation runs
- [ ] Game creates successfully
- [ ] Winning score is 300
- [ ] Max rounds is 20
- [ ] Bot uses Aida AI profile

### Test 13: Error Handling
**Test scenarios:**
- [ ] Invalid game ID returns 404
- [ ] Missing required fields returns 400
- [ ] Invalid mode returns 400
- [ ] Game not found errors handled gracefully
- [ ] Network errors don't crash the app

### Test 14: Image Assets
**Verify:**
- [ ] Bot avatars load correctly (Sandy, Aida, Lana, En-J1n, Nifty)
- [ ] Card images load correctly
- [ ] Cardback image loads
- [ ] No broken image placeholders
- [ ] Images use correct paths (`/features/games/ape-in/assets/...`)

### Test 15: Environment Variables
**Check:** All required env vars are accessible
- [ ] `NEXT_PUBLIC_RPC_URL` (if using ApeCoin features)
- [ ] `NEXT_PUBLIC_TOKEN_ADDRESS` (if using payment)
- [ ] `NEXT_PUBLIC_ZKVERIFY_API_KEY` (if using verification)
- [ ] Missing env vars don't crash the app

### Test 16: No External Dependencies
**Verify:**
- [ ] No calls to `ape-in-game-backend.onrender.com`
- [ ] No calls to external Render.com URLs
- [ ] All API calls use relative URLs (`/api/ape-in`)
- [ ] No WebSocket connections to external servers
- [ ] Game works offline (except for wallet features)

### Test 17: Console Errors
**Check browser console during gameplay:**
- [ ] No TypeScript errors
- [ ] No undefined property errors
- [ ] No missing module errors
- [ ] No API errors (unless intentional)
- [ ] No image loading errors

### Test 18: Performance
**Verify:**
- [ ] Game loads quickly (< 3 seconds)
- [ ] Card draws are responsive (< 500ms)
- [ ] Dice rolls are instant
- [ ] Bot turn replay is smooth
- [ ] No memory leaks during extended play

### Test 19: Cross-Browser Compatibility
**Test in:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### Test 20: Mobile Responsiveness (if applicable)
**Verify:**
- [ ] Game renders on mobile viewport
- [ ] Touch controls work
- [ ] UI elements are accessible
- [ ] No horizontal scrolling issues

---

## Comparison: Old vs New Implementation

### Feature Parity Check
Compare functionality between old (`ape-in-source/`) and new implementation:

#### Game Logic
- [ ] Card values match (Oracle=13, Historacle=21, etc.)
- [ ] Dice mechanics identical
- [ ] Bot AI behavior similar
- [ ] Winning conditions same
- [ ] Round limits enforced correctly

#### Game Modes
- [ ] Sandy: Same difficulty and rules
- [ ] Aida: Same difficulty and rules
- [ ] Lana: Same difficulty and rules
- [ ] En-J1n: Same difficulty and rules
- [ ] Nifty: Same difficulty and rules

#### UI/UX
- [ ] Same splash screen flow
- [ ] Same main menu layout
- [ ] Same game board design
- [ ] Same intro screens
- [ ] Same game over screen

---

## Post-Verification: Safe Removal

### Before Removing `ape-in-source/`
1. [ ] All verification tests pass
2. [ ] Backup archive created and verified
3. [ ] Build succeeds in production mode
4. [ ] Deployed version works (if deployed)

### Removal Command
```bash
# After verification complete
cd /home/apedev/crypto-rabbit-hole-arcade
rm -rf features/games/ape-in-source/
```

### Post-Removal Verification
1. [ ] Build still succeeds
2. [ ] Game still launches
3. [ ] No import errors
4. [ ] No missing file errors

---

## Rollback Plan (if needed)

If verification fails, restore from backup:
```bash
# Extract backup
tar -xzf ape-in-source-backup-YYYYMMDD-HHMMSS.tar.gz

# Verify files restored
ls -la features/games/ape-in-source/
```

---

## Notes
- Keep backup for at least 30 days after successful verification
- Document any differences found between old and new implementation
- Report any bugs found during verification

