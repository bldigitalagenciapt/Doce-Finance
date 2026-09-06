'use client'

import { useRouter } from 'next/navigation'
import { Menu, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useAppStore } from '@/store/useAppStore'
import { useCurrency } from '@/hooks/useCurrency'

export function Header({ onMenu }: { onMenu: () => void }) {
  const router = useRouter()
  const supabase = useSupabase()
  const profile = useAppStore((s) => s.profile)
  const setProfile = useAppStore((s) => s.setProfile)
  const { symbol } = useCurrency()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block">
        <p className="text-sm font-semibold text-gray-900">
          {profile?.business_name || 'Meu Atelier'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          {symbol}
        </span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-medium text-gray-700 sm:block">
              {profile?.full_name || 'Confeiteira'}
            </span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
