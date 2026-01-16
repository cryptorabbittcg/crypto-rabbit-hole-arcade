import { createClient } from "@supabase/supabase-js"

/**
 * Create a Supabase admin client using the service role key
 * This bypasses RLS policies and should ONLY be used in server-side API routes
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must not be used in the browser")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Debug: Log environment variable status (without exposing the key)
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV) {
    console.log("[createAdminClient] Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      serviceKeyLength: serviceRoleKey?.length || 0,
      serviceKeyPrefix: serviceRoleKey?.substring(0, 10) || "not set",
      allEnvKeys: Object.keys(process.env).filter(k => k.includes("SUPABASE")).join(", "),
    })
  }

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  }

  if (!serviceRoleKey) {
    // Provide helpful debugging info
    const availableKeys = Object.keys(process.env)
      .filter(k => k.includes("SUPABASE") || k.includes("SERVICE"))
      .join(", ")
    
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is not set. Server-side API routes require the service role key to bypass RLS.\n` +
      `Available env vars with 'SUPABASE' or 'SERVICE': ${availableKeys || "none"}\n` +
      `Please set SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.`
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })
}

