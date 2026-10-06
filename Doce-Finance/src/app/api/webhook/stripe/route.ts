import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-08-26.dahlia' as any
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error(`⚠️ Erro na assinatura do Webhook.`, err.message)
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    // Acessa o Supabase com chave de admin (Service Role) para poder editar o perfil com segurança
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Idempotência: Verifica se o evento já foi processado
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .single()

    if (existingEvent) {
      console.log(`⚠️ Evento ${event.id} já processado. Ignorando...`)
      return NextResponse.json({ received: true })
    }

    // Registra o evento para não ser processado novamente
    await supabaseAdmin.from('stripe_events').insert({
      id: event.id,
      type: event.type
    })

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Pega o ID do usuário que enviamos na hora do checkout
      const userId = session.client_reference_id

      if (userId) {
        console.log(`✅ Pagamento confirmado para o usuário ${userId}. Atualizando status...`)
        
        // Atualiza o perfil do usuário para ativo
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'active',
            stripe_customer_id: session.customer as string
          })
          .eq('id', userId)

        if (error) {
          console.error('Erro ao atualizar Supabase:', error)
          return NextResponse.json({ error: 'Erro ao atualizar banco de dados' }, { status: 500 })
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      
      // Quando a assinatura for cancelada/deletada, voltar o status
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'canceled'
        })
        .eq('stripe_customer_id', subscription.customer as string)

      if (error) {
        console.error('Erro ao cancelar assinatura no Supabase:', error)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Erro geral no webhook:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
