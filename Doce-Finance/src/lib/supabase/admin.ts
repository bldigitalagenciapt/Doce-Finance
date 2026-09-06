import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase com service role — USO EXCLUSIVO NO SERVIDOR.
 * Nunca importe este arquivo em componentes client-side ('use client').
 * Ignora RLS, portanto só deve ser usado em Server Components / rotas
 * onde o acesso público é intencional (ex.: orçamento compartilhável).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.',
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
