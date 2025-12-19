import { ENV } from "./env"

const THIRDWEB_API_BASE = "https://api.thirdweb.com/v1"

export interface AuthResult {
  isNewUser: boolean
  token: string
  type: string
  walletAddress: string
}

export interface WalletInfo {
  address: string
  smartWalletAddress?: string
  createdAt: string
  publicKey?: string
  profiles: Array<{
    type: string
    email?: string
    emailVerified?: boolean
    phone?: string
    phoneVerified?: boolean
  }>
}

/**
 * Initiate email authentication - sends verification code to email
 */
export async function initiateEmailAuth(email: string): Promise<{ success: boolean }> {
  const response = await fetch(`${THIRDWEB_API_BASE}/auth/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": ENV.THIRDWEB_CLIENT_ID || "",
    },
    body: JSON.stringify({
      method: "email",
      email,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to send verification code" }))
    throw new Error(error.message || "Failed to send verification code")
  }

  return response.json()
}

/**
 * Complete email authentication with verification code
 */
export async function completeEmailAuth(
  email: string,
  code: string,
): Promise<AuthResult> {
  const response = await fetch(`${THIRDWEB_API_BASE}/auth/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": ENV.THIRDWEB_CLIENT_ID || "",
    },
    body: JSON.stringify({
      method: "email",
      email,
      code,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Invalid verification code" }))
    throw new Error(error.message || "Invalid verification code")
  }

  return response.json()
}

/**
 * Initiate SIWE (Sign-In with Ethereum) authentication
 */
export async function initiateSIWE(address: string, chainId?: number): Promise<{ payload: string }> {
  const response = await fetch(`${THIRDWEB_API_BASE}/auth/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": ENV.THIRDWEB_CLIENT_ID || "",
    },
    body: JSON.stringify({
      method: "siwe",
      address,
      chainId: chainId || 33139, // ApeChain mainnet
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to initiate SIWE" }))
    throw new Error(error.message || "Failed to initiate SIWE")
  }

  return response.json()
}

/**
 * Complete SIWE authentication with signed message
 */
export async function completeSIWE(
  payload: string,
  signature: string,
): Promise<AuthResult> {
  const response = await fetch(`${THIRDWEB_API_BASE}/auth/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": ENV.THIRDWEB_CLIENT_ID || "",
    },
    body: JSON.stringify({
      method: "siwe",
      payload,
      signature,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Invalid signature" }))
    throw new Error(error.message || "Invalid signature")
  }

  return response.json()
}

/**
 * Get authenticated user's wallet information
 */
export async function getWalletInfo(token: string): Promise<WalletInfo> {
  const response = await fetch(`${THIRDWEB_API_BASE}/wallets/me`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-client-id": ENV.THIRDWEB_CLIENT_ID || "",
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to get wallet info" }))
    throw new Error(error.message || "Failed to get wallet info")
  }

  const data = await response.json()
  return data.result
}

/**
 * Store auth token in localStorage
 */
export function storeAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("thirdweb_auth_token", token)
  }
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("thirdweb_auth_token")
}

/**
 * Remove auth token from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("thirdweb_auth_token")
  }
}



