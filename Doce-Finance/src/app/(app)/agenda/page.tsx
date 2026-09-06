'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { ORDER_STATUS } from '@/lib/orderStatus'
import { cn, formatDateTime } from '@/lib/utils'
import type { Order } from '@/types/database'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AgendaPage() {
  const supabase = useSupabase()
  const { format: formatMoney } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(new Date())
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Order | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('orders')
        .select('*, client:clients(*)')
        .not('delivery_date', 'is', null)
      setOrders((data as Order[]) || [])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [current])

  const ordersByDay = useMemo(() => {
    const map: Record<string, Order[]> = {}
    orders.forEach((o) => {
      if (!o.delivery_date) return
      const key = o.delivery_date
      map[key] = map[key] || []
      map[key].push(o)
    })
    return map
  }, [orders])

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500">Entregas agendadas por data.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-gray-900">
            {format(current, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-semibold uppercase text-gray-500"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayOrders = ordersByDay[key] || []
            const inMonth = isSameMonth(day, current)
            const today = isSameDay(day, new Date())
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[96px] border-b border-r border-gray-100 p-1.5',
                  !inMonth && 'bg-gray-50/60',
                )}
              >
                <div
                  className={cn(
                    'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    today ? 'bg-brand-700 font-semibold text-white' : 'text-gray-500',
                    !inMonth && 'text-gray-300',
                  )}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayOrders.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setSelected(o)}
                      className="block w-full truncate rounded bg-brand-50 px-1.5 py-0.5 text-left text-[11px] font-medium text-brand-800 hover:bg-brand-100"
                    >
                      {o.delivery_time ? o.delivery_time.slice(0, 5) + ' ' : ''}
                      {o.client?.name || `Pedido #${o.order_number}`}
                    </button>
                  ))}
                  {dayOrders.length > 3 && (
                    <span className="block px-1 text-[10px] text-gray-400">
                      +{dayOrders.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Pedido #${selected.order_number}` : ''}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente</span>
              <span className="font-medium text-gray-900">
                {selected.client?.name || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Entrega</span>
              <span className="font-medium text-gray-900">
                {formatDateTime(selected.delivery_date, selected.delivery_time)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <Badge tone={ORDER_STATUS[selected.status].tone}>
                {ORDER_STATUS[selected.status].label}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-brand-700">
                {formatMoney(selected.total)}
              </span>
            </div>
            {selected.notes && (
              <div className="rounded-lg bg-gray-50 p-3 text-gray-600">
                {selected.notes}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
