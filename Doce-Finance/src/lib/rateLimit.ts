import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()
const MAX_STORE_SIZE = 5000

function cleanupExpired(now: number) {
  if (store.size < MAX_STORE_SIZE) return
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

/**
 * Extrai o IP real do cliente de forma segura a partir dos cabeçalhos de proxy (Vercel / Cloudflare).
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return '127.0.0.1'
}

export interface RateLimitConfig {
  /** Identificador do bucket (ex.: 'api:pdf', 'api:checkout') */
  namespace: string
  /** Número máximo de requisições permitidas na janela */
  limit: number
  /** Duração da janela em milissegundos */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Verifica e incrementa o contador de requisições para a chave (IP + namespace).
 */
export function checkRateLimit(ip: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  cleanupExpired(now)

  const key = `${config.namespace}:${ip}`
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - 1),
      resetAt,
    }
  }

  existing.count += 1
  const allowed = existing.count <= config.limit
  const remaining = Math.max(0, config.limit - existing.count)

  return {
    allowed,
    limit: config.limit,
    remaining,
    resetAt: existing.resetAt,
  }
}

/**
 * Retorna uma resposta HTTP 429 padronizada com cabeçalhos de Rate Limit.
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return NextResponse.json(
    {
      error: 'Muitas requisições em um curto período. Aguarde alguns segundos e tente novamente.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  )
}

