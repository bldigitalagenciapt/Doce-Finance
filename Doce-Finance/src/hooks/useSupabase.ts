'use client'

import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Retorna um client Supabase singleton para o browser. */
export function useSupabase() {
  return useMemo(() => createClient(), [])
}
