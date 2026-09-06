import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/** Verifica se a validade (DATE) já passou. */
function isExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false
  const d = new Date(validUntil + 'T23:59:59')
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

/**
 * Resposta do cliente ao orçamento: 'aceite' ou 'recusado'.
 * - Só permite responder se o estado atual for 'enviado' ou 'visualizado'.
 * - Bloqueia se o orçamento expirou (validade < hoje).
 * - Em 'aceite', também define order_status='confirmado'.
 * Usa service role (ignora RLS). Degrada com segurança pré-migração.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const { token } = params
  if (!isUuid(token)) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 })
  }

  let body: { response?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const response = body.response
  if (response !== 'aceite' && response !== 'recusado') {
    return NextResponse.json({ ok: false, error: 'invalid_response' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, quote_state, quote_valid_until')
      .eq('id', token)
      .single()

    if (error) {
      // Provável ausência das colunas (pré-migração).
      return NextResponse.json(
        { ok: false, error: 'migration_required' },
        { status: 409 },
      )
    }
    if (!order) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    }

    const current = (order as { quote_state?: string }).quote_state
    if (current !== 'enviado' && current !== 'visualizado') {
      return NextResponse.json(
        { ok: false, error: 'not_respondable', state: current },
        { status: 409 },
      )
    }

    if (isExpired((order as { quote_valid_until?: string | null }).quote_valid_until)) {
      return NextResponse.json({ ok: false, error: 'expired' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const update: Record<string, unknown> = {
      quote_state: response,
      quote_responded_at: now,
    }
    // Aceite => o orçamento vira pedido confirmado.
    if (response === 'aceite') {
      update.status = 'confirmado'
    }

    const { error: upErr } = await supabase
      .from('orders')
      .update(update)
      .eq('id', token)
      .in('quote_state', ['enviado', 'visualizado'])

    if (upErr) {
      return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, state: response })
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
