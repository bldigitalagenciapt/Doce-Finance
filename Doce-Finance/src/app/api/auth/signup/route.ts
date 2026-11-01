import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePasswordStrength } from '@/lib/loginAttempts'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { fullName?: string; email?: string; password?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const fullName = (body.fullName || '').trim()

  if (!email || !password) {
    return NextResponse.json({ error: 'Preencha e-mail e senha.' }, { status: 400 })
  }

  // Valida a força da senha antes de enviar para hash Bcrypt no banco
  const strength = validatePasswordStrength(password)
  if (!strength.valid) {
    return NextResponse.json({ error: strength.error }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Não foi possível criar a conta.' },
      { status: 400 },
    )
  }

  return NextResponse.json({
    ok: true,
    hasSession: Boolean(data?.session),
  })
}

