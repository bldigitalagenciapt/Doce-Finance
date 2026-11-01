import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Controle de Tentativas de Login (Anti Brute-Force) e Política de Senhas.
 * - Máximo de 5 tentativas falhas por conta (e-mail) ou IP dentro de uma janela de 15 minutos.
 * - Bloqueio temporário automático de 15 minutos ao atingir o limite.
 * - Registra tanto em memória quanto na tabela `public.auth_login_attempts` (via service_role).
 */

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000 // 15 minutos

interface AttemptRecord {
  failedCount: number
  firstFailedAt: number
  lockedUntil: number | null
}

const memoryAttempts = new Map<string, AttemptRecord>()

function hashIdentifier(email: string, ip: string): string {
  const normalized = `${email.trim().toLowerCase()}|${ip.trim()}`
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

export interface LoginAttemptStatus {
  blocked: boolean
  remainingAttempts: number
  retryAfterSeconds: number
}

/**
 * Verifica se o par (e-mail, IP) está bloqueado por excesso de tentativas.
 */
export async function checkLoginLockout(email: string, ip: string): Promise<LoginAttemptStatus> {
  const now = Date.now()
  const key = hashIdentifier(email, ip)
  const mem = memoryAttempts.get(key)

  if (mem) {
    if (mem.lockedUntil && mem.lockedUntil > now) {
      return {
        blocked: true,
        remainingAttempts: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((mem.lockedUntil - now) / 1000)),
      }
    }
    if (now - mem.firstFailedAt > LOCKOUT_WINDOW_MS) {
      memoryAttempts.delete(key)
    }
  }

  // Consulta complementar no banco (se a tabela auth_login_attempts já tiver sido criada pela migration)
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('auth_login_attempts')
      .select('failed_count, first_failed_at, locked_until')
      .eq('identifier_hash', key)
      .maybeSingle()

    if (data) {
      const lockedUntilTs = data.locked_until ? new Date(data.locked_until).getTime() : null
      if (lockedUntilTs && lockedUntilTs > now) {
        memoryAttempts.set(key, {
          failedCount: data.failed_count,
          firstFailedAt: new Date(data.first_failed_at).getTime(),
          lockedUntil: lockedUntilTs,
        })
        return {
          blocked: true,
          remainingAttempts: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((lockedUntilTs - now) / 1000)),
        }
      }
    }
  } catch {
    // Fallback silencioso para memória caso a migration ainda não tenha sido rodada
  }

  const activeMem = memoryAttempts.get(key)
  const used = activeMem ? activeMem.failedCount : 0
  return {
    blocked: false,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - used),
    retryAfterSeconds: 0,
  }
}

/**
 * Registra uma falha de login e retorna o novo status (incluindo se acabou de ser bloqueado).
 */
export async function recordFailedLogin(email: string, ip: string): Promise<LoginAttemptStatus> {
  const now = Date.now()
  const key = hashIdentifier(email, ip)
  const existing = memoryAttempts.get(key)

  let failedCount = 1
  let firstFailedAt = now
  let lockedUntil: number | null = null

  if (existing && now - existing.firstFailedAt <= LOCKOUT_WINDOW_MS) {
    failedCount = existing.failedCount + 1
    firstFailedAt = existing.firstFailedAt
  }

  if (failedCount >= MAX_LOGIN_ATTEMPTS) {
    lockedUntil = now + LOCKOUT_WINDOW_MS
  }

  memoryAttempts.set(key, { failedCount, firstFailedAt, lockedUntil })

  // Persiste no banco de dados (se a tabela existir)
  try {
    const admin = createAdminClient()
    await admin.from('auth_login_attempts').upsert(
      {
        identifier_hash: key,
        email_hint: email.trim().toLowerCase().slice(0, 3) + '***',
        ip_address: ip,
        failed_count: failedCount,
        first_failed_at: new Date(firstFailedAt).toISOString(),
        last_failed_at: new Date(now).toISOString(),
        locked_until: lockedUntil ? new Date(lockedUntil).toISOString() : null,
      },
      { onConflict: 'identifier_hash' },
    )
  } catch {
    // Ignora se a tabela ainda não existir no banco
  }

  return {
    blocked: Boolean(lockedUntil && lockedUntil > now),
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - failedCount),
    retryAfterSeconds: lockedUntil ? Math.max(1, Math.ceil((lockedUntil - now) / 1000)) : 0,
  }
}

/**
 * Limpa o histórico de falhas após um login bem-sucedido.
 */
export async function clearLoginAttempts(email: string, ip: string): Promise<void> {
  const key = hashIdentifier(email, ip)
  memoryAttempts.delete(key)

  try {
    const admin = createAdminClient()
    await admin.from('auth_login_attempts').delete().eq('identifier_hash', key)
  } catch {
    // Ignora se a tabela ainda não existir
  }
}

const WEAK_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'senha123',
  'admin123',
  'qwerty123',
  'docefinance',
])

/**
 * Valida a política de segurança de senha antes de criar ou atualizar no banco.
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'A senha deve ter no mínimo 8 caracteres.' }
  }
  if (password.length > 128) {
    return { valid: false, error: 'A senha deve ter no máximo 128 caracteres.' }
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'A senha deve conter pelo menos letras e números.' }
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'Esta senha é muito comum e insegura. Escolha outra.' }
  }
  return { valid: true }
}

