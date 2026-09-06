import type { QuoteState, Order } from '@/types/database'

type Tone = 'gray' | 'brand' | 'success' | 'warning' | 'danger' | 'blue' | 'purple'

export const QUOTE_STATE: Record<QuoteState, { label: string; tone: Tone }> = {
  rascunho: { label: 'Rascunho', tone: 'gray' },
  enviado: { label: 'Enviado', tone: 'blue' },
  visualizado: { label: 'Visualizado', tone: 'warning' },
  aceite: { label: 'Aceite', tone: 'success' },
  recusado: { label: 'Recusado', tone: 'danger' },
  expirado: { label: 'Expirado', tone: 'gray' },
}

export const QUOTE_STATE_LIST = Object.entries(QUOTE_STATE).map(
  ([value, meta]) => ({ value: value as QuoteState, ...meta }),
)

/** Padrão de validade quando não definida: created_at + 15 dias. */
export function defaultValidUntil(createdAt: string | Date): Date {
  const base = new Date(createdAt)
  return new Date(base.getTime() + 15 * 24 * 60 * 60 * 1000)
}

/** Retorna só a parte de data (YYYY-MM-DD) de um Date, em UTC-safe local. */
export function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Estado efetivo do orçamento para exibição, derivando 'expirado'
 * quando a validade passou e ainda não houve resposta.
 * Seguro antes da migração: quote_state ausente => 'rascunho'.
 */
export function effectiveQuoteState(order: Pick<Order, 'quote_state' | 'quote_valid_until'>): QuoteState {
  const state = (order.quote_state as QuoteState) || 'rascunho'
  if ((state === 'enviado' || state === 'visualizado') && order.quote_valid_until) {
    const validUntil = new Date(order.quote_valid_until + 'T23:59:59')
    if (!Number.isNaN(validUntil.getTime()) && validUntil.getTime() < Date.now()) {
      return 'expirado'
    }
  }
  return state
}

/** true se o orçamento ainda pode ser respondido pelo cliente. */
export function isRespondable(order: Pick<Order, 'quote_state' | 'quote_valid_until'>): boolean {
  const eff = effectiveQuoteState(order)
  return eff === 'enviado' || eff === 'visualizado'
}
