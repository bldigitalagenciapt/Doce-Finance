"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ChefHat, BarChart3, BookOpen, ShoppingBag, FileText,
  CalendarDays, Calculator, CheckCircle2, Star,
  ArrowRight, ChevronDown, Mail, Sparkles
} from "lucide-react"

interface Props { isBrazil: boolean }

const PRICING = {
  BRL: { monthly: "14,90", yearly: "149,00", currency: "R$", saving: "25%", yearlySub: "12,42/mês" },
  EUR: { monthly: "6,90",  yearly: "69,99",  currency: "€",  saving: "15%", yearlySub: "5,83/mês" },
}

const FEATURES = [
  { icon: BookOpen,    title: "Receitas & Fichas Técnicas", desc: "Calcule o custo exato de cada receita por ingrediente, com margem de lucro configurável." },
  { icon: ShoppingBag, title: "Pedidos e Entregas",         desc: "Organize todos os pedidos com status, datas de entrega e valores em tempo real." },
  { icon: BarChart3,   title: "Dashboard Financeiro",       desc: "Visualize faturamento, pedidos do mês e clientes num painel limpo e intuitivo." },
  { icon: FileText,    title: "Orçamentos Profissionais",   desc: "Envie propostas com QR Code Pix, link de aceite e validade automática." },
  { icon: CalendarDays,title: "Agenda de Entregas",         desc: "Calendário visual com todas as entregas agendadas para não perder nenhum prazo." },
  { icon: Calculator,  title: "Calculadora de Custos",      desc: "Simule preços por porção e taxas de entrega para vender em aplicativos." },
]

const SCREENSHOTS = [
  { src: "/screenshots/dashboard.png",    label: "Dashboard",    desc: "Visão geral do seu atelier" },
  { src: "/screenshots/ingredientes.png", label: "Ingredientes", desc: "Custo por unidade automático" },
  { src: "/screenshots/receitas.png",     label: "Receitas",     desc: "Ficha técnica com precificação" },
  { src: "/screenshots/pedido-modal.png", label: "Pedidos",      desc: "Gestão de pedidos completa" },
  { src: "/screenshots/orcamentos.png",   label: "Orçamentos",   desc: "Propostas profissionais" },
  { src: "/screenshots/agenda.png",       label: "Agenda",       desc: "Calendário de entregas" },
  { src: "/screenshots/calculadora.png",  label: "Calculadora",  desc: "Simulador de custos" },
  { src: "/screenshots/clientes.png",     label: "Clientes",     desc: "Base de clientes e histórico" },
]

const FAQS = [
  { q: "Preciso de conhecimentos técnicos?",
    a: "Não. O Doce Finance foi criado especialmente para confeiteiros e artesãos. A interface é simples e intuitiva, e você começa a usar em minutos." },
  { q: "Funciona no celular?",
    a: "Sim! O sistema é 100% responsivo e funciona perfeitamente no smartphone, tablet e computador." },
  { q: "Posso cancelar quando quiser?",
    a: "Sim, sem multas ou burocracia. Você pode cancelar a assinatura a qualquer momento pelo painel de configurações." },
  { q: "Os meus dados ficam seguros?",
    a: "Sim. Utilizamos Supabase (infraestrutura da AWS) com criptografia de ponta a ponta. Os seus dados são exclusivamente seus." },
  { q: "A assinatura anual tem desconto?",
    a: "Sim! No plano anual você economiza até 25% em comparação ao plano mensal. É cobrado uma única vez por ano." },
]

export default function LandingPage({ isBrazil }: Props) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly")
  const [activeScreenshot, setActiveScreenshot] = useState(0)
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const currency = isBrazil ? "BRL" : "EUR"
  const p = PRICING[currency]

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, currency }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      window.location.href = "/login"
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#FAFAF8", color: "#1A1A1A" }}>
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .nav-link { color: #444; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #2D6A2F; }
        .btn-primary { background: #2D6A2F; color: #fff; border: none; border-radius: 10px; padding: 14px 28px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.15s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: #1E4D20; transform: translateY(-1px); }
        .btn-outline { background: transparent; color: #2D6A2F; border: 2px solid #2D6A2F; border-radius: 10px; padding: 12px 26px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-outline:hover { background: #2D6A2F; color: #fff; }
        .section { max-width: 1100px; margin: 0 auto; padding: 80px 24px; }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: #E8F5E9; color: #2D6A2F; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
        .screenshot-thumb { width: 80px; height: 52px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; opacity: 0.6; }
        .screenshot-thumb.active { border-color: #2D6A2F; opacity: 1; }
        .faq-item { border-bottom: 1px solid #E8E8E4; }
        .faq-btn { width: 100%; background: none; border: none; padding: 20px 0; text-align: left; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #1A1A1A; }
        .tag { display: inline-block; background: #E8F5E9; color: #2D6A2F; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .float { animation: float 4s ease-in-out infinite; }
        @media(max-width:768px){
          .hero-grid{flex-direction:column!important;}
          .feature-grid{grid-template-columns:1fr!important;}
          .price-grid{flex-direction:column!important;align-items:center!important;}
          .nav-links{display:none!important;}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2D6A2F", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChefHat size={20} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#1A1A1A" }}>Doce Finance</span>
          </div>
          <div className="nav-links" style={{ display: "flex", gap: 32 }}>
            <a href="#features" className="nav-link">Funcionalidades</a>
            <a href="#screenshots" className="nav-link">Visão da App</a>
            <a href="#pricing" className="nav-link">Preços</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "#444", textDecoration: "none" }}>Entrar</Link>
            <button className="btn-primary" style={{ padding: "8px 18px", fontSize: 14 }} onClick={() => handleCheckout(billing)}>
              Começar agora
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ background: "linear-gradient(160deg,#F0F7F0 0%,#FAFAF8 60%,#FFF8F0 100%)", padding: "80px 24px 60px" }}>
        <div className="hero-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 64 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="badge">
              <Sparkles size={14} />
              Gestão para confeiteiros
            </div>
            <h1 style={{ fontSize: "clamp(36px,5vw,56px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: "#111" }}>
              A gestão financeira<br />
              <span style={{ color: "#2D6A2F" }}>feita para o seu</span><br />
              atelier de doces
            </h1>
            <p style={{ fontSize: 18, color: "#555", lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
              Calcule custos de receitas, gerencie pedidos, envie orçamentos profissionais com Pix e controle tudo do seu negócio — num só lugar.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn-primary" style={{ fontSize: 17, padding: "16px 32px" }} onClick={() => handleCheckout(billing)} disabled={loading}>
                {loading ? "Aguarde..." : "Começar agora"} <ArrowRight size={18} />
              </button>
              <a href="#screenshots" className="btn-outline" style={{ textDecoration: "none" }}>
                Ver demonstração
              </a>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 40, flexWrap: "wrap" }}>
              {["Sem limite de receitas", "Cancele quando quiser", "Suporte em português"].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555" }}>
                  <CheckCircle2 size={15} color="#2D6A2F" />
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="float" style={{ flex: 1, minWidth: 0, maxWidth: 560 }}>
            <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.12)", overflow: "hidden", border: "1px solid #E8E8E4" }}>
              <div style={{ background: "#F0F0EE", padding: "12px 16px", display: "flex", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28CA41" }} />
              </div>
              <Image src="/screenshots/dashboard.png" alt="Dashboard Doce Finance" width={560} height={360} style={{ width: "100%", height: "auto", display: "block" }} priority />
            </div>
          </div>
        </div>
      </div>

      {/* ── SOCIAL PROOF ── */}
      <div style={{ background: "#fff", borderTop: "1px solid #EBEBEB", borderBottom: "1px solid #EBEBEB", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 40 }}>
          <p style={{ fontSize: 14, color: "#888", fontWeight: 500 }}>Usado por confeiteiras em 🇧🇷 Brasil e 🇵🇹 Portugal</p>
          {["⭐⭐⭐⭐⭐  «Mudou completamente como eu precifica»", "⭐⭐⭐⭐⭐  «Finalmente sei quanto lucro em cada bolo»", "⭐⭐⭐⭐⭐  «Os orçamentos ficam super profissionais»"].map((t, i) => (
            <p key={i} style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}>{t}</p>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div className="section" id="features">
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="badge" style={{ margin: "0 auto 16px" }}><BarChart3 size={14} /> Funcionalidades</div>
          <h2 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 800, color: "#111" }}>
            Tudo o que precisa para<br />gerir o seu negócio
          </h2>
          <p style={{ fontSize: 17, color: "#666", marginTop: 12, maxWidth: 520, margin: "12px auto 0" }}>
            Do custo do ingrediente ao orçamento final do cliente, o Doce Finance cobre todo o ciclo.
          </p>
        </div>
        <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ background: "#fff", border: "1px solid #E8E8E4", borderRadius: 16, padding: 28, transition: "box-shadow 0.2s, transform 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(45,106,47,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon size={22} color="#2D6A2F" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#111" }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCREENSHOTS ── */}
      <div style={{ background: "#111", padding: "80px 24px" }} id="screenshots">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="badge" style={{ background: "rgba(255,255,255,0.1)", color: "#7FBA7A" }}><Star size={14} /> App em detalhe</div>
            <h2 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 800, color: "#fff", marginTop: 8 }}>
              Veja como funciona na prática
            </h2>
            <p style={{ color: "#aaa", marginTop: 12, fontSize: 16 }}>Imagens reais do Doce Finance — sem filtros.</p>
          </div>

          {/* Main screenshot */}
          <div style={{ background: "#1A1A1A", borderRadius: 20, overflow: "hidden", border: "1px solid #333", marginBottom: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ background: "#222", padding: "12px 16px", display: "flex", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28CA41" }} />
              <span style={{ marginLeft: 12, fontSize: 12, color: "#666" }}>doce-finance.vercel.app/{SCREENSHOTS[activeScreenshot].label.toLowerCase()}</span>
            </div>
            <Image
              key={activeScreenshot}
              src={SCREENSHOTS[activeScreenshot].src}
              alt={SCREENSHOTS[activeScreenshot].label}
              width={1100} height={620}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          {/* Thumbs */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {SCREENSHOTS.map((s, i) => (
              <button key={i} onClick={() => setActiveScreenshot(i)}
                style={{ background: i === activeScreenshot ? "rgba(45,106,47,0.3)" : "rgba(255,255,255,0.05)", border: i === activeScreenshot ? "2px solid #2D6A2F" : "2px solid transparent", borderRadius: 10, padding: "8px 16px", color: i === activeScreenshot ? "#7FBA7A" : "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── PRICING ── */}
      <div className="section" id="pricing">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="badge" style={{ margin: "0 auto 16px" }}><Star size={14} /> Preços simples</div>
          <h2 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 800 }}>
            Invista no seu negócio
          </h2>
          <p style={{ color: "#666", marginTop: 12, fontSize: 16 }}>
            {isBrazil ? "Valores em Reais · para confeiteiras brasileiras" : "Valores em Euros · para confeiteiras europeias"}
          </p>

          {/* Toggle */}
          <div style={{ display: "inline-flex", background: "#F0F0EE", borderRadius: 50, padding: 4, marginTop: 24, gap: 4 }}>
            {(["monthly","yearly"] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)}
                style={{ background: billing === b ? "#2D6A2F" : "transparent", color: billing === b ? "#fff" : "#666", border: "none", borderRadius: 50, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
                {b === "monthly" ? "Mensal" : "Anual"}
                {b === "yearly" && <span style={{ background: billing === "yearly" ? "rgba(255,255,255,0.2)" : "#E8F5E9", color: billing === "yearly" ? "#fff" : "#2D6A2F", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>-{p.saving}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="price-grid" style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
          {/* Card único */}
          <div style={{ background: "#fff", border: "2px solid #2D6A2F", borderRadius: 24, padding: 40, maxWidth: 420, width: "100%", position: "relative", boxShadow: "0 16px 64px rgba(45,106,47,0.15)" }}>
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#2D6A2F", color: "#fff", borderRadius: 20, padding: "4px 18px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
              ✨ Acesso Completo
            </div>
            <div style={{ marginBottom: 24, marginTop: 8 }}>
              <p style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>Doce Finance</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#333" }}>{p.currency}</span>
                <span style={{ fontSize: 52, fontWeight: 900, color: "#111", lineHeight: 1 }}>
                  {billing === "monthly" ? p.monthly : p.yearly}
                </span>
              </div>
              <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
                {billing === "monthly" ? "por mês" : `por ano · equivale a ${p.currency} ${p.yearlySub}`}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {[
                "Dashboard financeiro completo",
                "Ingredientes e fichas técnicas ilimitadas",
                "Pedidos e gestão de entregas",
                "Orçamentos com QR Code Pix",
                "Agenda de entregas",
                "Calculadora de custos",
                "Gestão de clientes",
                "Suporte em português",
              ].map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <CheckCircle2 size={18} color="#2D6A2F" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: "#333" }}>{f}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 17, padding: "16px" }}
              onClick={() => handleCheckout(billing)} disabled={loading}>
              {loading ? "A processar..." : `Assinar ${billing === "monthly" ? "Mensal" : "Anual"}`}
              <ArrowRight size={18} />
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 14 }}>
              Sem compromisso · Cancele quando quiser
            </p>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div style={{ background: "#F5FAF5", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800 }}>O que dizem as confeiteiras</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            {[
              { name: "Ana Silva", city: "São Paulo 🇧🇷", text: "Antes eu usava planilha e perdia horas calculando. Agora o Doce Finance faz tudo em segundos. Meu lucro aumentou 30%!" },
              { name: "Carla Mendes", city: "Porto 🇵🇹", text: "Os orçamentos ficam super profissionais. Meus clientes adoram receber o link com o QR Code Pix. Recomendo muito!" },
              { name: "Fernanda Costa", city: "Belo Horizonte 🇧🇷", text: "Finalmente sei exatamente quanto lucro em cada bolo. A calculadora de custo por porção é incrível!" },
            ].map(({ name, city, text }) => (
              <div key={name} style={{ background: "#fff", borderRadius: 16, padding: 28, border: "1px solid #E0EFE0" }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} color="#F4A800" fill="#F4A800" />)}
                </div>
                <p style={{ fontSize: 15, color: "#444", lineHeight: 1.7, marginBottom: 20, fontStyle: "italic" }}>"{text}"</p>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{name}</p>
                  <p style={{ fontSize: 12, color: "#888" }}>{city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="section" id="faq" style={{ maxWidth: 720 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="badge" style={{ margin: "0 auto 16px" }}><ChevronDown size={14} /> Dúvidas frequentes</div>
          <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800 }}>Tem alguma dúvida?</h2>
        </div>
        <div>
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="faq-item">
              <button className="faq-btn" onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                {q}
                <ChevronDown size={20} color="#666" style={{ transform: activeFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
              </button>
              {activeFaq === i && (
                <p style={{ fontSize: 15, color: "#555", lineHeight: 1.7, paddingBottom: 20 }}>{a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <div style={{ background: "linear-gradient(135deg,#1E3A1F,#2D6A2F)", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <ChefHat size={48} color="rgba(255,255,255,0.3)" style={{ margin: "0 auto 24px" }} />
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#fff", marginBottom: 16 }}>
            Comece hoje mesmo
          </h2>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", marginBottom: 36, lineHeight: 1.6 }}>
            O seu atelier merece uma gestão profissional.<br />
            Junte-se às confeiteiras que já transformaram o negócio.
          </p>
          <button className="btn-primary" style={{ background: "#fff", color: "#2D6A2F", fontSize: 18, padding: "18px 40px", borderRadius: 14 }}
            onClick={() => handleCheckout(billing)} disabled={loading}>
            {loading ? "Aguarde..." : "Assinar agora"} <ArrowRight size={20} />
          </button>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 16 }}>
            {isBrazil ? `A partir de R$ ${p.monthly}/mês` : `A partir de € ${p.monthly}/mês`} · Sem compromisso
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: "#111", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2D6A2F", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChefHat size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>Doce Finance</span>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <Link href="/login" style={{ color: "#888", fontSize: 14, textDecoration: "none" }}>Entrar</Link>
            <a href="mailto:suporte@docefinance.app" style={{ color: "#888", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              <Mail size={14} /> Suporte
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener" style={{ color: "#888", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Instagram
            </a>
          </div>
          <p style={{ color: "#555", fontSize: 13 }}>© {new Date().getFullYear()} Doce Finance. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}
