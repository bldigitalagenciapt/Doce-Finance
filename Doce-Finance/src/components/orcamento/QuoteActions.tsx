'use client'

import { useEffect, useState } from 'react'
import { Check, X, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { QuoteState } from '@/types/database'

interface QuoteActionsProps {
  orderId: string
  /** Estado efetivo calculado no servidor (já considera expirado). */
  state: QuoteState
  /** true se ainda pode ser respondido (enviado/visualizado e não expirado). */
  respondable: boolean
}

export function QuoteActions({ orderId, state, respondable }: QuoteActionsProps) {
  const [result, setResult] = useState<'aceite' | 'recusado' | null>(
    state === 'aceite' ? 'aceite' : state === 'recusado' ? 'recusado' : null,
  )
  const [loading, setLoading] = useState<'aceite' | 'recusado' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Marca como visualizado ao abrir (só efetiva se estava 'enviado').
  useEffect(() => {
    fetch(`/api/orcamento/${orderId}/view`, { method: 'POST' }).catch(() => {})
  }, [orderId])

  const respond = async (response: 'aceite' | 'recusado') => {
    setLoading(response)
    setError(null)
    try {
      const res = await fetch(`/api/orcamento/${orderId}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setResult(response)
      } else if (data.error === 'expired') {
        setError('Este orçamento expirou e não pode mais ser respondido.')
      } else if (data.error === 'migration_required') {
        setError('O recurso de resposta ainda não está disponível. Contacte o atelier.')
      } else if (data.error === 'not_respondable') {
        setError('Este orçamento já foi respondido.')
      } else {
        setError('Não foi possível registar a sua resposta. Tente novamente.')
      }
    } catch {
      setError('Não foi possível registar a sua resposta. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  // Já respondido (aceite/recusado)
  if (result === 'aceite') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        <p className="mt-2 text-base font-semibold text-green-800">Orçamento aceite!</p>
        <p className="mt-1 text-sm text-green-700">
          Obrigado. O atelier foi notificado e entrará em contacto para confirmar os detalhes.
        </p>
      </div>
    )
  }
  if (result === 'recusado') {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
        <XCircle className="mx-auto h-8 w-8 text-gray-500" />
        <p className="mt-2 text-base font-semibold text-gray-700">Orçamento recusado</p>
        <p className="mt-1 text-sm text-gray-500">
          A sua resposta foi registada. Obrigado pelo seu tempo.
        </p>
      </div>
    )
  }

  // Expirado
  if (state === 'expirado') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
        <Clock className="mx-auto h-8 w-8 text-amber-600" />
        <p className="mt-2 text-base font-semibold text-amber-800">Orçamento expirado</p>
        <p className="mt-1 text-sm text-amber-700">
          A validade deste orçamento terminou. Contacte o atelier para uma nova proposta.
        </p>
      </div>
    )
  }

  // Ainda não enviado (rascunho) — não mostra ações ao cliente
  if (!respondable) return null

  // Enviado/Visualizado — botões de resposta
  return (
    <div className="rounded-xl border border-gray-100 bg-[#FDFAF7] p-5 text-center">
      <p className="text-sm font-semibold text-gray-900">O que deseja fazer com este orçamento?</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          onClick={() => respond('aceite')}
          disabled={!!loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === 'aceite' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Aceitar orçamento
        </button>
        <button
          onClick={() => respond('recusado')}
          disabled={!!loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === 'recusado' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          Recusar
        </button>
      </div>
    </div>
  )
}
