import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Utilitários Stripe — USO EXCLUSIVO NO SERVIDOR.
 * Nunca importe este arquivo em componentes 'use client'.
 */

export const VALID_PLANS = ['monthly', 'yearly'] as const
export const VALID_CURRENCIES = ['BRL', 'EUR'] as const
export type Plan = (typeof VALID_PLANS)[number]
export type BillingCurrency = (typeof VALID_CURRENCIES)[number]

let stripeSingleton: Stripe | null = null

/** Instância lazy: não quebra o build quando a variável não existe. */
export function getStripe(): Stripe {
  if (typeof window !== 'undefined') {
    throw new Error('getStripe() é exclusivo para execução no servidor.')
  }
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada.')
  if (!stripeSingleton) {
    // Sem apiVersion explícita: usa a versão fixada pelo SDK instalado.
    stripeSingleton = new Stripe(key, { appInfo: { name: 'Doce Finance' } })
  }
  return stripeSingleton
}

export function getPriceId(currency: BillingCurrency, plan: Plan): string | undefined {
  const map: Record<string, string | undefined> = {
    BRL_monthly: process.env.STRIPE_PRICE_BRL_MONTHLY,
    BRL_yearly: process.env.STRIPE_PRICE_BRL_YEARLY,
    EUR_monthly: process.env.STRIPE_PRICE_EUR_MONTHLY,
    EUR_yearly: process.env.STRIPE_PRICE_EUR_YEARLY,
  }
  return map[`${currency}_${plan}`]
}

/** Origem segura para URLs de retorno (evita open redirect). */
export function getSafeOrigin(requestOrigin: string | null): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const allowed = [appUrl, 'https://doce-finance.vercel.app']
  if (process.env.NODE_ENV !== 'production') allowed.push('http://localhost:3000')
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin
  return appUrl || 'https://doce-finance.vercel.app'
}

/**
 * Converte o status da assinatura Stripe para o status do app.
 * Retorna null quando não devemos alterar o perfil (ex.: 1º pagamento pendente).
 */
export function mapSubscriptionStatus(status: Stripe.Subscription.Status): string | null {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
      return 'past_due' // mantém acesso durante as retentativas do Stripe
    case 'unpaid':
    case 'canceled':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled'
    case 'incomplete':
    default:
      return null
  }
}

/**
 * Sincroniza uma assinatura Stripe com a tabela profiles.
 * Idempotente: pode ser chamada pelo webhook e pela página /sucesso.
 */
export async function syncSubscriptionToProfile(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
  userIdHint?: string | null,
): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const userId = userIdHint || subscription.metadata?.user_id || null
  const appStatus = mapSubscriptionStatus(subscription.status)
  if (!appStatus) return

  const update = {
    subscription_status: appStatus,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
  }

  if (userId) {
    // Evita que um evento atrasado de uma assinatura ANTIGA sobrescreva a atual
    const { data: profile, error: readErr } = await admin
      .from('profiles')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', userId)
      .single()
    if (readErr) throw readErr

    const isOtherSub =
      profile?.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id
    if (isOtherSub && appStatus === 'canceled') return

    const { error } = await admin.from('profiles').update(update).eq('id', userId)
    if (error) throw error
    return
  }

  // Fallback: localizar pelo customer, somente se for a mesma assinatura (ou nenhuma)
  const { error } = await admin
    .from('profiles')
    .update(update)
    .eq('stripe_customer_id', customerId)
    .or(`stripe_subscription_id.is.null,stripe_subscription_id.eq.${subscription.id}`)
  if (error) throw error
}
