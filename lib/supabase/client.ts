import { createBrowserClient } from "@supabase/ssr"

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Check if Supabase is properly configured
 */
export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(
    url &&
    key &&
    !url.includes("placeholder") &&
    !key.includes("placeholder") &&
    url !== "https://placeholder.supabase.co"
  )
}

export function createClient() {
  // Return cached instance if already created
  if (clientInstance) {
    return clientInstance
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Guard: Only create client if env vars are properly configured
  // Never use placeholder.supabase.co - fail gracefully instead
  if (!url || !key || url.includes("placeholder") || url === "https://placeholder.supabase.co") {
    console.warn("[v0] Missing or invalid Supabase environment variables:", {
      hasUrl: !!url,
      hasKey: !!key,
      urlIncludesPlaceholder: url?.includes("placeholder"),
      urlValue: url?.substring(0, 50), // Log first 50 chars for debugging
    })
    
    // Return a client that will have errors on operations but won't crash
    // Services already handle errors, so they'll return null/empty arrays gracefully
    // This prevents placeholder.supabase.co from being used
    try {
      // Use an invalid URL that will fail network requests but allow client creation
      // Operations will return errors that services can catch and handle
      clientInstance = createBrowserClient(
        "https://supabase-not-configured.local",
        key || "not-configured-key"
      )
      return clientInstance
    } catch (error) {
      console.error("[v0] Failed to create Supabase client (fallback):", error)
      // If client creation fails entirely, throw to make the issue obvious
      throw new Error("Supabase client cannot be created: missing or invalid environment variables")
    }
  }

  try {
    clientInstance = createBrowserClient(url, key)
    return clientInstance
  } catch (error) {
    console.error("[v0] Failed to create Supabase client:", error)
    throw error
  }
}
