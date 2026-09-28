import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const VALID_PLANS = ['monthly', 'yearly'] as const
const VALID_CURRENCIES = ['BRL', 'EUR'] as const

const PRICES: Record<string, string | undefined> = {
  BRL_monthly: process.env.STRIPE_PRICE_BRL_MONTHLY,
  BRL_yearly:  process.env.STRIPE_PRICE_BRL_YEARLY,
  EUR_monthly: process.env.STRIPE_PRICE_EUR_MONTHLY,
  EUR_yearly:  process.env.STRIPE_PRICE_EUR_YEARLY,
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const { plan, currency } = body as { plan: unknown; currency: unknown }

  // Validação explícita de input — evita manipulação de parâmetros
  if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
    return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
  }
  if (!VALID_CURRENCIES.includes(currency as typeof VALID_CURRENCIES[number])) {
    return NextResponse.json({ error: 'Moeda inválida.' }, { status: 400 })
  }

  const priceId = PRICES[`${currency}_${plan}`]
  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!stripeKey || !priceId) {
    // Stripe ainda nao configurado — redirecionar para cadastro
    return NextResponse.json({ url: '/login' })
  }

  // Valida a origem da requisição para prevenir CSRF
  const origin = req.headers.get('origin')
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://doce-finance.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean)

  const safeOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://doce-finance.vercel.app')

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-08-26.dahlia' as any })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${safeOrigin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeOrigin}/#pricing`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno.'
    console.error('[checkout]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

