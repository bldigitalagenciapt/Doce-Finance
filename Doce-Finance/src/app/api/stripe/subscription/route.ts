import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSubscriptionPeriodEnd(sub: unknown): number | null {
  if (!sub || typeof sub !== 'object') return null
  const s = sub as {
    current_period_end?: unknown
    items?: { data?: Array<{ current_period_end?: unknown }> }
  }
  const itemEnd = s.items?.data?.[0]?.current_period_end
  if (typeof itemEnd === 'number') return itemEnd
  if (typeof s.current_period_end === 'number') return s.current_period_end
  return null
}

/**
 * Consulta e gerencia a assinatura do usuário atual.
 * Permite cancelamento facilitado e reativação sem fricção.
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe não configurado.' }, { status: 503 })
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    const stripe = getStripe()

    // Se temos um ID de assinatura salvo, busca direto no Stripe
    let subscription = null
    if (profile.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      } catch (err) {
        console.warn('[subscription:get] Assinatura não encontrada no Stripe:', err)
      }
    }

    // Se não encontrou pelo ID mas tem customer, busca a assinatura mais recente
    if (!subscription && profile.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'all',
        limit: 1,
      })
      if (subs.data.length > 0) {
        subscription = subs.data[0]
      }
    }

    if (!subscription) {
      return NextResponse.json({
        has_subscription: false,
        status: profile.subscription_status || 'none',
        trial_ends_at: profile.trial_ends_at,
      })
    }

    // Extrai dados essenciais para o cliente
    const item = subscription.items?.data?.[0]
    const price = item?.price
    const periodEndTs = getSubscriptionPeriodEnd(subscription)
    const currentPeriodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null

    return NextResponse.json({
      has_subscription: true,
      id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: currentPeriodEnd,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      plan: {
        interval: price?.recurring?.interval || 'month',
        currency: price?.currency?.toUpperCase() || 'BRL',
        amount: price?.unit_amount ? price.unit_amount / 100 : 0,
      },
    })
  } catch (err: unknown) {
    console.error('[subscription:get]', err)
    return NextResponse.json({ error: 'Erro ao consultar assinatura.' }, { status: 500 })
  }
}

/**
 * Ações de assinatura:
 * - action: 'cancel' -> Agenda cancelamento para o término do período pago.
 * - action: 'resume' -> Reativa a renovação automática se o período ainda não expirou.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe não configurado.' }, { status: 503 })
  }

  let body: { action?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const { action } = body
  if (action !== 'cancel' && action !== 'resume') {
    return NextResponse.json({ error: "Ação inválida. Use 'cancel' ou 'resume'." }, { status: 400 })
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    let subId = profile?.stripe_subscription_id

    const stripe = getStripe()

    // Fallback: se não tiver o ID salvo no perfil, tenta achar pelo customer
    if (!subId && profile?.stripe_customer_id) {
      const activeSubs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
        limit: 1,
      })
      if (activeSubs.data.length > 0) {
        subId = activeSubs.data[0].id
      }
    }

    if (!subId) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada para esta conta.' },
        { status: 404 }
      )
    }

    if (action === 'cancel') {
      // Cancelamento facilitado: não cobra na próxima data e mantém acesso até o fim do período pago
      const updated = await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
      })

      const periodEndTs = getSubscriptionPeriodEnd(updated)
      const endDate = periodEndTs
        ? new Date(periodEndTs * 1000).toLocaleDateString('pt-BR')
        : 'o final do período'

      return NextResponse.json({
        success: true,
        message: `Assinatura cancelada com sucesso. Você continua com acesso até ${endDate}. Nenhuma nova cobrança será feita.`,
        cancel_at_period_end: updated.cancel_at_period_end,
      })
    } else {
      // Reativação da renovação automática
      const updated = await stripe.subscriptions.update(subId, {
        cancel_at_period_end: false,
      })

      return NextResponse.json({
        success: true,
        message: 'Assinatura reativada com sucesso! A renovação automática foi restabelecida.',
        cancel_at_period_end: updated.cancel_at_period_end,
      })
    }
  } catch (err: unknown) {
    console.error('[subscription:post]', err)
    return NextResponse.json(
      { error: 'Não foi possível atualizar a assinatura. Tente novamente ou use o portal.' },
      { status: 500 }
    )
  }
}
