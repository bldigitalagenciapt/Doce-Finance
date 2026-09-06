import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildPixPayload, pixKeyTypeLabel } from '@/lib/pix'
import { ORDER_STATUS } from '@/lib/orderStatus'
import {
  QUOTE_STATE,
  effectiveQuoteState,
  isRespondable,
  defaultValidUntil,
} from '@/lib/quoteState'
import type { Client, Order, OrderItem, Profile } from '@/types/database'
import { PrintButton } from '@/components/orcamento/PrintButton'
import { QuoteActions } from '@/components/orcamento/QuoteActions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { token: string }
}

/** UUID v4 simples para validar o token antes de consultar o banco. */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

interface OrcamentoData {
  order: Order
  client: Client | null
  profile: Profile
  items: OrderItem[]
}

async function getOrcamento(token: string): Promise<OrcamentoData | null> {
  if (!isUuid(token)) return null
  const supabase = createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', token)
    .single()
  if (error || !order) return null

  const [{ data: profile }, { data: client }, { data: items }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', order.user_id).single(),
    order.client_id
      ? supabase.from('clients').select('*').eq('id', order.client_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true }),
  ])

  if (!profile) return null

  return {
    order: order as Order,
    client: (client as Client) || null,
    profile: profile as Profile,
    items: (items as OrderItem[]) || [],
  }
}

function formatCurrency(value: number, currency: Profile['currency']): string {
  const locale = currency === 'EUR' ? 'pt-PT' : 'pt-BR'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value || 0)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getOrcamento(params.token)
  if (!data) {
    return { title: 'Orçamento não encontrado' }
  }
  const atelier = data.profile.business_name || 'Atelier'
  const title = `Orçamento — ${atelier}`
  const description = data.client?.name
    ? `Orçamento para ${data.client.name} · ${formatCurrency(data.order.total, data.profile.currency)}`
    : `Confira o seu orçamento de ${atelier}.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function OrcamentoPage({ params }: PageProps) {
  const data = await getOrcamento(params.token)
  if (!data) notFound()

  const { order, client, profile, items } = data
  const currency = profile.currency
  const atelier = profile.business_name || 'Atelier'
  const status = ORDER_STATUS[order.status]

  // Validade: usa quote_valid_until (real) se existir; senão created_at + 15 dias
  const validUntil = order.quote_valid_until
    ? new Date(order.quote_valid_until + 'T23:59:59')
    : defaultValidUntil(order.created_at)

  // Estado do ciclo de vida do orçamento (deriva 'expirado' quando aplicável)
  const quoteState = effectiveQuoteState(order)
  const quoteMeta = QUOTE_STATE[quoteState]
  const respondable = isRespondable(order)

  // QR Code Pix (apenas Brasil / chave Pix configurada)
  let pixQrDataUrl: string | null = null
  let pixPayload: string | null = null
  if (currency === 'BRL' && profile.pix_key) {
    pixPayload = buildPixPayload({
      pixKey: profile.pix_key,
      merchantName: atelier,
      amount: order.total,
      txid: order.order_number ? `PED${order.order_number}` : undefined,
    })
    try {
      pixQrDataUrl = await QRCode.toDataURL(pixPayload, { margin: 1, width: 220 })
    } catch {
      pixQrDataUrl = null
    }
  }

  const hasMbway = !!profile.mbway_phone
  const remaining = Math.max(order.total - (order.paid_amount || 0), 0)

  return (
    <div className="min-h-screen bg-[#FDFAF7] py-6 px-4 sm:py-10">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-lg print:shadow-none">
        {/* Header */}
        <div className="bg-[#7C4A35] px-6 py-8 text-white sm:px-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70">Orçamento</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{atelier}</h1>
              {profile.full_name && (
                <p className="mt-1 text-sm text-white/80">{profile.full_name}</p>
              )}
            </div>
            <div className="text-right">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                {status?.label || order.status}
              </span>
              <p className="mt-2 text-xs text-white/70">Nº {order.order_number}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-6 py-8 sm:px-10">
          {/* PARA / DETALHES */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-[#FDFAF7] p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7C4A35]">Para</p>
              <p className="text-base font-semibold text-gray-900">{client?.name || 'Cliente'}</p>
              {client?.phone && <p className="mt-1 text-sm text-gray-600">{client.phone}</p>}
              {client?.email && <p className="text-sm text-gray-600">{client.email}</p>}
              {order.delivery_address && (
                <p className="mt-1 text-sm text-gray-600">{order.delivery_address}</p>
              )}
            </div>
            <div className="rounded-xl border border-gray-100 bg-[#FDFAF7] p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7C4A35]">Detalhes</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <span className="text-gray-400">Emitido em:</span>{' '}
                  {formatDate(order.created_at)}
                </p>
                <p>
                  <span className="text-gray-400">Válido até:</span>{' '}
                  {formatDate(validUntil.toISOString())}
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-gray-400">Estado:</span>{' '}
                  <span
                    className="inline-block rounded-full bg-[#7C4A35]/10 px-2 py-0.5 text-xs font-medium text-[#7C4A35]"
                  >
                    {quoteMeta.label}
                  </span>
                </p>
                {order.delivery_date && (
                  <p>
                    <span className="text-gray-400">Entrega:</span>{' '}
                    {formatDate(order.delivery_date)}
                    {order.delivery_time ? ` · ${order.delivery_time}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ITENS */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#7C4A35]">Itens</p>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FDFAF7] text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 text-center font-medium">Qtd.</th>
                    <th className="px-4 py-3 text-right font-medium">Valor unit.</th>
                    <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                        Nenhum item.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(item.unit_price, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.subtotal, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totais */}
            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal, currency)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Desconto</span>
                    <span>- {formatCurrency(order.discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-[#7C4A35]">
                  <span>Total</span>
                  <span>{formatCurrency(order.total, currency)}</span>
                </div>
                {order.paid_amount > 0 && (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Pago</span>
                      <span>{formatCurrency(order.paid_amount, currency)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900">
                      <span>Restante</span>
                      <span>{formatCurrency(remaining, currency)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* COMO PAGAR */}
          {(pixQrDataUrl || hasMbway || profile.payment_instructions) && (
            <div className="rounded-xl border border-gray-100 bg-[#FDFAF7] p-5 sm:p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[#7C4A35]">Como pagar</p>

              {pixQrDataUrl && (
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pixQrDataUrl}
                    alt="QR Code Pix"
                    className="h-44 w-44 rounded-lg border border-gray-200 bg-white p-2"
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-gray-900">Pague com Pix</p>
                    <p className="mt-1 text-gray-600">
                      {pixKeyTypeLabel(profile.pix_key_type)}: <strong>{profile.pix_key}</strong>
                    </p>
                    <p className="mt-2 text-xs text-gray-500">Pix Copia e Cola:</p>
                    <p className="mt-1 break-all rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-[11px] text-gray-600">
                      {pixPayload}
                    </p>
                  </div>
                </div>
              )}

              {hasMbway && (
                <div className={pixQrDataUrl ? 'mt-4 border-t border-gray-200 pt-4' : ''}>
                  <p className="text-sm font-semibold text-gray-900">Mbway</p>
                  <p className="mt-1 text-sm text-gray-600">{profile.mbway_phone}</p>
                </div>
              )}

              {profile.payment_instructions && (
                <div className={pixQrDataUrl || hasMbway ? 'mt-4 border-t border-gray-200 pt-4' : ''}>
                  <p className="text-sm font-semibold text-gray-900">Instruções</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                    {profile.payment_instructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* OBSERVAÇÕES */}
          {order.notes && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7C4A35]">Observações</p>
              <p className="whitespace-pre-line rounded-xl border border-gray-100 bg-[#FDFAF7] p-4 text-sm text-gray-600">
                {order.notes}
              </p>
            </div>
          )}

          {/* Resposta do cliente (aceitar / recusar / expirado) */}
          <QuoteActions orderId={order.id} state={quoteState} respondable={respondable} />

          {/* Ações */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href={`/api/orcamento/${order.id}/pdf?download=1`}
              className="no-print inline-flex items-center gap-2 rounded-lg bg-[#7C4A35] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5C3526]"
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </a>
            <PrintButton />
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t border-gray-100 bg-[#FDFAF7] px-6 py-4 text-center sm:px-10">
          <p className="text-xs text-gray-400">
            Orçamento gerado por {atelier}. Válido até {formatDate(validUntil.toISOString())}.
          </p>
        </div>
      </div>
    </div>
  )
}
