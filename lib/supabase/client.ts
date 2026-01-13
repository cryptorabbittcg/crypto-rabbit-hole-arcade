import { createBrowserClient } from "@supabase/ssr"

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Check if Supabase is properly configured
 * Validates that environment variables are set and contain valid values
 */
export function hasSupabaseConfig(): boolean {
  // In Next.js, NEXT_PUBLIC_* variables are available via process.env on both client and server
  // They're replaced at build time with actual values
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate URL format (should be a valid Supabase URL)
  const isValidUrl = url && 
    typeof url === "string" && 
    url.length > 0 &&
    (url.startsWith("https://") || url.startsWith("http://")) &&
    !url.includes("placeholder") &&
    url !== "https://placeholder.supabase.co" &&
    url !== "https://supabase-not-configured.local" &&
    url.includes(".supabase.co") // Must be a Supabase URL

  // Validate key format (should be a JWT token, typically starts with "eyJ")
  const isValidKey = key && 
    typeof key === "string" && 
    key.length > 20 && // JWT tokens are typically much longer
    !key.includes("placeholder") &&
    key !== "not-configured-key"

  return !!(isValidUrl && isValidKey)
}

/**
 * Get Supabase environment variables
 */
function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return { url, key }
}

export function createClient() {
  // Return cached instance if already created (but validate it's still valid)
  if (clientInstance) {
    // Check if cached instance is still valid
    const { url, key } = getSupabaseEnv()
    if (hasSupabaseConfig()) {
      return clientInstance
    }
    // If env vars changed, clear cache and recreate
    clientInstance = null
  }

  const { url, key } = getSupabaseEnv()

  // Guard: Only create client if env vars are properly configured
  if (!hasSupabaseConfig()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
      )
    }

    // Development: keep fallback behavior with warnings
    const diagnosticInfo = {
      hasUrl: !!url,
      hasKey: !!key,
      urlType: typeof url,
      keyType: typeof key,
      urlLength: url?.length || 0,
      keyLength: key?.length || 0,
      urlPreview: url ? `${url.substring(0, 30)}...` : "undefined",
      urlIncludesPlaceholder: url?.includes("placeholder") || false,
      keyIncludesPlaceholder: key?.includes("placeholder") || false,
      isClientSide: typeof window !== "undefined",
    }
    
    console.warn("[Supabase] Missing or invalid Supabase environment variables:", diagnosticInfo)
    console.warn("[Supabase] To fix this, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file or Vercel project settings")
    
    // Return a client that will fail gracefully on operations
    // Services handle errors and return null/empty arrays
    try {
      clientInstance = createBrowserClient(
        "https://supabase-not-configured.local",
        "not-configured-key"
      )
      return clientInstance
    } catch (error) {
      console.error("[Supabase] Failed to create Supabase client (fallback):", error)
      throw new Error("Supabase client cannot be created: missing or invalid environment variables. Check console for details.")
    }
  }

  // Validate URL and key are strings before using
  if (typeof url !== "string" || typeof key !== "string") {
    console.error("[Supabase] Invalid environment variable types:", {
      urlType: typeof url,
      keyType: typeof key,
    })
    throw new Error("Supabase environment variables must be strings")
  }

  try {
    clientInstance = createBrowserClient(url, key)
    return clientInstance
  } catch (error) {
    console.error("[Supabase] Failed to create Supabase client:", error)
    // Clear instance on error so we can retry
    clientInstance = null
    throw error
  }
}
