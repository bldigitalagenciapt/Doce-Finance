import Link from "next/link"
import { CheckCircle2, ChefHat } from "lucide-react"

export const metadata = { title: "Pagamento confirmado — Doce Finance" }

export default function SucessoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#F0F7F0,#FAFAF8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "56px 48px", maxWidth: 520, width: "100%", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.1)", border: "1px solid #E0EFE0" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <CheckCircle2 size={36} color="#2D6A2F" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111", marginBottom: 12 }}>Pagamento confirmado!</h1>
        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, marginBottom: 36 }}>
          Bem-vinda ao <strong>Doce Finance</strong>! A sua assinatura está ativa.<br />
          Crie agora a sua conta para começar a usar.
        </p>
        <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#2D6A2F", color: "#fff", borderRadius: 12, padding: "16px 32px", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
          <ChefHat size={20} /> Criar minha conta
        </Link>
        <p style={{ fontSize: 12, color: "#aaa", marginTop: 20 }}>
          Receberá um e-mail de confirmação do Stripe em breve.
        </p>
      </div>
    </div>
  )
}
