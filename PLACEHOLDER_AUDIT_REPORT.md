# Placeholder Audit Report

**Date:** January 17, 2026  
**Audit Scope:** Complete project audit for placeholders, mock data, hardcoded values, and TODO items

---

## 🔴 CRITICAL - Must Replace Before Production

### 1. Hardcoded Values in UI Components

#### **APE Balance (Hardcoded)**
- **Location:** `features/arcade/arcade-hub.tsx:15`
- **Value:** `"125.50"`
- **Issue:** Hardcoded APE balance displayed in hub
- **Action Required:** Replace with actual wallet balance from `apeBalance` context or API

```typescript
const [apeBalance] = useState("125.50")  // ❌ Hardcoded
```

#### **Player Counts (Hardcoded)**
- **Location:** `features/arcade/arcade-hub.tsx:242, 251`
- **Values:** `players={38}`, `players={42}`
- **Issue:** Hardcoded player counts for Ape In and Cryptoku
- **Action Required:** Replace with actual player counts from database/API

```typescript
<ArcadeCabinet players={38} ... />  // ❌ Hardcoded
<ArcadeCabinet players={42} ... />  // ❌ Hardcoded
```

#### **Waitlist Form URL (Placeholder)**
- **Location:** `app/ciphers-sentinels/page.tsx`
- **Value:** `"https://forms.gle/REPLACE_ME"`
- **Issue:** Broken link - form URL not set
- **Action Required:** Replace with actual Google Form URL

### 2. Placeholder Links

#### **URL Hash Placeholder**
- **Location:** `features/arcade/arcade-hub.tsx:241`
- **Value:** `url="#"` 
- **Status:** ✅ **INTENTIONAL** - Used to trigger component render (not iframe)
- **Note:** This is documented as intentional for Ape In component rendering

### 3. "Coming Soon" Features

#### **Social Raids**
- **Location:** `features/social/social-raids.tsx:71, 121, 177, 237, 245`
- **Issue:** Multiple "Coming Soon" messages for raid features
- **Action Required:** Implement actual raid functionality or remove UI

#### **Topbar - Golden Tickets**
- **Location:** `components/topbar.tsx:40`
- **Text:** `"Coming Soon"`
- **Action Required:** Implement Golden Tickets feature or remove from UI

#### **Ciphers Sentinels - Mint Status**
- **Location:** `app/ciphers-sentinels/page.tsx:97, 106`
- **Text:** `"Mint Coming Soon"`
- **Action Required:** Implement minting or update messaging

#### **Pack Minter**
- **Location:** `features/tcg/pack-minter.tsx:206, 368, 372`
- **Text:** `"coming soon"`, `"Coming Soon"`, `"Rip Pack (Coming Soon)"`
- **Action Required:** Implement pack purchasing/ripping functionality

#### **Admin Panel - User Management**
- **Location:** `features/admin/admin-panel.tsx:361`
- **Text:** `"User management interface coming soon"`
- **Action Required:** Implement admin user management or remove section

#### **Profile View - Golden Tickets**
- **Location:** `components/profile-menu.tsx:212` (if present)
- **Text:** `"Coming Soon"` for Golden Tickets
- **Action Required:** Implement feature or remove from UI

---

## 🟡 MEDIUM PRIORITY - Development/Testing Code

### 4. Mock Functions & Test Code

#### **Mock ZK Verification**
- **Location:** `features/games/cryptoku/components/logic/zkverify.ts:225`
- **Function:** `mockVerifySudoku()`
- **Issue:** Mock verification used when zkVerify unavailable
- **Status:** ⚠️ Acceptable for fallback, but should be clearly marked as dev-only
- **Note:** Has proper fallback logic, but mock proof ID: `"mock-proof-" + Date.now()`

#### **Mock Otherside Presence**
- **Location:** `adapters/otherside.adapter.ts:1-7`
- **Issue:** Returns random mock data (online: 100-150, fake worlds)
- **Action Required:** Implement actual Otherside SDK integration or remove adapter

```typescript
return {
  online: Math.floor(Math.random() * 50) + 100,  // ❌ Mock data
  worlds: ["Arcade-1", "TCG-Arena", "Crypto-Lounge"],  // ❌ Mock data
}
```

#### **TODO: Payment Service**
- **Location:** `features/games/ape-in/lib/paymentService.ts:100`
- **Comment:** `// TODO: Implement actual blockchain transaction`
- **Action Required:** Implement actual blockchain payment processing

#### **Empty Leaderboard (Fallback)**
- **Location:** `features/leaderboard/leaderboard-view.tsx:31-42`
- **Issue:** Hardcoded empty leaderboard as fallback
- **Status:** ✅ Acceptable as fallback UI, but ensure data loading works

### 5. Placeholder Images

#### **NFT Avatar Fallback**
- **Location:** `features/profile/nft-avatar-dialog.tsx:90, 95`
- **Fallback:** `"/placeholder.svg"`
- **Issue:** Uses placeholder image when NFT image fails to load
- **Action Required:** Ensure placeholder.svg exists, or use better fallback image

#### **Image Placeholder Component**
- **Location:** `app/ciphers-sentinels-mint/page.tsx:8`
- **Import:** `ImagePlaceholder` component
- **Status:** ✅ Component-based placeholder is acceptable

---

## 🟢 LOW PRIORITY - Documentation/Config

### 6. SQL Seed Data (Test Data)

#### **Test Profiles (Commented Out)**
- **Location:** `scripts/04-seed-data.sql:23-29`
- **Status:** ✅ **SAFE** - Commented out test data, not active
- **Note:** Wallet addresses like `0x1111...1111` are clearly test data

#### **Seed Social Raids**
- **Location:** `scripts/04-seed-data.sql:10-17`
- **Status:** ⚠️ Contains placeholder URLs (`https://twitter.com/cryptorabbithole`, etc.)
- **Action Required:** Verify URLs are correct before running in production

### 7. Localhost URLs

#### **Development URLs (Multiple Files)**
- **Locations:** 
  - `components/game-modal.tsx:326-327`
  - Various documentation files
- **Status:** ✅ **ACCEPTABLE** - Used for development CORS/allowed origins
- **Note:** Should use environment variables for production URLs

---

## 📋 TODO / FIXME Comments

### High Priority TODOs

1. **Payment Service Implementation**
   - **File:** `features/games/ape-in/lib/paymentService.ts:100`
   - **Comment:** `// TODO: Implement actual blockchain transaction`
   - **Priority:** 🔴 HIGH

2. **Otherside SDK Integration**
   - **File:** `adapters/otherside.adapter.ts`
   - **Issue:** Mock data instead of actual SDK
   - **Priority:** 🟡 MEDIUM

### Not Implemented Errors

1. **Tournament Mode**
   - **File:** `features/games/ape-in-source/backend/app/services/tournament_service.py`
   - **Multiple:** `NotImplementedError("Tournament mode coming soon!")`
   - **Priority:** 🟡 MEDIUM (feature not yet needed)

---

## 🔍 Placeholder Patterns Found

### Summary by Category

| Category | Count | Priority | Status |
|----------|-------|----------|--------|
| Hardcoded Values | 3 | 🔴 CRITICAL | Needs replacement |
| "Coming Soon" Features | 7 | 🟡 MEDIUM | Needs implementation or removal |
| Mock Functions | 2 | 🟡 MEDIUM | Needs real implementation |
| Placeholder Images | 2 | 🟢 LOW | Acceptable with proper fallbacks |
| TODO Comments | 2 | Varies | Track in issue tracker |
| Test/Seed Data | 1 | 🟢 LOW | Safe (commented out) |

---

## 📝 Recommendations

### Immediate Actions Required

1. **Replace Hardcoded Values:**
   - Remove `"125.50"` APE balance → Use `apeBalance` from context
   - Replace `players={38}` and `players={42}` → Fetch from database/API

2. **Update Waitlist URL:**
   - Replace `"https://forms.gle/REPLACE_ME"` with actual form URL

3. **Review "Coming Soon" Features:**
   - Decide which features to implement vs. remove from UI
   - If removing, clean up UI to avoid user confusion

### Future Improvements

1. **Environment-Based Configuration:**
   - Move localhost URLs to environment variables
   - Use different configs for dev/staging/production

2. **Implement Mock Replacements:**
   - Replace `mockVerifySudoku` with proper zkVerify integration
   - Replace Otherside mock with actual SDK

3. **Testing:**
   - Ensure all placeholder fallbacks work correctly
   - Test with missing images, failed API calls, etc.

---

## ✅ Acceptable Placeholders

The following are **INTENTIONAL** and **ACCEPTABLE**:

1. **URL Hash for Component Trigger** (`url="#"`)
   - Used to trigger React component rendering (not navigation)
   - Documented in code comments

2. **Placeholder Images with Fallbacks**
   - `placeholder.svg` for failed NFT image loads
   - Component-based `ImagePlaceholder` usage

3. **Empty State Fallbacks**
   - Empty leaderboard array for loading states
   - "No data" messages in UI

4. **Development URLs in Documentation**
   - Localhost URLs in `.md` files for examples
   - Development environment configurations

---

## 🚨 Production Readiness

**Before deploying to production, ensure:**

- [ ] All hardcoded values replaced with dynamic data
- [ ] Waitlist form URL updated
- [ ] "Coming Soon" features either implemented or removed
- [ ] Mock functions replaced with real implementations
- [ ] All placeholder images exist and load correctly
- [ ] Test/seed data not included in production build
- [ ] Environment variables configured for production URLs

---

**End of Report**
