import type { OrderStatus } from '@/types/database'

type Tone = 'gray' | 'brand' | 'success' | 'warning' | 'danger' | 'blue' | 'purple'

export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; tone: Tone }
> = {
  orcamento: { label: 'Orçamento', tone: 'gray' },
  confirmado: { label: 'Confirmado', tone: 'blue' },
  em_producao: { label: 'Em produção', tone: 'warning' },
  pronto: { label: 'Pronto', tone: 'purple' },
  entregue: { label: 'Entregue', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
}

export const ORDER_STATUS_LIST = Object.entries(ORDER_STATUS).map(
  ([value, meta]) => ({ value: value as OrderStatus, ...meta }),
)
