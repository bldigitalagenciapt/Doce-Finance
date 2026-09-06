'use client'

import { useAppStore } from '@/store/useAppStore'

export function useCurrency() {
  const currency = useAppStore((s) => s.currency)

  const format = (value: number | null | undefined) => {
    const v = value ?? 0
    if (currency === 'BRL') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(v)
    }
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(v)
  }

  const symbol = currency === 'BRL' ? 'R$' : '€'

  return { format, symbol, currency }
}
