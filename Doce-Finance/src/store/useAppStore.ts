import { create } from 'zustand'
import type { Currency, Profile } from '@/types/database'

interface AppStore {
  profile: Profile | null
  setProfile: (p: Profile | null) => void
  currency: Currency
  setCurrency: (c: Currency) => void
}

export const useAppStore = create<AppStore>((set) => ({
  profile: null,
  setProfile: (profile) =>
    set({
      profile,
      currency: profile?.currency ?? 'BRL',
    }),
  currency: 'BRL',
  setCurrency: (currency) => set({ currency }),
}))
