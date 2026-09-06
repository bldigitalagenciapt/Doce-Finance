'use client'

import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import type { Order } from '@/types/database'
import { Badge } from '@/components/ui/Badge'
import { useCurrency } from '@/hooks/useCurrency'
import { formatDateTime } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/orderStatus'

export function UpcomingOrders({
  orders,
  title = 'Próximas entregas',
  emptyText = 'Nenhuma entrega agendada.',
}: {
  orders: Order[]
  title?: string
  emptyText?: string
}) {
  const { format } = useCurrency()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <Link href="/pedidos" className="text-sm font-medium text-brand-700 hover:underline">
          Ver todos
        </Link>
      </div>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarClock className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">{emptyText}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {o.client?.name || 'Cliente não informado'}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(o.delivery_date, o.delivery_time)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {format(o.total)}
                </span>
                <Badge tone={ORDER_STATUS[o.status].tone}>
                  {ORDER_STATUS[o.status].label}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
