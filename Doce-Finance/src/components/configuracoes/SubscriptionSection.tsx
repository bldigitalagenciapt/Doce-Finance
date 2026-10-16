'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  XCircle,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Profile } from '@/types/database'

interface SubscriptionData {
  has_subscription: boolean
  id?: string
  status?: string
  cancel_at_period_end?: boolean
  current_period_end?: string | null
  cancel_at?: string | null
  trial_ends_at?: string | null
  plan?: {
    interval: 'month' | 'year'
    currency: string
    amount: number
  }
}

interface Props {
  profile: Profile | null
}

export function SubscriptionSection({ profile }: Props) {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const loadSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscription')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setData({
          has_subscription: false,
          status: profile?.subscription_status || 'none',
          trial_ends_at: profile?.trial_ends_at,
        })
      }
    } catch {
      setData({
        has_subscription: false,
        status: profile?.subscription_status || 'none',
        trial_ends_at: profile?.trial_ends_at,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const handleOpenPortal = async () => {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        toast.error(json.error || 'Não foi possível abrir o portal.')
      }
    } catch {
      toast.error('Erro de conexão ao abrir portal.')
    } finally {
      setLoadingPortal(false)
    }
  }

  const handleCancelSubscription = async () => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(json.message || 'Assinatura cancelada com sucesso.')
        setShowCancelModal(false)
        await loadSubscription()
      } else {
        toast.error(json.error || 'Erro ao cancelar assinatura.')
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResumeSubscription = async () => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(json.message || 'Assinatura reativada com sucesso!')
        await loadSubscription()
      } else {
        toast.error(json.error || 'Erro ao reativar assinatura.')
      }
    } catch {
      toast.error('Erro de conexão ao reativar.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Data não disponível'
    try {
      return new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return isoString
    }
  }

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency,
      }).format(amount)
    } catch {
      return `${currency} ${amount.toFixed(2)}`
    }
  }

  const isTrial =
    !data?.has_subscription &&
    (data?.status === 'trialing' || profile?.subscription_status === 'trialing')
  const trialExpired =
    isTrial && profile?.trial_ends_at ? new Date(profile.trial_ends_at) < new Date() : false
  const isCanceledAtPeriodEnd = data?.cancel_at_period_end === true
  const isActive = data?.status === 'active' || data?.status === 'trialing'
  const isPastDue = data?.status === 'past_due'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card lg:col-span-2">
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Assinatura e Faturamento</h2>
            <p className="text-xs text-gray-500">
              Controle seu plano, formas de pagamento e cancelamento facilitado
            </p>
          </div>
        </div>

        {/* Badge de status */}
        {!loading && (
          <div>
            {isCanceledAtPeriodEnd ? (
              <Badge tone="warning" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Cancelamento agendado
              </Badge>
            ) : isActive ? (
              <Badge tone="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Assinatura Ativa
              </Badge>
            ) : isPastDue ? (
              <Badge tone="danger" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Pagamento Pendente
              </Badge>
            ) : isTrial ? (
              <Badge tone={trialExpired ? 'danger' : 'purple'} className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {trialExpired ? 'Avaliação Expirada' : 'Período de Teste'}
              </Badge>
            ) : (
              <Badge tone="gray">Sem Assinatura Ativa</Badge>
            )}
          </div>
        )}
      </div>

      {/* Conteúdo principal */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <span className="ml-2 text-sm text-gray-500">Consultando status da assinatura...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Card com detalhes do plano atual */}
          {data?.has_subscription && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-xs font-medium uppercase text-gray-400">Plano</span>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    Doce Finance {data.plan?.interval === 'year' ? 'Anual' : 'Mensal'}
                  </p>
                  {data.plan && (
                    <p className="text-xs text-gray-500">
                      {formatCurrency(data.plan.amount, data.plan.currency)} /{' '}
                      {data.plan.interval === 'year' ? 'ano' : 'mês'}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-medium uppercase text-gray-400">
                    {isCanceledAtPeriodEnd ? 'Acesso válido até' : 'Próxima Renovação'}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-800">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(data.current_period_end)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium uppercase text-gray-400">Renovação</span>
                  <p className="mt-1 text-sm font-medium">
                    {isCanceledAtPeriodEnd ? (
                      <span className="text-amber-600 font-semibold">
                        Desativada (não haverá cobrança)
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold">Automática</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Banner de cancelamento agendado */}
          {isCanceledAtPeriodEnd && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold">O cancelamento da sua assinatura está agendado.</p>
                  <p className="mt-1 text-amber-700">
                    Você continuará com acesso irrestrito até{' '}
                    <strong>{formatDate(data?.current_period_end)}</strong>. Nenhuma nova cobrança
                    será realizada no seu cartão. Se mudou de ideia, você pode reativar com apenas um
                    clique.
                  </p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={handleResumeSubscription}
                      loading={actionLoading}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Reativar minha assinatura
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Período de teste gratuito */}
          {isTrial && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Você está no período de avaliação gratuita!</p>
                  <p className="mt-1 text-purple-700">
                    {trialExpired
                      ? 'Seu período de teste expirou. Escolha um plano para reativar seu acesso.'
                      : `Aproveite todos os recursos. Seu teste é válido até ${formatDate(profile?.trial_ends_at)}.`}
                  </p>
                </div>
                <Link href="/paywall">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                    Assinar Agora
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Inadimplência / Past due */}
          {isPastDue && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Pagamento da assinatura pendente</p>
                  <p className="mt-1 text-red-700">
                    Houve uma falha na renovação da sua assinatura. Atualize a forma de pagamento
                    no portal para evitar a perda de acesso.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleOpenPortal}
                  loading={loadingPortal}
                >
                  Regularizar Cartão
                </Button>
              </div>
            </div>
          )}

          {/* Sem assinatura e sem trial */}
          {!data?.has_subscription && !isTrial && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Nenhuma assinatura ativa no momento.</p>
                <p className="text-gray-500">
                  Desbloqueie fichas técnicas, orçamentos e pedidos ilimitados.
                </p>
              </div>
              <Link href="/paywall">
                <Button size="sm">Escolher Plano</Button>
              </Link>
            </div>
          )}

          {/* Ações e botões */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleOpenPortal}
                loading={loadingPortal}
                variant="outline"
                className="flex items-center gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                Portal do Cliente (Faturas e Cartão)
              </Button>
            </div>

            {/* BOTÃO DE CANCELAMENTO FACILITADO */}
            {data?.has_subscription && !isCanceledAtPeriodEnd && (
              <Button
                variant="ghost"
                onClick={() => setShowCancelModal(true)}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-medium"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Cancelar assinatura
              </Button>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      <ConfirmDialog
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        loading={actionLoading}
        title="Cancelar assinatura facilitado"
        message={`Tem certeza de que deseja cancelar a renovação da sua assinatura? Seu acesso continuará liberado até ${formatDate(data?.current_period_end)}. Nenhuma cobrança futura será realizada.`}
        confirmLabel="Sim, confirmar cancelamento"
      />
    </div>
  )
}
