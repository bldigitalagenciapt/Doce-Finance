'use client'

import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'

export function TrialBanner() {
  const { profile, loading } = useProfile()

  if (loading || !profile) return null

  // Only show banner if trialing
  if (profile.subscription_status !== 'trialing') return null

  const endsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
  if (!endsAt) return null

  const today = new Date()
  const diffTime = endsAt.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // If expired, the middleware should have redirected, but just in case:
  if (diffDays <= 0) return null

  return (
    <div className="bg-brand-600 px-4 py-3 text-white">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <p className="text-sm leading-6">
          <strong className="font-semibold">Teste Grátis</strong>
          <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
            <circle cx={1} cy={1} r={1} />
          </svg>
          Você tem {diffDays} {diffDays === 1 ? 'dia restante' : 'dias restantes'} de teste grátis.
        </p>
        <Link
          href="/configuracoes?tab=assinatura"
          className="flex-none rounded-full bg-white px-3.5 py-1 text-sm font-semibold text-brand-600 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Assinar Agora <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  )
}
