'use client'

import { useEffect, useState } from 'react'
import {
  ShoppingBag,
  DollarSign,
  Users,
  BookOpen,
} from 'lucide-react'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { UpcomingOrders } from '@/components/dashboard/UpcomingOrders'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Order } from '@/types/database'

export default function DashboardPage() {
  const supabase = useSupabase()
  const { format } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    ordersMonth: 0,
    revenueMonth: 0,
    clients: 0,
    recipes: 0,
  })
  const [upcoming, setUpcoming] = useState<Order[]>([])
  const [recent, setRecent] = useState<Order[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10)
      const today = now.toISOString().slice(0, 10)
      const in7 = new Date(now.getTime() + 7 * 86400000)
        .toISOString()
        .slice(0, 10)

      const [ordersMonthRes, clientsRes, recipesRes, upcomingRes, recentRes] =
        await Promise.all([
          supabase
            .from('orders')
            .select('total, status, created_at')
            .gte('created_at', firstDay),
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('recipes').select('id', { count: 'exact', head: true }),
          supabase
            .from('orders')
            .select('*, client:clients(*)')
            .gte('delivery_date', today)
            .lte('delivery_date', in7)
            .not('status', 'in', '(entregue,cancelado)')
            .order('delivery_date', { ascending: true })
            .limit(6),
          supabase
            .from('orders')
            .select('*, client:clients(*)')
            .order('created_at', { ascending: false })
            .limit(5),
        ])

      const ordersMonth = ordersMonthRes.data || []
      const revenue = ordersMonth
        .filter((o) => !['orcamento', 'cancelado'].includes(o.status))
        .reduce((sum, o) => sum + Number(o.total || 0), 0)

      setMetrics({
        ordersMonth: ordersMonth.length,
        revenueMonth: revenue,
        clients: clientsRes.count || 0,
        recipes: recipesRes.count || 0,
      })
      setUpcoming((upcomingRes.data as Order[]) || [])
      setRecent((recentRes.data as Order[]) || [])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral do seu atelier este mês.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pedidos no mês"
          value={String(metrics.ordersMonth)}
          icon={ShoppingBag}
          tone="brand"
        />
        <MetricCard
          label="Faturamento do mês"
          value={format(metrics.revenueMonth)}
          icon={DollarSign}
          tone="green"
        />
        <MetricCard
          label="Clientes"
          value={String(metrics.clients)}
          icon={Users}
          tone="blue"
        />
        <MetricCard
          label="Receitas cadastradas"
          value={String(metrics.recipes)}
          icon={BookOpen}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UpcomingOrders orders={upcoming} />
        <UpcomingOrders
          orders={recent}
          title="Pedidos recentes"
          emptyText="Nenhum pedido registrado ainda."
        />
      </div>
    </div>
  )
}
