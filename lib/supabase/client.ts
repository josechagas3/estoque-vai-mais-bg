import { createBrowserClient } from '@supabase/ssr'

type SupabaseConfig = { url?: string; key?: string }

declare global {
  interface Window { __SUPABASE_CONFIG__?: SupabaseConfig }
}

export function createClient() {
  const config = typeof window !== 'undefined' ? window.__SUPABASE_CONFIG__ : undefined
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? config?.url ?? 'https://zyvwwcwukjbnypdcbceg.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? config?.key

  if (!url || !key) {
    throw new Error('Configuração pública do Supabase indisponível no preview.')
  }

  return createBrowserClient(url, key)
}
