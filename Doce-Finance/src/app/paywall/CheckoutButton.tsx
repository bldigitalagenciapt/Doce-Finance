'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

type CheckoutButtonProps = {
  plan: 'monthly' | 'yearly'
  currency: 'EUR' | 'BRL'
  label: string
}

export function CheckoutButton({ plan, currency, label }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, currency }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar assinatura')
      }

      if (data.url && data.url.startsWith('http')) {
        window.location.href = data.url
      } else if (data.url) {
        router.push(data.url)
      } else {
        throw new Error('Link de checkout inválido')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao redirecionar para o pagamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="mt-6 flex w-full justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Redirecionando...' : label}
    </button>
  )
}
