'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { useAppStore } from '@/store/useAppStore'
import type { Profile } from '@/types/database'

/** Carrega o perfil do usuário logado e sincroniza com a store. */
export function useProfile() {
  const supabase = useSupabase()
  const profile = useAppStore((s) => s.profile)
  const setProfile = useAppStore((s) => s.setProfile)
  const [loading, setLoading] = useState(!profile)

  useEffect(() => {
    let active = true
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (active) setLoading(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (active) {
        if (data) setProfile(data as Profile)
        setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { profile, loading }
}
