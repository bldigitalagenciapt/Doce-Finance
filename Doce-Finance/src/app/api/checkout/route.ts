import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import {
  VALID_PLANS,
  VALID_CURRENCIES,
  type Plan,
  type BillingCurrency,
  getStripe,
  getPriceId,
  getSafeOrigin,
} from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()

  // Sem usuário não há como vincular o pagamento à conta → exige login
  if (!user) {
    return NextResponse.json({ url: '/login' }, { status: 401 })
  }

  const { plan, currency } = body as { plan: unknown; currency: unknown }

  // Validação explícita de input — evita manipulação de parâmetros
  if (!VALID_PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
  }
  if (!VALID_CURRENCIES.includes(currency as BillingCurrency)) {
    return NextResponse.json({ error: 'Moeda inválida.' }, { status: 400 })
  }

  const priceId = getPriceId(currency as BillingCurrency, plan as Plan)
  if (!process.env.STRIPE_SECRET_KEY || !priceId) {
    console.error(`[checkout] Stripe não configurado para ${currency}_${plan}`)
    return NextResponse.json(
      { error: 'Pagamentos temporariamente indisponíveis. Tente novamente em instantes.' },
      { status: 503 },
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, stripe_customer_id')
    .eq('id', user.id)
    .single()

  // Evita assinatura duplicada (cobrança dupla)
  if (profile?.subscription_status === 'active' || profile?.subscription_status === 'past_due') {
    return NextResponse.json(
      { error: 'Você já possui uma assinatura. Gerencie-a em Configurações.' },
      { status: 409 },
    )
  }

  const safeOrigin = getSafeOrigin(req.headers.get('origin'))

  try {
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${safeOrigin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeOrigin}/paywall`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: user.id,
      // Reaproveita o cliente Stripe existente (evita clientes duplicados)
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id, customer_update: { address: 'auto', name: 'auto' } }
        : { customer_email: user.email }),
      // Metadados na assinatura para o webhook achar o usuário em renovações/cancelamentos
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      locale: currency === 'BRL' ? 'pt-BR' : 'pt',
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    // Não expõe mensagens internas do Stripe ao cliente
    console.error('[checkout]', err)
    return NextResponse.json(
      { error: 'Não foi possível iniciar o pagamento. Tente novamente.' },
      { status: 500 },
    )
  }
}
