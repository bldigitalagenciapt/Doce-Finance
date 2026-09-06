import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Marca o orçamento como 'visualizado' quando o cliente abre a página pública,
 * apenas se o estado atual for 'enviado' (nunca rebaixa aceite/recusado nem
 * marca visualizado a partir de rascunho). Usa service role (ignora RLS).
 * Degrada com segurança se as colunas ainda não existirem (pré-migração).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const { token } = params
  if (!isUuid(token)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, quote_state')
      .eq('id', token)
      .single()

    // Coluna ausente (pré-migração) ou orçamento inexistente: no-op.
    if (error || !order) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    if ((order as { quote_state?: string }).quote_state === 'enviado') {
      const { error: upErr } = await supabase
        .from('orders')
        .update({ quote_state: 'visualizado', quote_viewed_at: new Date().toISOString() })
        .eq('id', token)
        .eq('quote_state', 'enviado')
      if (upErr) return NextResponse.json({ ok: true, skipped: true })
      return NextResponse.json({ ok: true, updated: true })
    }

    return NextResponse.json({ ok: true, updated: false })
  } catch {
    // Nunca quebrar a experiência do cliente por causa do rastreio.
    return NextResponse.json({ ok: true, skipped: true })
  }
}
