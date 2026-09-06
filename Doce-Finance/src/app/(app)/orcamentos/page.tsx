'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Copy,
  ExternalLink,
  MessageCircle,
  FileDown,
  DollarSign,
  CheckCircle2,
  Send,
  CalendarClock,
  Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { PedidoModal } from '@/components/pedidos/PedidoModal'
import { MetricCard } from '@/components/dashboard/MetricCard'
import {
  QUOTE_STATE,
  QUOTE_STATE_LIST,
  effectiveQuoteState,
  defaultValidUntil,
  toDateInput,
} from '@/lib/quoteState'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import type { Order, QuoteState } from '@/types/database'

export default function OrcamentosPage() {
  const supabase = useSupabase()
  const { format } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [sharing, setSharing] = useState<Order | null>(null)
  const [validade, setValidade] = useState<string>('')
  const [savingState, setSavingState] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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

  const openShare = async (o: Order) => {
    const url = `${window.location.origin}/orcamento/${o.id}`
    copyLink(url, { silent: true })

    let newState = o.quote_state || 'rascunho'
    const newValidade = o.quote_valid_until || toDateInput(defaultValidUntil(o.created_at))

    // Transição Automática de Status: Rascunho -> Aguardam resposta (enviado)
    if (newState === 'rascunho') {
      newState = 'enviado'
      await supabase.from('orders').update({
        quote_state: 'enviado',
        quote_sent_at: new Date().toISOString(),
        quote_valid_until: newValidade,
      }).eq('id', o.id)
      load()
    }

    setSharing({ ...o, quote_state: newState, quote_valid_until: newValidade })
    setValidade(newValidade.slice(0, 10))
    toast.success('Link copiado e status atualizado!')
  }

  const updateQuoteState = async (o: Order, newState: QuoteState) => {
    setUpdatingId(o.id)
    const { error } = await supabase
      .from('orders')
      .update({ quote_state: newState })
      .eq('id', o.id)
    setUpdatingId(null)
    
    if (error) {
      toast.error('Erro ao atualizar status.')
      return
    }
    toast.success('Status atualizado!')
    
    // Atualização Reativa Otimista
    setOrders((prev) =>
      prev.map((order) =>
        order.id === o.id ? { ...order, quote_state: newState } : order
      )
    )
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
    if (error) toast.error('Erro ao carregar orçamentos.')
    setOrders((data as Order[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Só salva validade (sem alterar o estado)
  const saveValidade = async () => {
    if (!sharing || !validade) return
    setSavingState(true)
    const { error } = await supabase
      .from('orders')
      .update({ quote_valid_until: validade })
      .eq('id', sharing.id)
    setSavingState(false)
    if (error) {
      toast.error(
        'Não foi possível salvar a validade. Aplique a migração do banco (add_quote_lifecycle.sql).',
      )
      return
    }
    toast.success('Validade atualizada.')
    setSharing((prev) => (prev ? { ...prev, quote_valid_until: validade } : prev))
    load()
  }

  // Marca como enviado (define enviado + sent_at + validade) — só se rascunho
  const markSent = async () => {
    if (!sharing) return
    setSavingState(true)
    const payload: Record<string, unknown> = {
      quote_valid_until: validade || toDateInput(defaultValidUntil(sharing.created_at)),
    }
    const current = sharing.quote_state || 'rascunho'
    if (current === 'rascunho') {
      payload.quote_state = 'enviado'
      payload.quote_sent_at = new Date().toISOString()
    }
    const { error } = await supabase.from('orders').update(payload).eq('id', sharing.id)
    setSavingState(false)
    if (error) {
      toast.error(
        'Não foi possível marcar como enviado. Aplique a migração do banco (add_quote_lifecycle.sql).',
      )
      return
    }
    toast.success(current === 'rascunho' ? 'Orçamento marcado como enviado!' : 'Validade atualizada.')
    setSharing((prev) =>
      prev
        ? {
            ...prev,
            quote_valid_until: (payload.quote_valid_until as string) || prev.quote_valid_until,
            quote_state: (payload.quote_state as Order['quote_state']) || prev.quote_state,
          }
        : prev,
    )
    load()
  }

  const metrics = useMemo(() => {
    let rascunhos = 0
    let aguardando = 0
    let aceites = 0
    let valorPendente = 0
    for (const o of orders) {
      const eff = effectiveQuoteState(o)
      if (eff === 'rascunho') rascunhos++
      if (eff === 'enviado' || eff === 'visualizado') {
        aguardando++
        valorPendente += o.total || 0
      }
      if (eff === 'aceite') aceites++
    }
    return { rascunhos, aguardando, aceites, valorPendente, total: orders.length }
  }, [orders])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <p className="text-sm text-gray-500">Gestão das suas propostas comerciais.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Rascunhos"
          value={String(metrics.rascunhos)}
          icon={FileText}
          tone="brand"
        />
        <MetricCard
          label="Aguardam resposta"
          value={String(metrics.aguardando)}
          icon={Send}
          tone="blue"
        />
        <MetricCard
          label="Aceites"
          value={String(metrics.aceites)}
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="Valor em aberto"
          value={format(metrics.valorPendente)}
          icon={DollarSign}
          tone="amber"
        />
      </div>

      {loading ? (
        <PageSpinner />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum orçamento encontrado"
          description="Crie pedidos na aba Pedidos para gerar e enviar orçamentos aos seus clientes."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nº</TH>
              <TH>Cliente</TH>
              <TH>Data</TH>
              <TH>Valor</TH>
              <TH>Estado</TH>
              <TH>Validade</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {orders.map((o) => {
              const eff = effectiveQuoteState(o)
              const meta = QUOTE_STATE[eff]
              return (
                <TR key={o.id}>
                  <TD className="font-medium text-gray-900">#{o.order_number}</TD>
                  <TD>{o.client?.name || '—'}</TD>
                  <TD>{formatDateTime(o.created_at)}</TD>
                  <TD className="font-semibold text-gray-900">{format(o.total)}</TD>
                  <TD>
                    <select
                      value={eff}
                      disabled={updatingId === o.id}
                      onChange={(e) => updateQuoteState(o, e.target.value as QuoteState)}
                      className={cn(
                        "h-8 rounded-full border-0 text-xs font-semibold px-2 py-1 cursor-pointer focus:ring-2 focus:ring-brand-500",
                        meta.tone === 'gray' && "bg-gray-100 text-gray-700",
                        meta.tone === 'blue' && "bg-blue-100 text-blue-700",
                        meta.tone === 'warning' && "bg-amber-100 text-amber-700",
                        meta.tone === 'success' && "bg-green-100 text-green-700",
                        meta.tone === 'danger' && "bg-red-100 text-red-700",
                        meta.tone === 'brand' && "bg-brand-100 text-brand-700"
                      )}
                    >
                      {QUOTE_STATE_LIST.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </TD>
                  <TD className="text-gray-600">
                    {o.quote_valid_until ? formatDate(o.quote_valid_until) : '—'}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(o)
                          setModalOpen(true)
                        }}
                        title="Editar orçamento"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <a
                        href={`/orcamento/${o.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver orçamento público"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <a
                        href={`/api/orcamento/${o.id}/pdf?download=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Baixar PDF"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                      >
                        <FileDown className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => openShare(o)}
                        title="Enviar / definir validade"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}

      <Modal
        open={!!sharing}
        onClose={() => setSharing(null)}
        title="Enviar orçamento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Compartilhe este link com o cliente. Ele poderá ver o orçamento, a forma de
            pagamento e aceitar ou recusar — sem precisar de login.
          </p>

          {/* Estado atual */}
          {sharing && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Estado:</span>
              <Badge tone={QUOTE_STATE[effectiveQuoteState(sharing)].tone}>
                {QUOTE_STATE[effectiveQuoteState(sharing)].label}
              </Badge>
            </div>
          )}

          {/* Validade */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Válido até
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Button variant="outline" onClick={saveValidade} loading={savingState}>
                <CalendarClock className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>

          {/* Link */}
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

          {/* Marcar como enviado */}
          <Button className="w-full" onClick={markSent} loading={savingState}>
            <Send className="h-4 w-4" />
            {(sharing?.quote_state || 'rascunho') === 'rascunho'
              ? 'Marcar como enviado'
              : 'Atualizar validade'}
          </Button>

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
              Abrir
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

      <PedidoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
      />
    </div>
  )
}
