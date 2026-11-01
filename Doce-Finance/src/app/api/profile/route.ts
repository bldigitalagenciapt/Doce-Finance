import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptField, decryptProfileFields } from '@/lib/crypto'
import type { Profile } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/profile
 * Retorna o perfil do usuário autenticado, descriptografando campos sensíveis (AES-256-GCM).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({
    profile: decryptProfileFields(data as Profile),
    email: user.email || '',
  })
}

/**
 * PUT /api/profile
 * Atualiza dados do perfil criptografando dados pessoais e financeiros sensíveis
 * (chave Pix, telefone MBWay, WhatsApp, e-mail de contato, endereço) com AES-256-GCM antes de salvar no banco.
 */
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const allowedUpdates: Record<string, unknown> = {}

  // Campos em texto claro (necessários para exibição/queries de layout/preferências)
  if ('business_name' in body) {
    allowedUpdates.business_name = body.business_name ? String(body.business_name).trim().slice(0, 120) : null
  }
  if ('full_name' in body) {
    allowedUpdates.full_name = body.full_name ? String(body.full_name).trim().slice(0, 120) : null
  }
  if ('brand_color' in body) {
    allowedUpdates.brand_color = body.brand_color ? String(body.brand_color).trim() : null
  }
  if ('logo_url' in body) {
    allowedUpdates.logo_url = body.logo_url ? String(body.logo_url).trim() : null
  }
  if ('business_hours' in body) {
    allowedUpdates.business_hours = body.business_hours ? String(body.business_hours).trim().slice(0, 200) : null
  }
  if ('default_margin_percent' in body) {
    allowedUpdates.default_margin_percent = Math.min(99, Math.max(0, Number(body.default_margin_percent) || 0))
  }
  if ('quote_validity_days' in body) {
    allowedUpdates.quote_validity_days = Math.min(365, Math.max(1, Number(body.quote_validity_days) || 7))
  }
  if ('currency' in body && (body.currency === 'BRL' || body.currency === 'EUR')) {
    allowedUpdates.currency = body.currency
  }
  if ('pix_key_type' in body) {
    allowedUpdates.pix_key_type = body.pix_key_type ? String(body.pix_key_type) : null
  }
  if ('payment_instructions' in body) {
    allowedUpdates.payment_instructions = body.payment_instructions
      ? String(body.payment_instructions).trim().slice(0, 1000)
      : null
  }

  // Campos sensíveis criptografados em repouso com AES-256-GCM
  if ('phone' in body) {
    allowedUpdates.phone = encryptField(body.phone ? String(body.phone) : null)
  }
  if ('email_contact' in body) {
    allowedUpdates.email_contact = encryptField(body.email_contact ? String(body.email_contact) : null)
  }
  if ('address' in body) {
    allowedUpdates.address = encryptField(body.address ? String(body.address) : null)
  }
  if ('pix_key' in body) {
    allowedUpdates.pix_key = encryptField(body.pix_key ? String(body.pix_key) : null)
  }
  if ('mbway_phone' in body) {
    allowedUpdates.mbway_phone = encryptField(body.mbway_phone ? String(body.mbway_phone) : null)
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(allowedUpdates)
    .eq('id', user.id)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[profile:put]', error)
    return NextResponse.json({ error: 'Erro ao atualizar dados do perfil.' }, { status: 500 })
  }

  return NextResponse.json({
    profile: decryptProfileFields(data as Profile),
  })
}

