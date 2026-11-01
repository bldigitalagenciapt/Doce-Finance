import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePasswordStrength } from '@/lib/loginAttempts'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let body: { password?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const nextPassword = body.password || ''
  const strength = validatePasswordStrength(nextPassword)
  if (!strength.valid) {
    return NextResponse.json({ error: strength.error }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ password: nextPassword })
  if (error) {
    return NextResponse.json(
      { error: 'Não foi possível atualizar a senha. Tente uma senha diferente.' },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true })
}

