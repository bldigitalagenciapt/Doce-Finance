import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
  type RateLimitConfig,
} from '@/lib/rateLimit'

function getApiRateLimitConfig(pathname: string): RateLimitConfig | null {
  // Webhook do Stripe já possui validação criptográfica de assinatura (HMAC) e idempotência
  if (pathname.startsWith('/api/webhook/stripe')) {
    return null
  }

  // Geração de PDF público consome mais CPU/memória: 15 req / minuto por IP
  if (pathname.startsWith('/api/orcamento/') && pathname.endsWith('/pdf')) {
    return { namespace: 'api:orcamento:pdf', limit: 15, windowMs: 60_000 }
  }

  // Ações públicas de orçamento (visualizar / aceitar / recusar): 20 req / minuto por IP
  if (pathname.startsWith('/api/orcamento/')) {
    return { namespace: 'api:orcamento:action', limit: 20, windowMs: 60_000 }
  }

  // Rotas de login / criação de conta / troca de senha: 10 req / minuto por IP
  if (pathname.startsWith('/api/auth/')) {
    return { namespace: 'api:auth', limit: 10, windowMs: 60_000 }
  }

  // Rotas sensíveis de pagamento e onboarding: 10 req / minuto por IP
  if (
    pathname.startsWith('/api/checkout') ||
    pathname.startsWith('/api/stripe/') ||
    pathname.startsWith('/api/onboarding/')
  ) {
    return { namespace: 'api:billing', limit: 10, windowMs: 60_000 }
  }

  // Demais rotas de API ou autenticação: 30 req / minuto por IP
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
    return { namespace: 'api:general', limit: 30, windowMs: 60_000 }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const rateLimitConfig = getApiRateLimitConfig(request.nextUrl.pathname)
  if (rateLimitConfig) {
    const ip = getClientIp(request)
    const result = checkRateLimit(ip, rateLimitConfig)
    if (!result.allowed) {
      return rateLimitExceededResponse(result)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas exceto:
     * - _next/static, _next/image, favicon
     * - arquivos de imagem
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|$).*)',
  ],
}
