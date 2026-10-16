import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, syncSubscriptionToProfile } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
])

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET/STRIPE_SECRET_KEY ausentes')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })
  }

  const stripe = getStripe()
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    console.error('[webhook] Assinatura inválida:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type })
  }

  const admin = createAdminClient()

  try {
    // Idempotência: ignora eventos já processados com sucesso
    const { data: existing } = await admin
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle()
    if (existing) return NextResponse.json({ received: true, duplicate: true })

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription' || !session.subscription) break
        // Pagamentos assíncronos só liberam acesso quando confirmados
        if (session.payment_status === 'unpaid') break

        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = session.client_reference_id || session.metadata?.user_id || null
        await syncSubscriptionToProfile(admin, subscription, userId)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription
        await syncSubscriptionToProfile(admin, subscription)
        break
      }
    }

    // Marca como processado SOMENTE após sucesso — se falhar, o Stripe reenvia
    const { error: insertErr } = await admin
      .from('stripe_events')
      .insert({ id: event.id, type: event.type })
    if (insertErr && insertErr.code !== '23505') {
      console.error('[webhook] Falha ao registrar evento:', insertErr)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    console.error(`[webhook] Erro ao processar ${event.type} (${event.id}):`, err)
    // 500 faz o Stripe tentar novamente (retentativas por até 3 dias)
    return NextResponse.json({ error: 'Erro ao processar evento' }, { status: 500 })
  }
}
