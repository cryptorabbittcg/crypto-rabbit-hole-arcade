/**
 * =============================================================================
 * DO NOT MODIFY WITHOUT UPDATING TESTS: payments invariants
 * =============================================================================
 * 
 * This module contains the payment verification logic for Ape In play purchases.
 * 
 * PAYMENT INVARIANTS (must be tested):
 * 1. Wrong chain rejection: Only ApeChain (33139) transactions accepted
 * 2. Wrong recipient rejection: Only treasury address accepted
 * 3. Wrong value rejection: Only 1.0 APE (1e18 wei) for 5 plays accepted
 * 4. Reused txHash rejection: Same transaction cannot be used twice
 * 5. Expired intent rejection: Intents expire after 10 minutes
 * 6. Valid transaction acceptance: All checks pass, plays granted
 * 
 * IMPORTANT: Any changes to verification logic MUST:
 * - Ensure treasury address is NEVER hardcoded in client code
 * - Treasury address must only exist server-side (env/migration constant)
 * =============================================================================
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { createPublicClient, http } from "viem"

// Constants (server-side only - NEVER expose to client)
const TREASURY_ADDRESS = "0xae998cc1128974381008ad086828c9b606b00c0f"
const PLAYS_AMOUNT = 5 // Bundle model: 1 APE = 5 plays
const PRICE_WEI = "1000000000000000000" // 1.0 APE (1e18)
const APE_CHAIN_ID = 33139 // ApeChain mainnet
const APE_CHAIN_RPC = "https://rpc.apechain.com"
const INTENT_EXPIRY_MINUTES = 10

/**
 * Create viem public client for ApeChain
 */
function createApeChainClient(rpcUrl?: string) {
  const apeChain = {
    id: APE_CHAIN_ID,
    name: "ApeChain",
    network: "apechain",
    nativeCurrency: {
      name: "ApeCoin",
      symbol: "APE",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl || APE_CHAIN_RPC],
      },
    },
    blockExplorers: {
      default: {
        name: "ApeScan",
        url: "https://apescan.io",
      },
    },
  } as const

  return createPublicClient({
    chain: apeChain,
    transport: http(rpcUrl || APE_CHAIN_RPC),
  })
}

/**
 * Normalize address to lowercase
 */
function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

/**
 * Type definitions for payment operations
 */
export interface CreateIntentParams {
  address: string
  playsAmount?: number // Defaults to 5 (bundle only)
  gameMode?: string // For analytics only
  adminClient: ReturnType<typeof createAdminClient>
}

export interface CreateIntentResult {
  intentId: string
  chainId: number
  recipient: string
  priceWei: string
  playsAmount: number
  expiresAt: string
}

export interface VerifyAndCompleteIntentParams {
  address: string
  intentId: string
  txHash: string
  adminClient: ReturnType<typeof createAdminClient>
  // Optional: override RPC for testing
  rpcUrl?: string
}

export interface VerifyAndCompleteIntentResult {
  success: boolean
  playsAdded?: number
  purchasedPlaysRemaining?: number
  error?: string
}

/**
 * Create a purchase intent for play purchase
 * 
 * @param params - Create intent parameters
 * @returns Intent details for client to send transaction
 */
export async function createIntent(
  params: CreateIntentParams
): Promise<CreateIntentResult> {
  const { address, playsAmount = PLAYS_AMOUNT, gameMode, adminClient } = params
  const normalizedAddress = normalizeAddress(address)

  // Validate plays amount (bundle model: only 5 plays allowed)
  if (playsAmount !== PLAYS_AMOUNT) {
    throw new Error(`Only ${PLAYS_AMOUNT} plays bundle is available`)
  }

  // Get profile by wallet address
  const profileService = new ProfileService(adminClient)
  const profile = await profileService.getProfileByWallet(normalizedAddress)
  
  if (!profile) {
    throw new Error("Profile not found")
  }

  // Check for existing pending intent (idempotency)
  const now = new Date()
  const { data: existingIntent } = await adminClient
    .from("ape_in_play_purchase_intents")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "pending")
    .eq("wallet_address", normalizedAddress)
    .gt("expires_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // If valid pending intent exists, return it (idempotency)
  if (existingIntent && existingIntent.expires_at > now.toISOString()) {
    return {
      intentId: existingIntent.intent_id,
      chainId: APE_CHAIN_ID,
      recipient: existingIntent.recipient_address,
      priceWei: existingIntent.price_wei,
      playsAmount: existingIntent.plays_amount,
      expiresAt: existingIntent.expires_at,
    }
  }

  // Create new intent
  const crypto = await import("crypto")
  const uuid = crypto.randomUUID()
  const extraEntropy = crypto.randomBytes(16).toString("hex")
  const intentId = `${uuid}-${extraEntropy}`
  const expiresAt = new Date(now.getTime() + INTENT_EXPIRY_MINUTES * 60 * 1000)

  const { data: newIntent, error: insertError } = await adminClient
    .from("ape_in_play_purchase_intents")
    .insert({
      user_id: profile.id,
      intent_id: intentId,
      wallet_address: normalizedAddress,
      game_mode: gameMode || null,
      plays_amount: PLAYS_AMOUNT,
      price_wei: PRICE_WEI,
      recipient_address: TREASURY_ADDRESS,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (insertError || !newIntent) {
    throw new Error("Failed to create purchase intent")
  }

  return {
    intentId: newIntent.intent_id,
    chainId: APE_CHAIN_ID,
    recipient: newIntent.recipient_address,
    priceWei: newIntent.price_wei,
    playsAmount: newIntent.plays_amount,
    expiresAt: newIntent.expires_at,
  }
}

/**
 * Verify on-chain transaction and complete purchase intent
 * 
 * PAYMENT INVARIANTS ENFORCED:
 * - Wrong chain: Only ApeChain (33139) accepted
 * - Wrong recipient: Only treasury address accepted
 * - Wrong value: Only 1.0 APE (1e18 wei) accepted
 * - Reused txHash: Transaction hash unique per purchase
 * - Expired intent: Intents expire after 10 minutes
 * 
 * @param params - Verify and complete parameters
 * @returns Result with success status and updated balance
 */
export async function verifyAndCompleteIntent(
  params: VerifyAndCompleteIntentParams
): Promise<VerifyAndCompleteIntentResult> {
  const { address, intentId, txHash, adminClient, rpcUrl } = params
  const normalizedAddress = normalizeAddress(address)
  const normalizedTxHash = txHash.toLowerCase()

  // Get profile
  const profileService = new ProfileService(adminClient)
  const profile = await profileService.getProfileByWallet(normalizedAddress)
  
  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  // Load intent
  const { data: intent, error: intentError } = await adminClient
    .from("ape_in_play_purchase_intents")
    .select("*")
    .eq("intent_id", intentId)
    .maybeSingle()

  if (intentError || !intent) {
    return { success: false, error: "Purchase intent not found" }
  }

  // Idempotency: if already completed with same txHash, return success
  if (intent.status === "completed" && intent.tx_hash?.toLowerCase() === normalizedTxHash) {
    // Get current purchased plays balance
    const { data: balanceRow } = await adminClient
      .from("ape_in_purchased_plays_balances")
      .select("balance")
      .eq("user_id", profile.id)
      .maybeSingle()

    return { 
      success: true, 
      playsAdded: PLAYS_AMOUNT,
      purchasedPlaysRemaining: balanceRow?.balance || 0,
    }
  }

  // Validate intent status
  if (intent.status !== "pending") {
    return { success: false, error: `Intent is not pending. Current status: ${intent.status}` }
  }

  // Check expiration
  const now = new Date()
  const expiresAt = new Date(intent.expires_at)
  if (expiresAt < now) {
    await adminClient
      .from("ape_in_play_purchase_intents")
      .update({ status: "expired" })
      .eq("intent_id", intentId)

    return { success: false, error: "Purchase intent has expired" }
  }

  // Validate wallet address matches
  if (normalizeAddress(intent.wallet_address) !== normalizedAddress) {
    return { success: false, error: "Wallet address does not match purchase intent" }
  }

  // Validate recipient address (treasury) - PAYMENT INVARIANT
  if (normalizeAddress(intent.recipient_address) !== normalizeAddress(TREASURY_ADDRESS)) {
    return { success: false, error: "Invalid recipient address" }
  }

  // Validate plays amount
  if (intent.plays_amount !== PLAYS_AMOUNT) {
    return { success: false, error: `Invalid plays amount. Expected ${PLAYS_AMOUNT}` }
  }

  // Validate price - PAYMENT INVARIANT
  if (intent.price_wei !== PRICE_WEI) {
    return { success: false, error: "Invalid price" }
  }

  // Check tx_hash is null (not already used)
  if (intent.tx_hash !== null) {
    return { success: false, error: "Purchase intent already has a transaction hash" }
  }

  // Replay protection: Check if txHash was already used - PAYMENT INVARIANT
  const { data: existingTx } = await adminClient
    .from("ape_in_play_purchase_intents")
    .select("intent_id, status")
    .eq("tx_hash", normalizedTxHash)
    .eq("status", "completed")
    .maybeSingle()

  if (existingTx) {
    return { success: false, error: "Transaction hash already used. Replay attack prevented." }
  }

  // On-chain verification
  try {
    const publicClient = createApeChainClient(rpcUrl)
    
    // Get transaction receipt - PAYMENT INVARIANT: Wrong chain check (via RPC)
    const receipt = await publicClient.getTransactionReceipt({
      hash: normalizedTxHash as `0x${string}`,
    })

    if (!receipt || receipt.status !== "success") {
      return { success: false, error: "Transaction not found or failed on chain" }
    }

    // Get full transaction
    const tx = await publicClient.getTransaction({
      hash: normalizedTxHash as `0x${string}`,
    })

    if (!receipt.blockNumber) {
      return { success: false, error: "Transaction not confirmed on chain" }
    }

    // Verify transaction from address
    if (normalizeAddress(tx.from) !== normalizedAddress) {
      return { success: false, error: "Transaction sender does not match wallet address" }
    }

    // Verify transaction to address (treasury) - PAYMENT INVARIANT
    if (!tx.to || normalizeAddress(tx.to) !== normalizeAddress(TREASURY_ADDRESS)) {
      return { success: false, error: "Transaction recipient does not match treasury address" }
    }

    // Verify transaction value - PAYMENT INVARIANT
    const expectedValue = BigInt(PRICE_WEI)
    if (tx.value !== expectedValue) {
      return { success: false, error: `Transaction value mismatch. Expected ${PRICE_WEI}` }
    }

    // All validations passed - grant plays
    // Atomically update intent and increment balance
    const { error: updateError } = await adminClient
      .from("ape_in_play_purchase_intents")
      .update({
        status: "completed",
        tx_hash: normalizedTxHash,
        completed_at: new Date().toISOString(),
      })
      .eq("intent_id", intentId)
      .eq("status", "pending") // Atomic update

    if (updateError) {
      // Check for race condition
      const { data: updatedIntent } = await adminClient
        .from("ape_in_play_purchase_intents")
        .select("*")
        .eq("intent_id", intentId)
        .maybeSingle()

      if (updatedIntent?.status === "completed" && updatedIntent.tx_hash?.toLowerCase() === normalizedTxHash) {
        // Already completed - idempotency
        const { data: balanceRow } = await adminClient
          .from("ape_in_purchased_plays_balances")
          .select("balance")
          .eq("user_id", profile.id)
          .maybeSingle()

        return { 
          success: true, 
          playsAdded: PLAYS_AMOUNT,
          purchasedPlaysRemaining: balanceRow?.balance || 0,
        }
      }

      return { success: false, error: "Failed to update purchase intent" }
    }

    // Increment purchased plays balance (atomic)
    // Use upsert to ensure row exists, then increment
    // First ensure row exists
    await adminClient
      .from("ape_in_purchased_plays_balances")
      .upsert({
        user_id: profile.id,
        balance: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
        ignoreDuplicates: true,
      })

    // Atomic increment using SQL (balance = balance + PLAYS_AMOUNT)
    // Note: We use a simple read-modify-write here because Supabase doesn't support
    // atomic increment directly. For production, consider an RPC function for true atomicity.
    const { data: currentBalance } = await adminClient
      .from("ape_in_purchased_plays_balances")
      .select("balance")
      .eq("user_id", profile.id)
      .maybeSingle()

    const newBalance = (currentBalance?.balance || 0) + PLAYS_AMOUNT

    const { data: updatedBalance, error: updateBalanceError } = await adminClient
      .from("ape_in_purchased_plays_balances")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", profile.id)
      .select("balance")
      .single()

    if (updateBalanceError || !updatedBalance) {
      return { success: false, error: "Failed to update purchased plays balance" }
    }

    return {
      success: true,
      playsAdded: PLAYS_AMOUNT,
      purchasedPlaysRemaining: updatedBalance.balance,
    }
  } catch (verificationError: any) {
    // Handle verification errors
    if (verificationError?.message?.includes("not found") || verificationError?.message?.includes("Transaction")) {
      return { success: false, error: "Transaction not found on chain" }
    }

    if (verificationError?.message?.includes("network") || verificationError?.message?.includes("connection")) {
      return { success: false, error: "Failed to connect to blockchain" }
    }

    return { success: false, error: `Transaction verification failed: ${verificationError.message || "Unknown error"}` }
  }
}

/**
 * Export constants for testing
 */
export const PAYMENT_CONSTANTS = {
  TREASURY_ADDRESS,
  PLAYS_AMOUNT,
  PRICE_WEI,
  APE_CHAIN_ID,
  APE_CHAIN_RPC,
  INTENT_EXPIRY_MINUTES,
} as const
