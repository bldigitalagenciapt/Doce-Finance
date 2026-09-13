import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const PRICES: Record<string, string | undefined> = {
  BRL_monthly: process.env.STRIPE_PRICE_BRL_MONTHLY,
  BRL_yearly:  process.env.STRIPE_PRICE_BRL_YEARLY,
  EUR_monthly: process.env.STRIPE_PRICE_EUR_MONTHLY,
  EUR_yearly:  process.env.STRIPE_PRICE_EUR_YEARLY,
}

export async function POST(req: NextRequest) {
  const { plan, currency } = await req.json() as { plan: 'monthly' | 'yearly'; currency: 'BRL' | 'EUR' }
  const priceId = PRICES[`${currency}_${plan}`]
  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!stripeKey || !priceId) {
    // Stripe ainda nao configurado — redirecionar para cadastro
    return NextResponse.json({ url: '/login' })
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-08-26.dahlia' as any })
    const origin = req.headers.get('origin') || 'https://doce-finance.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
