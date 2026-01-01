import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    console.log("[v0] Initializing Supabase client...")
    console.log("[v0] URL:", url ? `${url.substring(0, 30)}...` : "MISSING")
    console.log("[v0] Key:", key ? `${key.substring(0, 20)}...` : "MISSING")

    supabaseClient = createBrowserClient(url, key)
  }
  return supabaseClient
}
