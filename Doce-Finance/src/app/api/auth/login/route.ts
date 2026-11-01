import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientIp } from '@/lib/rateLimit'
import {
  checkLoginLockout,
  recordFailedLogin,
  clearLoginAttempts,
} from '@/lib/loginAttempts'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Preencha e-mail e senha.' }, { status: 400 })
  }

  const ip = getClientIp(req)

  // 1. Verifica se o usuário/IP está bloqueado por excesso de tentativas
  const lockout = await checkLoginLockout(email, ip)
  if (lockout.blocked) {
    const minutes = Math.ceil(lockout.retryAfterSeconds / 60)
    return NextResponse.json(
      {
        error: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${minutes} minuto(s).`,
        retryAfterSeconds: lockout.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(lockout.retryAfterSeconds) },
      },
    )
  }

  // 2. Autentica via Supabase Auth (compara o hash Bcrypt no banco e grava cookies seguros)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const attemptResult = await recordFailedLogin(email, ip)
    if (attemptResult.blocked) {
      const minutes = Math.ceil(attemptResult.retryAfterSeconds / 60)
      return NextResponse.json(
        {
          error: `Limite de 5 tentativas excedido. Acesso bloqueado por ${minutes} minutos por segurança.`,
          retryAfterSeconds: attemptResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(attemptResult.retryAfterSeconds) },
        },
      )
    }

    return NextResponse.json(
      {
        error: `E-mail ou senha incorretos. Restam ${attemptResult.remainingAttempts} tentativa(s) antes do bloqueio temporário.`,
        remainingAttempts: attemptResult.remainingAttempts,
      },
      { status: 401 },
    )
  }

  // 3. Sucesso: limpa o contador de falhas
  await clearLoginAttempts(email, ip)

  return NextResponse.json({ ok: true })
}

