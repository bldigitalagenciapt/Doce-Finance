import Link from "next/link"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { CheckCircle2, ChefHat, Clock } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, syncSubscriptionToProfile } from "@/lib/stripe"

export const metadata = { title: "Pagamento confirmado — Doce Finance" }
export const dynamic = "force-dynamic"

/**
 * Confirma a sessão de checkout no servidor e sincroniza o perfil imediatamente,
 * para o usuário não cair no paywall caso o webhook ainda não tenha chegado.
 * O webhook continua sendo a fonte de verdade (operação idempotente).
 */
async function confirmCheckout(sessionId: string | undefined): Promise<"ok" | "pending"> {
  if (!sessionId || !sessionId.startsWith("cs_") || !process.env.STRIPE_SECRET_KEY) return "pending"

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return "pending"

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] })

    // A sessão precisa pertencer ao usuário logado
    if (session.client_reference_id !== user.id) return "pending"
    if (session.status !== "complete" || session.payment_status === "unpaid") return "pending"
    if (!session.subscription || typeof session.subscription === "string") return "pending"

    await syncSubscriptionToProfile(createAdminClient(), session.subscription, user.id)
    return "ok"
  } catch (err) {
    console.error("[sucesso] Falha ao confirmar checkout:", err)
    return "pending"
  }
}

export default async function SucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  const result = await confirmCheckout(session_id)
  const confirmed = result === "ok"

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#F0F7F0,#FAFAF8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "56px 48px", maxWidth: 520, width: "100%", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.1)", border: "1px solid #E0EFE0" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: confirmed ? "#E8F5E9" : "#FFF7E6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          {confirmed ? <CheckCircle2 size={36} color="#2D6A2F" /> : <Clock size={36} color="#B7791F" />}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111", marginBottom: 12 }}>
          {confirmed ? "Pagamento confirmado!" : "Estamos confirmando o seu pagamento"}
        </h1>
        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, marginBottom: 36 }}>
          {confirmed ? (
            <>Bem-vinda ao <strong>Doce Finance</strong>! A sua assinatura está ativa.</>
          ) : (
            <>Isso costuma levar poucos segundos. Se o acesso não for liberado em alguns minutos, fale com o nosso suporte.</>
          )}
        </p>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#2D6A2F", color: "#fff", borderRadius: 12, padding: "16px 32px", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
          <ChefHat size={20} /> Ir para o meu painel
        </Link>
        <p style={{ fontSize: 12, color: "#aaa", marginTop: 20 }}>
          Você receberá o recibo por e-mail.
        </p>
      </div>
    </div>
  )
}
