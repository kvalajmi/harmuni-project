  'use client'

  import { createClient, SupabaseClient } from '@supabase/supabase-js'

  let browserClient: SupabaseClient | null = null

  export function createSupabaseBrowser() {
      if (browserClient) {
          return browserClient
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing Supabase environment variables')
      }

      browserClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              lock: async (_name, _acquireTimeout, fn) => fn(),
          }
      })

      return browserClient
  }

  export const getSupabaseBrowser = createSupabaseBrowser
  EOF
git add src/lib/supabase-browser.ts && git commit -m "Fix: Resolve this.lock error in Supabase browser client" && git push
