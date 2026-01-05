import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn("[v0] Missing Supabase environment variables:", {
      hasUrl: !!url,
      hasKey: !!key,
    })
    // Return a mock client to prevent build errors
    // This will fail at runtime but allows the build to complete
    return createBrowserClient(
      url || "https://placeholder.supabase.co",
      key || "placeholder-key"
    )
  }

  return createBrowserClient(url, key)
}
