/**
 * =============================================================================
 * PAYMENT INVARIANTS TEST SUITE
 * =============================================================================
 * 
 * These tests verify critical payment invariants for Cryptoku hint purchases.
 * 
 * DO NOT MODIFY WITHOUT UPDATING IMPLEMENTATION: lib/payments/cryptokuHintsPayment.ts
 * 
 * PAYMENT INVARIANTS (must all pass):
 * 1. Wrong chain rejection: Only ApeChain (33139) transactions accepted
 * 2. Wrong recipient rejection: Only treasury address accepted
 * 3. Wrong value rejection: Only 1.0 APE (1e18 wei) accepted
 * 4. Reused txHash rejection: Same transaction cannot be used twice
 * 5. Expired intent rejection: Intents expire after 10 minutes
 * 6. Valid transaction acceptance: All checks pass, hints granted
 * =============================================================================
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest"
import { verifyAndCompleteIntent, PAYMENT_CONSTANTS } from "../cryptokuHintsPayment"
import type { VerifyAndCompleteIntentParams } from "../cryptokuHintsPayment"

// Mock viem
vi.mock("viem", () => {
  const mockPublicClient = {
    getTransactionReceipt: vi.fn(),
    getTransaction: vi.fn(),
  }
  return {
    createPublicClient: () => mockPublicClient,
    http: vi.fn(),
  }
})

// Mock Supabase client - create helper to build chainable mocks
const createSelectChain = () => {
  const chain: any = {}
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  return chain
}

const createUpdateChain = () => {
  const chain: any = {}
  chain.eq = vi.fn(() => chain)
  return Promise.resolve({ error: null, data: null })
}

const mockAdminClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => createSelectChain()),
    update: vi.fn(() => createUpdateChain()),
  })),
} as any

// Mock services - use factory to allow per-test customization
const mockGetProfileByWallet = vi.fn()
const mockGetHints = vi.fn()
const mockPurchaseHints = vi.fn()

vi.mock("@/lib/supabase/services/profile.service", () => ({
  ProfileService: class ProfileService {
    constructor(adminClient: any) {}
    getProfileByWallet = mockGetProfileByWallet
  },
}))

vi.mock("@/lib/supabase/services/cryptoku-hints.service", () => ({
  CryptokuHintsService: class CryptokuHintsService {
    constructor(adminClient: any) {}
    getHints = mockGetHints
    purchaseHints = mockPurchaseHints
  },
}))

// Test data
const VALID_ADDRESS = "0x1234567890123456789012345678901234567890"
const VALID_TX_HASH = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
const VALID_INTENT_ID = "test-intent-id"
const TREASURY = PAYMENT_CONSTANTS.TREASURY_ADDRESS

// Mock profile data
const MOCK_PROFILE = {
  id: "test-profile-id",
  wallet_address: VALID_ADDRESS.toLowerCase(),
}

describe("Payment Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock ProfileService.getProfileByWallet to return valid profile by default
    mockGetProfileByWallet.mockResolvedValue(MOCK_PROFILE)
  })

  describe("Wrong Chain Rejection", () => {
    it("should reject transaction from wrong chain (simulated via RPC error)", async () => {
      const { createPublicClient } = await import("viem")
      const mockClient = createPublicClient() as any
      
      // Simulate wrong chain by having RPC fail/return different chain
      mockClient.getTransactionReceipt.mockRejectedValue(
        new Error("Transaction not found on this chain")
      )
      
      // Mock valid intent
      const intentChain: any = {
        eq: vi.fn(() => intentChain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            intent_id: VALID_INTENT_ID,
            status: "pending",
            wallet_address: VALID_ADDRESS.toLowerCase(),
            recipient_address: TREASURY.toLowerCase(),
            hints_amount: PAYMENT_CONSTANTS.HINTS_AMOUNT,
            price_wei: PAYMENT_CONSTANTS.PRICE_WEI,
            tx_hash: null,
            expires_at: new Date(Date.now() + 600000).toISOString(),
          },
          error: null,
        }),
      }
      
      const replayChain: any = {
        eq: vi.fn(() => replayChain),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      
      mockAdminClient.from.mockReturnValue({
        select: vi.fn((cols: string) => {
          if (cols === "*") return intentChain
          return replayChain
        }),
        update: vi.fn(() => Promise.resolve({ error: null, data: null })),
      })

      const params: VerifyAndCompleteIntentParams = {
        address: VALID_ADDRESS,
        intentId: VALID_INTENT_ID,
        txHash: VALID_TX_HASH,
        adminClient: mockAdminClient,
        rpcUrl: "https://wrong-chain-rpc.com", // Wrong chain RPC
      }

      const result = await verifyAndCompleteIntent(params)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain("not found on chain")
    })
  })

  describe("Wrong Recipient Rejection", () => {
    it("should reject transaction with wrong recipient address", async () => {
      const { createPublicClient } = await import("viem")
      const mockClient = createPublicClient() as any

      const WRONG_RECIPIENT = "0xWRONG0000000000000000000000000000000000"

      mockClient.getTransactionReceipt.mockResolvedValue({
        status: "success",
        blockNumber: BigInt(12345),
      })

      mockClient.getTransaction.mockResolvedValue({
        from: VALID_ADDRESS.toLowerCase(),
        to: WRONG_RECIPIENT.toLowerCase(),
        value: BigInt(PAYMENT_CONSTANTS.PRICE_WEI),
      })

      // Mock valid intent - need to mock the query chain
      const intentChain: any = {
        eq: vi.fn(() => intentChain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            intent_id: VALID_INTENT_ID,
            status: "pending",
            wallet_address: VALID_ADDRESS.toLowerCase(),
            recipient_address: TREASURY.toLowerCase(),
            hints_amount: PAYMENT_CONSTANTS.HINTS_AMOUNT,
            price_wei: PAYMENT_CONSTANTS.PRICE_WEI,
            tx_hash: null,
            expires_at: new Date(Date.now() + 600000).toISOString(),
          },
          error: null,
        }),
      }
      
      // Mock replay check (returns null - no existing tx)
      const replayChain: any = {
        eq: vi.fn(() => replayChain),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      
      mockAdminClient.from.mockReturnValue({
        select: vi.fn((cols: string) => {
          if (cols === "*") return intentChain
          return replayChain // For replay check query
        }),
        update: vi.fn(() => Promise.resolve({ error: null, data: null })),
      })

      const params: VerifyAndCompleteIntentParams = {
        address: VALID_ADDRESS,
        intentId: VALID_INTENT_ID,
        txHash: VALID_TX_HASH,
        adminClient: mockAdminClient,
      }

      const result = await verifyAndCompleteIntent(params)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain("recipient does not match treasury")
    })
  })

  describe("Wrong Value Rejection", () => {
    it("should reject transaction with wrong value (not 1.0 APE)", async () => {
      const { createPublicClient } = await import("viem")
      const mockClient = createPublicClient() as any

      const WRONG_VALUE = BigInt("500000000000000000") // 0.5 APE

      mockClient.getTransactionReceipt.mockResolvedValue({
        status: "success",
        blockNumber: BigInt(12345),
      })

      mockClient.getTransaction.mockResolvedValue({
        from: VALID_ADDRESS.toLowerCase(),
        to: TREASURY.toLowerCase(),
        value: WRONG_VALUE,
      })

      // Mock valid intent - need to mock the query chain
      const intentChain: any = {
        eq: vi.fn(() => intentChain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            intent_id: VALID_INTENT_ID,
            status: "pending",
            wallet_address: VALID_ADDRESS.toLowerCase(),
            recipient_address: TREASURY.toLowerCase(),
            hints_amount: PAYMENT_CONSTANTS.HINTS_AMOUNT,
            price_wei: PAYMENT_CONSTANTS.PRICE_WEI,
            tx_hash: null,
            expires_at: new Date(Date.now() + 600000).toISOString(),
          },
          error: null,
        }),
      }
      
      // Mock replay check (returns null - no existing tx)
      const replayChain: any = {
        eq: vi.fn(() => replayChain),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      
      mockAdminClient.from.mockReturnValue({
        select: vi.fn((cols: string) => {
          if (cols === "*") return intentChain
          return replayChain // For replay check query
        }),
        update: vi.fn(() => Promise.resolve({ error: null, data: null })),
      })

      const params: VerifyAndCompleteIntentParams = {
        address: VALID_ADDRESS,
        intentId: VALID_INTENT_ID,
        txHash: VALID_TX_HASH,
        adminClient: mockAdminClient,
      }

      const result = await verifyAndCompleteIntent(params)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain("value mismatch")
    })
  })

  describe("Reused TxHash Rejection", () => {
    it("should reject reused transaction hash", async () => {
      // Mock intent query - returns valid intent
      const intentChain: any = {
        eq: vi.fn(() => intentChain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            intent_id: VALID_INTENT_ID,
            status: "pending",
            wallet_address: VALID_ADDRESS.toLowerCase(),
            recipient_address: TREASURY.toLowerCase(),
            hints_amount: PAYMENT_CONSTANTS.HINTS_AMOUNT,
            price_wei: PAYMENT_CONSTANTS.PRICE_WEI,
            tx_hash: null,
            expires_at: new Date(Date.now() + 600000).toISOString(),
          },
          error: null,
        }),
      }
      
      // Mock replay check - returns existing completed tx (should reject)
      const replayChain: any = {
        eq: vi.fn(() => replayChain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            intent_id: "other-intent-id",
            status: "completed",
          },
          error: null,
        }),
      }
      
      mockAdminClient.from.mockReturnValue({
        select: vi.fn((cols: string) => {
          if (cols === "*") return intentChain
          return replayChain // For replay check query
        }),
        update: vi.fn(() => Promise.resolve({ error: null, data: null })),
      })

      const params: VerifyAndCompleteIntentParams = {
        address: VALID_ADDRESS,
        intentId: VALID_INTENT_ID,
        txHash: VALID_TX_HASH,
        adminClient: mockAdminClient,
      }

      const result = await verifyAndCompleteIntent(params)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain("already used")
      expect(result.error).toContain("Replay attack prevented")
    })
  })

  describe("Expired Intent Rejection", () => {
    it("should reject expired purchase intent", async () => {
      const expiredDate = new Date(Date.now() - 600000) // 10 minutes ago

      mockAdminClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                intent_id: VALID_INTENT_ID,
                status: "pending",
                wallet_address: VALID_ADDRESS.toLowerCase(),
                recipient_address: TREASURY.toLowerCase(),
                hints_amount: PAYMENT_CONSTANTS.HINTS_AMOUNT,
                price_wei: PAYMENT_CONSTANTS.PRICE_WEI,
                tx_hash: null,
                expires_at: expiredDate.toISOString(), // Expired
              },
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })

      const params: VerifyAndCompleteIntentParams = {
        address: VALID_ADDRESS,
        intentId: VALID_INTENT_ID,
        txHash: VALID_TX_HASH,
        adminClient: mockAdminClient,
      }

      const result = await verifyAndCompleteIntent(params)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain("expired")
    })
  })

  describe("Valid Transaction Acceptance", () => {
    it("should accept valid transaction and grant hints", async () => {
      const { createPublicClient } = await import("viem")
      const { CryptokuHintsService } = await import("@/lib/supabase/services/cryptoku-hints.service")
      const mockClient = createPublicClient() as any

      mockClient.getTransactionReceipt.mockResolvedValue({
        status: "success",
        blockNumber: BigInt(12345),
      })

      mockClient.getTransaction.mockResolvedValue({
        from: VALID_ADDRESS.toLowerCase(),
        to: TREASURY.toLowerCase(),
        value: BigInt(PAYMENT_CONSTANTS.PRICE_WEI),
      })

      // Mock intent query - returns valid pending intent
      const intentChain: any = {
        eq: vi.fn(() => intentChain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            intent_id: VALID_INTENT_ID,
            status: "pending",
            wallet_address: VALID_ADDRESS.toLowerCase(),
            recipient_address: TREASURY.toLowerCase(),
            hints_amount: PAYMENT_CONSTANTS.HINTS_AMOUNT,
            price_wei: PAYMENT_CONSTANTS.PRICE_WEI,
            tx_hash: null,
            expires_at: new Date(Date.now() + 600000).toISOString(),
          },
          error: null,
        }),
      }
      
      // Mock replay check - returns null (no existing completed tx)
      const replayChain: any = {
        eq: vi.fn(() => replayChain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null, // No existing completed tx with this hash
          error: null,
        }),
      }
      
      // Mock update chain for marking intent as completed
      const updateChain: any = {
        eq: vi.fn(() => updateChain),
      }
      // Make update chain return a promise with { error: null }
      updateChain.then = (resolve: any) => resolve({ error: null })
      updateChain.catch = (reject: any) => Promise.reject(reject)
      
      mockAdminClient.from.mockReturnValue({
        select: vi.fn((cols: string) => {
          if (cols === "*") return intentChain
          return replayChain // For replay check query
        }),
        update: vi.fn(() => updateChain),
      })

      // Mock hint granting
      mockGetHints.mockResolvedValue({ hintBalance: 13 })
      mockPurchaseHints.mockResolvedValue({
        success: true,
        hints: { hintBalance: 13 },
      })

      const params: VerifyAndCompleteIntentParams = {
        address: VALID_ADDRESS,
        intentId: VALID_INTENT_ID,
        txHash: VALID_TX_HASH,
        adminClient: mockAdminClient,
      }

      const result = await verifyAndCompleteIntent(params)
      
      expect(result.success).toBe(true)
      expect(result.hintBalance).toBe(13)
    })
  })
})
