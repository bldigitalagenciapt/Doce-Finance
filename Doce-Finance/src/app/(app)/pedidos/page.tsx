'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShoppingBag, Plus, Pencil, Trash2, Share2, Copy, ExternalLink, MessageCircle, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PedidoModal } from '@/components/pedidos/PedidoModal'
import { ORDER_STATUS, ORDER_STATUS_LIST } from '@/lib/orderStatus'
import { formatDateTime, cn } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types/database'

export default function PedidosPage() {
  const supabase = useSupabase()
  const { format } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<OrderStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState<Order | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [sharing, setSharing] = useState<Order | null>(null)

  const shareUrl = sharing
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/orcamento/${sharing.id}`
    : ''

  const copyLink = async (url: string, opts?: { silent?: boolean }) => {
    try {
      await navigator.clipboard.writeText(url)
      if (!opts?.silent) toast.success('Link copiado!')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  const openShare = (o: Order) => {
    const url = `${window.location.origin}/orcamento/${o.id}`
    copyLink(url, { silent: true })
    setSharing(o)
    toast.success('Link do orçamento copiado!')
  }

  const whatsappHref = (o: Order, url: string) => {
    const cliente = o.client?.name ? `${o.client.name}, ` : ''
    const text = `Olá ${cliente}segue o seu orçamento: ${url}`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, client:clients(*)')
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar pedidos.')
    setOrders((data as Order[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    ORDER_STATUS_LIST.forEach((s) => {
      c[s.value] = orders.filter((o) => o.status === s.value).length
    })
    return c
  }, [orders])

  const filtered = useMemo(
    () => (tab === 'all' ? orders : orders.filter((o) => o.status === tab)),
    [orders, tab],
  )

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const { error } = await supabase.from('orders').delete().eq('id', deleting.id)
    setDeleteLoading(false)
    if (error) {
      toast.error('Não foi possível excluir o pedido.')
    } else {
      toast.success('Pedido excluído.')
      setDeleting(null)
      load()
    }
  }

  const tabs: { value: OrderStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    ...ORDER_STATUS_LIST.map((s) => ({ value: s.value, label: s.label })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500">Orçamentos e pedidos do seu negócio.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Novo pedido
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.value
                ? 'bg-brand-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200',
            )}
          >
            {t.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs',
                tab === t.value ? 'bg-white/20' : 'bg-gray-100',
              )}
            >
              {counts[t.value] || 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhum pedido encontrado"
          description="Crie orçamentos e pedidos para acompanhar as entregas."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Criar pedido
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nº</TH>
              <TH>Cliente</TH>
              <TH>Entrega</TH>
              <TH>Status</TH>
              <TH>Total</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((o) => (
              <TR key={o.id}>
                <TD className="font-medium text-gray-900">#{o.order_number}</TD>
                <TD>{o.client?.name || '—'}</TD>
                <TD>{formatDateTime(o.delivery_date, o.delivery_time)}</TD>
                <TD>
                  <Badge tone={ORDER_STATUS[o.status].tone}>
                    {ORDER_STATUS[o.status].label}
                  </Badge>
                </TD>
                <TD className="font-semibold text-gray-900">{format(o.total)}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openShare(o)}
                      title="Enviar orçamento"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(o)
                        setModalOpen(true)
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(o)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <PedidoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        message={`Excluir o pedido #${deleting?.order_number}? Esta ação não pode ser desfeita.`}
      />

      <Modal
        open={!!sharing}
        onClose={() => setSharing(null)}
        title="Enviar orçamento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Compartilhe este link com o cliente. Ele poderá ver o orçamento e a forma de
            pagamento sem precisar de login.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="h-10 w-full flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={() => copyLink(shareUrl)}
              title="Copiar link"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-brand-700"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="secondary" onClick={() => copyLink(shareUrl)}>
              <Copy className="h-4 w-4" />
              Copiar link
            </Button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir orçamento
            </a>
            {sharing && (
              <a
                href={whatsappHref(sharing, shareUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1fb457]"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            )}
          </div>
          {sharing && (
            <a
              href={`/api/orcamento/${sharing.id}/pdf?download=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#7C4A35] px-4 text-sm font-medium text-white transition-colors hover:bg-[#5C3526]"
            >
              <FileDown className="h-4 w-4" />
              Baixar PDF do orçamento
            </a>
          )}
        </div>
      </Modal>
    </div>
  )
}
