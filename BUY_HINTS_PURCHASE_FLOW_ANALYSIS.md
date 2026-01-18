# BUY HINTS PURCHASE FLOW - ANALYSIS REPORT

## Executive Summary

The "Buy hints" button currently grants 10 hints **instantly without any wallet transaction or payment verification**. The purchase flow calls an API route that directly adds hints to the database via a SQL function. There is **NO transaction verification, NO payment gateway, and NO wallet integration** in the purchase flow.

---

## 1) CURRENT "BUY HINTS" FLOW

### 1.1 UI Component & Button Location

**File:** `features/games/cryptoku/cryptokugame.tsx`
- **Line 1902-1908:** "Buy Hints" button rendered in UI
  ```tsx
  <button
    onClick={purchaseHint}
    className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border border-emerald-400 bg-gradient-to-b from-emerald-900/50 to-emerald-800/50 font-bold text-[11px] md:text-xs hover:shadow-lg hover:shadow-emerald-400/30 transition-all text-emerald-400"
    title="Purchase 10 hints for 1.0 $APE"
  >
    💰 Buy Hints
  </button>
  ```

### 1.2 Handler Function

**File:** `features/games/cryptoku/cryptokugame.tsx`
- **Lines 1053-1079:** `purchaseHint` callback function
  ```tsx
  const purchaseHint = useCallback(async () => {
    if (!playerAddress) {
      showToastMessage("Player address required")
      return
    }

    try {
      const response = await fetch("/api/cryptoku/hints/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: playerAddress, amount: 10 }),
      })

      if (!response.ok) {
        const data = await response.json()
        showToastMessage(data.error || "Failed to purchase hints")
        return
      }

      const data = await response.json()
      setHintBalance(data.hintBalance)
      showToastMessage(data.message || "Purchased 10 hints for 1.0 $APE (stub)")
    } catch (error) {
      console.error("Error purchasing hints:", error)
      showToastMessage("Failed to purchase hints")
    }
  }, [playerAddress, showToastMessage])
  ```

**Key Observations:**
- Hardcoded `amount: 10` in request body (line 1063)
- No transaction hash, no payment verification
- Success message includes "(stub)" indicating placeholder implementation
- Directly updates `hintBalance` state from API response

### 1.3 API Route Handler

**File:** `app/api/cryptoku/hints/purchase/route.ts`
- **Lines 5-51:** POST handler for `/api/cryptoku/hints/purchase`
  ```typescript
  export async function POST(request: NextRequest) {
    try {
      const body = await request.json()
      const { address, amount = 10 } = body // Default: 10 hints for 1.0 $APE

      if (!address) {
        return NextResponse.json({ error: "Address required" }, { status: 400 })
      }

      if (amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
      }

      // TODO: Integrate with Glyph transaction verification
      // For now, this is a stub that always succeeds
      const hintsService = new CryptokuHintsService()
      const profileService = new ProfileService()
      
      // Get profile to get user_id
      const profile = await profileService.getProfileByWallet(address)
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 })
      }

      // Purchase hints (atomic operation)
      const result = await hintsService.purchaseHints(profile.id, amount)

      if (!result.success) {
        return NextResponse.json(
          { 
            error: result.error || "Failed to purchase hints",
            hintBalance: result.hints.hintBalance 
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        hintBalance: result.hints.hintBalance,
        message: `Purchased ${amount} hints for 1.0 $APE (stub - transaction verification pending)`,
      })
    } catch (error) {
      console.error("Error purchasing hints:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
  ```

**Critical Issue:** 
- **Line 18:** Comment explicitly states: `// TODO: Integrate with Glyph transaction verification`
- **Line 19:** Comment: `// For now, this is a stub that always succeeds`
- **No transaction verification** - hints are granted immediately

### 1.4 Database Function (Where Hints Are Actually Granted)

**File:** `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql`
- **Lines 217-260:** `purchase_cryptoku_hints` SQL function
  ```sql
  CREATE OR REPLACE FUNCTION purchase_cryptoku_hints(
    p_user_id UUID,
    p_amount INTEGER
  )
  RETURNS JSON
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'pg_catalog, public'
  AS $$
  DECLARE
    v_new_balance INTEGER;
    v_total_completed INTEGER;
    v_games_until_next INTEGER;
  BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Invalid amount'
      );
    END IF;
    
    -- Ensure record exists (create if doesn't)
    PERFORM ensure_cryptoku_hints(p_user_id);
    
    -- Add purchased hints
    UPDATE cryptoku_hints
    SET 
      hint_balance = hint_balance + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING hint_balance, total_ranked_completed
    INTO v_new_balance, v_total_completed;
    
    -- Calculate games until next free hint
    v_games_until_next := 10 - (v_total_completed % 10);
    
    RETURN json_build_object(
      'success', true,
      'hintBalance', v_new_balance,
      'gamesUntilNextFreeHint', v_games_until_next
    );
  END;
  $$;
  ```

**Critical Issue:**
- **Lines 243-248:** Directly increments `hint_balance` without any payment verification
- No transaction record, no payment check, no validation

### 1.5 Service Layer

**File:** `lib/supabase/services/cryptoku-hints.service.ts`
- **Lines 185-229:** `purchaseHints` method
  ```typescript
  async purchaseHints(userId: string, amount: number): Promise<{
    success: boolean
    hints: PlayerHints
    error?: string
  }> {
    try {
      if (!this.isConfigured()) {
        return { success: false, hints: HINTS_DEFAULT, error: "Database not configured" }
      }

      if (amount <= 0) {
        return { success: false, hints: HINTS_DEFAULT, error: "Invalid amount" }
      }

      const { data, error } = await this.supabase.rpc("purchase_cryptoku_hints", {
        p_user_id: userId,
        p_amount: amount,
      })

      if (error) {
        console.error("[CryptokuHintsService] Error purchasing hints:", error)
        return { success: false, hints: HINTS_DEFAULT, error: error.message }
      }

      if (!data.success) {
        return {
          success: false,
          hints: await this.getHints(userId),
          error: data.error || "Failed to purchase hints",
        }
      }

      return {
        success: true,
        hints: {
          hintBalance: data.hintBalance,
          gamesUntilNextFreeHint: data.gamesUntilNextFreeHint,
          totalRankedCompleted: (await this.getHints(userId)).totalRankedCompleted,
        },
      }
    } catch (error) {
      console.error("[CryptokuHintsService] Exception purchasing hints:", error)
      return { success: false, hints: HINTS_DEFAULT, error: "Internal error" }
    }
  }
  ```

**Summary:**
- Simply calls the SQL RPC function with no payment validation
- Uses regular Supabase client (not admin client)

### 1.6 Where the Number "10" Comes From

- **Client-side hardcoded:** `features/games/cryptoku/cryptokugame.tsx` line 1063
- **API route default:** `app/api/cryptoku/hints/purchase/route.ts` line 8 (`amount = 10`)
- **UI display:** Implies "10 hints for 1.0 $APE" but no actual payment occurs

### 1.7 Storage Type: Database vs Client State

**Database Storage:**
- Table: `cryptoku_hints` (column: `hint_balance`)
- **File:** `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql` lines 15-16
  ```sql
  hint_balance INTEGER DEFAULT 3 NOT NULL CHECK (hint_balance >= 0),
  ```
- Persisted in Supabase, not just client-side state
- Default is 3 free hints on first game

**Client State:**
- **File:** `features/games/cryptoku/cryptokugame.tsx` line 552
  ```tsx
  const [hintBalance, setHintBalance] = useState(3)
  ```
- Loaded from API on mount (line 612): `/api/cryptoku/hints/balance`
- Updated after purchase (line 1073): `setHintBalance(data.hintBalance)`

**Conclusion:** Hints are stored in the database (`cryptoku_hints.hint_balance`), but the purchase flow grants them without payment.

---

## 2) HOW HINTS ARE STORED

### 2.1 Database Schema

**Table:** `cryptoku_hints`
- **Migration file:** `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql`
- **Lines 1-30:** Table definition
  ```sql
  CREATE TABLE IF NOT EXISTS cryptoku_hints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Hint balance and rewards
    hint_balance INTEGER DEFAULT 3 NOT NULL CHECK (hint_balance >= 0),
    total_ranked_completed INTEGER DEFAULT 0 NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
  );
  ```

**Key Columns:**
- `hint_balance`: Current hint count (integer, >= 0)
- `total_ranked_completed`: Track games completed for free hint rewards
- `user_id`: Foreign key to `profiles.id`

### 2.2 How Hints Are Read

**Service:** `CryptokuHintsService.getHints()` or `getHintsByWallet()`
- **File:** `lib/supabase/services/cryptoku-hints.service.ts`
- **Lines 71-105:** `getHints(userId)` method
- **Lines 38-66:** `getHintsByWallet(walletAddress)` method

**API Route:** `/api/cryptoku/hints/balance`
- **File:** `app/api/cryptoku/hints/balance/route.ts`
- Returns: `{ hintBalance, gamesUntilNextFreeHint }`

**Client Usage:**
- **File:** `features/games/cryptoku/cryptokugame.tsx` line 612
  ```tsx
  const response = await fetch(`/api/cryptoku/hints/balance?address=${encodeURIComponent(playerAddress)}`)
  ```

### 2.3 How Hints Are Decremented During Gameplay

**When hint is used:**
- **Client:** `features/games/cryptoku/cryptokugame.tsx` line 1003
  ```tsx
  const response = await fetch("/api/cryptoku/hints/use", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: playerAddress }),
  })
  ```

**API Route:** `/api/cryptoku/hints/use`
- **File:** `app/api/cryptoku/hints/use/route.ts`
- Calls: `hintsService.useHint(profile.id)`

**SQL Function:** `use_cryptoku_hint`
- Decrements `hint_balance` atomically (within same migration file)
- Returns updated balance

### 2.4 `hintsUsed` in submit-result (Trusted or Server-Side?)

**File:** `app/api/cryptoku/submit-result/route.ts`
- **Line 52:** `hintsUsed` extracted from request body (client-provided)
- **Line 142:** Used in score calculation: `calculateScore(mode, timeSeconds, hintsUsed, errors, playerStats.cleanStreak)`
- **Line 24:** Penalty applied: `const hintPenalty = 15 * hintsUsed`

**Analysis:**
- `hintsUsed` is **TRUSTED from client** - not verified against database
- Could be exploited by submitting `hintsUsed: 0` even if hints were used
- However, scoring penalty is applied server-side, so incorrect `hintsUsed` would inflate score (which is undesirable for cheaters, but still a vulnerability)

**Recommendation:** Verify `hintsUsed` against actual hint consumption records if tracking is added in the future.

### 2.5 RPC Functions Touching Hints

1. **`ensure_cryptoku_hints(p_user_id)`**
   - Creates default hints record if missing
   - Sets `hint_balance = 3`

2. **`use_cryptoku_hint(p_user_id)`**
   - Decrements `hint_balance` by 1 atomically
   - Returns updated balance

3. **`reward_cryptoku_hint(p_user_id)`**
   - Grants free hints based on completed games
   - Called after game completion

4. **`purchase_cryptoku_hints(p_user_id, p_amount)`**
   - **THE PROBLEMATIC FUNCTION** - grants hints without payment
   - Directly increments `hint_balance`

---

## 3) CURRENT WALLET + APE BALANCE LOGIC

### 3.1 APE Contract Address

**File:** `lib/env.ts` line 8
```typescript
APE_ADDRESS: process.env.NEXT_PUBLIC_APE_ADDRESS || "0x4d224452801ACEd8B2F0aebE155379bb5D594381",
```

**Hardcoded default:** `0x4d224452801ACEd8B2F0aebE155379bb5D594381`

### 3.2 Chain Configuration

**ApeChain Mainnet:**
- **File:** `lib/chains.ts` lines 6-17
  ```typescript
  export const apeChainMainnet = defineChain({
    id: 33139,
    name: "ApeChain",
    nativeCurrency: { name: "ApeCoin", symbol: "APE", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.apechain.com"] },
    },
    blockExplorers: {
      default: apeScanExplorer,
    },
    testnet: false,
  })
  ```

**ChainId:** `33139` (ApeChain mainnet)

### 3.3 Balance Reading (ERC-20 vs Native)

**File:** `adapters/wallet.adapter.ts` lines 6-34
```typescript
export async function getApeBalance(address: string): Promise<string> {
  if (!address) return "0.0000"

  try {
    const contract = getContract({
      client: thirdwebClient,
      chain: apeChainMainnet,
      address: APE_ADDRESS,
    })

    const balance = await readContract({
      contract,
      method: "function balanceOf(address) view returns (uint256)",
      params: [address],
    })

    return (Number(balance) / 1e18).toFixed(4)
  } catch (error: any) {
    // Handle specific errors gracefully
    if (error?.message?.includes("Cannot decode zero data") || 
        error?.name === "AbiDecodingZeroDataError") {
      console.warn("Balance fetch returned empty data, wallet may not be ready yet")
      return "0.0000"
    }
    console.error("Error fetching APE balance:", error)
    return "0.0000"
  }
}
```

**Analysis:**
- **APE is treated as ERC-20 token** (calls `balanceOf()` on contract)
- Uses `thirdweb` client (`getContract`, `readContract`)
- Reads from contract `0x4d224452801ACEd8B2F0aebE155379bb5D594381`

**Conclusion:** APE is an ERC-20 token, NOT native balance. However, on ApeChain, native APE transfers might be possible via native token sending if the chain uses APE as native currency.

### 3.4 Wallet Integration (Glyph/Wagmi)

**Glyph Adapter:**
- **File:** `lib/auth-adapters/glyphAdapter.ts`
- Uses `useAccount`, `useDisconnect` from `wagmi`
- **No transaction sending code** in adapter (only connection/disconnection)

**Provider Setup:**
- **File:** `components/providers.tsx` line 12
  ```tsx
  import { useGlyphAdapter } from "@/lib/auth-adapters/glyphAdapter"
  ```
- Uses wagmi hooks for wallet state

**Missing:** No `useSendTransaction` or `useWriteContract` usage found in hints purchase flow.

### 3.5 Transaction Sending - CURRENT STATUS

**❌ NO TRANSACTION SENDING CODE FOUND**
- No `sendTransaction` calls
- No `writeContract` calls
- No Glyph transaction submission
- No payment verification

**Note:** The `.cursor/rules/llms.txt` file contains Glyph SDK API documentation (lines 3972-6160), but it's **not used** in the codebase for hints purchases.

---

## 4) EXISTING "SHOP / PURCHASE / PAYMENT" PATTERNS

### 4.1 Search Results

**Patterns Found:**
- **Ape In game** has payment service (stub/placeholder):
  - **File:** `features/games/ape-in/lib/paymentService.ts` line 101
    ```typescript
    // This would use Thirdweb's sendTransaction or contract interaction
    ```
  - Comment indicates it's also a stub

**No Real Purchase Flow Found:**
- No `create-intent` API pattern
- No `confirm` API pattern
- No transaction verification endpoints
- No payment tracking tables (other than generic `transactions` table for game rewards)

### 4.2 Generic Transactions Table

**File:** `scripts/01-create-tables.sql` lines 174-189
```sql
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL, -- 'pack_purchase', 'upgrade_purchase', 'reward', 'stake_reward', etc.
  amount INTEGER NOT NULL, -- positive for earning, negative for spending
  currency TEXT NOT NULL, -- 'ape', 'tickets', 'points'
  
  -- Context
  description TEXT,
  related_id UUID, -- reference to related record (game_session, upgrade, etc.)
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Analysis:**
- Could store hint purchase transactions here
- Currently used for game rewards only
- No blockchain transaction hash field (would need to be added)

---

## 5) SUPABASE + SECURITY CONTEXT

### 5.1 Admin Client Usage

**File:** `lib/supabase/admin.ts`
```typescript
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must not be used in the browser")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  }

  if (!serviceRoleKey) {
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY is not set...`)
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })
}
```

**Environment Variable:** `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

**Current Usage in Hints Purchase:**
- **❌ NOT USED** - `app/api/cryptoku/hints/purchase/route.ts` uses regular `CryptokuHintsService()` which uses `createClient()` (anon key)
- Other routes like `submit-result` use `createAdminClient()` for leaderboard writes

### 5.2 RLS Policies

**Files to Check:**
- `scripts/02-rls-policies.sql` (if exists)
- Migration files for hints table

**SQL Functions with SECURITY DEFINER:**
- `purchase_cryptoku_hints` (line 223): `SECURITY DEFINER` - bypasses RLS
- All hint functions use `SECURITY DEFINER`, allowing them to write without RLS checks

**Analysis:**
- Functions can bypass RLS, but API route still needs proper authentication
- Current implementation has no payment verification, so RLS bypass is irrelevant for security

### 5.3 Current "Buy hints" Security Status

**Bypasses RLS:** Yes (via SECURITY DEFINER function)
**Requires Payment:** ❌ No
**Requires Transaction Verification:** ❌ No
**Uses Admin Client:** ❌ No (uses anon client via service)

**Vulnerability:** Anyone with a wallet address can call the API and get free hints.

---

## 6) REQUIRED NEW PURCHASE FLOW - OUTLINE

### 6.1 Server Route: Create Purchase Intent

**New Endpoint:** `POST /api/cryptoku/hints/purchase-intent`

**Request:**
```typescript
{
  address: string,      // User's wallet address
  amount: number,       // Hints to purchase (default: 10)
  season: string        // Current season (optional)
}
```

**Response:**
```typescript
{
  intentId: string,     // Unique intent ID (store in DB temporarily)
  priceWei: string,     // Price in wei (e.g., "1000000000000000000" for 1 APE)
  recipient: string,    // Payment recipient address (needs to be defined)
  chainId: number,      // 33139 (ApeChain)
  expiresAt: number,    // Timestamp when intent expires
  amount: number        // Hints amount (10)
}
```

**Database Table (optional):**
- `hint_purchase_intents`
  - `id` (UUID)
  - `user_id` (UUID)
  - `intent_id` (TEXT, unique)
  - `amount` (INTEGER)
  - `price_wei` (TEXT)
  - `status` (TEXT: 'pending', 'completed', 'expired')
  - `created_at`, `expires_at`

### 6.2 Client: Open Glyph Transaction

**Location:** `features/games/cryptoku/cryptokugame.tsx` - modify `purchaseHint`

**New Flow:**
1. Call `/api/cryptoku/hints/purchase-intent` to get intent
2. Use Glyph SDK to send native APE transfer OR ERC-20 transfer
3. After transaction is sent, call confirm endpoint with `txHash`

**Implementation Options:**

**Option A: Native APE Transfer (if ApeChain uses native APE)**
```typescript
import { useSendTransaction } from 'wagmi'

const { sendTransaction } = useSendTransaction({
  to: intent.recipient,
  value: BigInt(intent.priceWei),
  chainId: 33139,
})

// After transaction is sent
const hash = await sendTransaction()
```

**Option B: ERC-20 Transfer (via contract call)**
```typescript
import { useWriteContract } from 'wagmi'

const { writeContract } = useWriteContract({
  address: APE_ADDRESS, // 0x4d224452801ACEd8B2F0aebE155379bb5D594381
  abi: ERC20_ABI,
  functionName: 'transfer',
  args: [intent.recipient, BigInt(intent.priceWei)],
  chainId: 33139,
})

const hash = await writeContract()
```

**Option C: Glyph SDK Direct (per .cursor/rules/llms.txt documentation)**
- Use Glyph API `/v1/wallets/send` or `/v1/payments` endpoints
- Requires authentication token

### 6.3 Server Route: Confirm Transaction

**New Endpoint:** `POST /api/cryptoku/hints/confirm-purchase`

**Request:**
```typescript
{
  intentId: string,     // From purchase-intent response
  txHash: string,       // Transaction hash from blockchain
  address: string       // User's wallet address (for verification)
}
```

**Server-Side Verification:**
1. Look up `intentId` in database (verify status = 'pending', not expired)
2. Fetch transaction from blockchain via RPC:
   - ChainId must be `33139` (ApeChain)
   - `from` must match `address` (case-insensitive)
   - `to` must match `intent.recipient`
   - `value` (or ERC-20 transfer amount) must match `intent.priceWei`
   - Transaction must be confirmed (block number > 0)
   - Transaction must not be reused (check if `txHash` was already used for another purchase)
3. If valid: Call `purchase_cryptoku_hints()` to grant hints
4. Mark intent as 'completed' and record `txHash` in database

**RPC Provider for Verification:**
- Use `https://rpc.apechain.com` or thirdweb client
- Read transaction receipt: `getTransactionReceipt(txHash)`

**Response:**
```typescript
{
  success: boolean,
  hintBalance: number,
  txHash: string,
  message: string
}
```

### 6.4 Database Changes Needed

**New Table: `hint_purchase_intents`**
```sql
CREATE TABLE IF NOT EXISTS hint_purchase_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  intent_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  price_wei TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_hint_intents_status ON hint_purchase_intents(status);
CREATE INDEX idx_hint_intents_tx_hash ON hint_purchase_intents(tx_hash);
```

**New Table: `hint_purchase_transactions` (for deduplication)**
```sql
CREATE TABLE IF NOT EXISTS hint_purchase_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tx_hash TEXT UNIQUE NOT NULL,
  intent_id TEXT NOT NULL REFERENCES hint_purchase_intents(intent_id),
  amount INTEGER NOT NULL,
  price_wei TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_hint_tx_hash_unique ON hint_purchase_transactions(tx_hash);
```

---

## 7) MISSING INFORMATION & HOW TO OBTAIN

### 7.1 Payment Recipient Address

**❓ QUESTION:** Where should APE payments be sent?
- Treasury wallet address?
- Contract address?
- Multi-sig?
- Admin-controlled address?

**How to Find:**
- Check with project owners/team
- Look for environment variables: `HINTS_PAYMENT_RECIPIENT`, `TREASURY_ADDRESS`
- Check other payment flows (none found currently)

### 7.2 Price Configuration

**Current Implied Price:** "1.0 $APE for 10 hints" (0.1 APE per hint)

**Questions:**
- Is this correct?
- Should price be configurable per season?
- Stored in database or hardcoded?

**Recommendation:**
- Add `hint_price_ape` column to `cryptoku_hints` table or create `pricing_config` table
- Or hardcode in API route if fixed

### 7.3 Glyph SDK Transaction Format

**Documentation Found:**
- `.cursor/rules/llms.txt` lines 3972-6160 contain Glyph API docs
- Endpoints: `/v1/wallets/send`, `/v1/payments`

**Missing:**
- Actual implementation examples in codebase
- Authentication token format
- How to integrate with wagmi/react hooks

**How to Obtain:**
- Review Glyph SDK documentation
- Check if wagmi hooks work directly (likely yes, since `useAccount` is used)
- Test `useSendTransaction` or `useWriteContract` with ApeChain

### 7.4 Transaction Verification Method

**Options:**
1. **Thirdweb client** (already used for balance reads)
   - `getTransactionReceipt` via thirdweb
2. **Direct RPC calls** to `https://rpc.apechain.com`
   - Using `viem` or `ethers`
3. **Block explorer API** (ApeScan)
   - Less reliable, slower

**Recommendation:** Use thirdweb client (already configured) or viem with ApeChain RPC.

### 7.5 Season Context

**Found:**
- **File:** `lib/season.ts` (imported in submit-result)
- **Constant:** `CURRENT_SEASON`
- Used in leaderboard entries

**Question:** Should hint purchases be tracked per season?
- Probably not needed (hints are global, not season-specific)
- But price could vary by season

---

## 8) SUMMARY & NEXT STEPS

### 8.1 Current Behavior Summary

**Why Free Hints Happen:**
1. User clicks "Buy Hints" button
2. Client calls `/api/cryptoku/hints/purchase` with `{ address, amount: 10 }`
3. API route has **TODO comment** indicating no transaction verification
4. API directly calls `hintsService.purchaseHints()` which calls SQL function `purchase_cryptoku_hints()`
5. SQL function **immediately increments `hint_balance` by 10** with no payment check
6. User receives hints instantly, free of charge

**Root Cause:** **No payment verification** - the API route grants hints without checking for any blockchain transaction or payment.

### 8.2 Where to Fix

**File to Modify:**
- **Primary:** `app/api/cryptoku/hints/purchase/route.ts` (lines 18-19: remove TODO, add verification)
- **SQL Function:** `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql` (line 243: currently grants hints unconditionally - this is fine IF called AFTER payment verification)
- **Client:** `features/games/cryptoku/cryptokugame.tsx` (line 1053: `purchaseHint` - add transaction sending step)

**What to Remove:**
- **Line 18-19** of purchase route: Remove the stub/TODO and add real verification
- **Direct `purchaseHints()` call** in purchase route: Move to confirm endpoint only

**What to Add:**
1. New `/purchase-intent` endpoint (create intent)
2. Modify `purchaseHint` client function to send transaction
3. New `/confirm-purchase` endpoint (verify tx, then grant hints)
4. Database tables for intent tracking and transaction deduplication
5. RPC/blockchain verification logic

### 8.3 Required New Purchase Flow

**Step 1: Create Intent (Server)**
- User requests purchase → Server creates intent with price, recipient, expiration
- Returns intent details to client

**Step 2: Send Transaction (Client)**
- Client uses Glyph/wagmi to send APE transfer (native or ERC-20)
- Wait for transaction to be sent (get `txHash`)

**Step 3: Confirm Purchase (Server)**
- Client submits `intentId` + `txHash`
- Server verifies transaction on-chain:
  - ChainId = 33139
  - `from` = user address
  - `to` = recipient address
  - `value`/amount = price
  - Transaction confirmed and not reused
- If valid: Call `purchase_cryptoku_hints()` to grant hints
- Return success with updated `hintBalance`

### 8.4 Missing Information Checklist

- [ ] **Payment recipient address** (where to send APE)
- [ ] **Exact price in APE** (confirm 1.0 APE for 10 hints)
- [ ] **Native vs ERC-20 transfer** (does ApeChain use native APE or must use contract?)
- [ ] **Glyph SDK integration pattern** (use wagmi hooks or Glyph API directly?)
- [ ] **Transaction verification method** (thirdweb vs viem vs RPC)
- [ ] **Season pricing** (if applicable)

---

## 9) FILE REFERENCES SUMMARY

### Key Files for Current Flow

1. **UI Button:** `features/games/cryptoku/cryptokugame.tsx` (line 1902-1908)
2. **Client Handler:** `features/games/cryptoku/cryptokugame.tsx` (line 1053-1079)
3. **API Route:** `app/api/cryptoku/hints/purchase/route.ts` (lines 5-51)
4. **Service:** `lib/supabase/services/cryptoku-hints.service.ts` (lines 185-229)
5. **SQL Function:** `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql` (lines 217-260)

### Key Files for Wallet/Balance

1. **Chain Config:** `lib/chains.ts` (lines 6-17) - ChainId: 33139
2. **APE Address:** `lib/env.ts` (line 8) - `0x4d224452801ACEd8B2F0aebE155379bb5D594381`
3. **Balance Reader:** `adapters/wallet.adapter.ts` (lines 6-34) - ERC-20 `balanceOf`
4. **Glyph Adapter:** `lib/auth-adapters/glyphAdapter.ts` - Wallet connection only

### Key Files for Database

1. **Hints Table:** `supabase/migrations/20260117010000_create_cryptoku_hints_table.sql` (lines 1-30)
2. **Admin Client:** `lib/supabase/admin.ts` (uses `SUPABASE_SERVICE_ROLE_KEY`)
3. **Transactions Table:** `scripts/01-create-tables.sql` (lines 174-189) - Could store purchases

---

**END OF REPORT**
