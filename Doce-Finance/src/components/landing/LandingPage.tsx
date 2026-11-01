'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChefHat,
  BarChart3,
  BookOpen,
  ShoppingBag,
  FileText,
  CalendarDays,
  Calculator,
  CheckCircle2,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Sparkles,
  Scale,
  XCircle,
  ShieldCheck,
  Smartphone,
  Clock,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react'

interface Props {
  isBrazil: boolean
}

const PRICING = {
  BRL: {
    monthly: '14,90',
    yearly: '149,90',
    yearlySub: '~12,49 / mês',
    currency: 'R$',
    saving: '17%',
    regionSubtitle: 'Valores em Reais · tabela exclusiva para o Brasil',
    paymentMethod: 'Pix',
    heroExampleCost: 'R$ 35,00',
    heroExampleSale: 'R$ 85,00',
  },
  EUR: {
    monthly: '6,90',
    yearly: '69,90',
    yearlySub: '~5,82 / mês',
    currency: '€',
    saving: '17%',
    regionSubtitle: 'Valores em Euros · tabela exclusiva para a Europa',
    paymentMethod: 'MBWay',
    heroExampleCost: '€ 12,00',
    heroExampleSale: '€ 30,00',
  },
}

const FEATURES = [
  {
    icon: BookOpen,
    tag: 'Precificação Exata',
    title: 'Receitas & Fichas Técnicas',
    desc: 'Descubra o custo real de cada bolo, brigadeiro ou encomenda ao centavo. Quando o preço de um insumo sobe, todas as receitas atualizam sozinhas.',
  },
  {
    icon: FileText,
    tag: 'Mais Vendas',
    title: 'Orçamentos em PDF & Link com Pix',
    desc: 'Envie um link profissional com a sua logo e cor da marca. O seu cliente aprova online com 1 clique e já paga o sinal via QR Code Pix ou MBWay.',
  },
  {
    icon: Scale,
    tag: 'Exclusivo',
    title: 'Conversor Xícaras ➔ Balança',
    desc: 'Sua receita está em xícaras ou colheres? Converta instantaneamente medidas caseiras para gramas (g) ou mililitros (ml) com precisão culinária.',
  },
  {
    icon: ShoppingBag,
    tag: 'Organização',
    title: 'Pedidos & Controle de Sinal',
    desc: 'Acompanhe o status desde o orçamento até a entrega: saiba exatamente quanto o cliente já pagou de entrada e quanto falta receber.',
  },
  {
    icon: CalendarDays,
    tag: 'Zero Atrasos',
    title: 'Agenda Visual de Entregas',
    desc: 'Visualize a sua semana e o seu mês num calendário claro. Nunca mais aceite duas encomendas grandes para o mesmo horário por engano.',
  },
  {
    icon: Calculator,
    tag: 'Lucro Garantido',
    title: 'Calculadora de Custos & Fatias',
    desc: 'Simule preços de venda por unidade, fatia ou cento, incluindo custos extras de embalagem, gás, energia e margem de lucro desejada.',
  },
]

const SCREENSHOTS = [
  {
    src: '/screenshots/dashboard.png',
    label: 'Dashboard',
    desc: 'Visão geral do seu atelier: faturamento, encomendas da semana e indicadores de lucro.',
  },
  {
    src: '/screenshots/receitas.png',
    label: 'Fichas Técnicas',
    desc: 'Monte receitas por etapas (Massa, Recheio, Cobertura) com cálculo automático de custo e lucro.',
  },
  {
    src: '/screenshots/orcamentos.png',
    label: 'Orçamentos Online',
    desc: 'Página exclusiva que o seu cliente recebe no WhatsApp com botão de aprovar, PDF e QR Code Pix.',
  },
  {
    src: '/screenshots/ingredientes.png',
    label: 'Ingredientes',
    desc: 'Cadastre o preço da embalagem fechada e o sistema calcula sozinho o custo por grama ou ml.',
  },
  {
    src: '/screenshots/pedido-modal.png',
    label: 'Pedidos',
    desc: 'Gestão completa de encomendas, taxa de entrega, descontos, valor pago e saldo restante.',
  },
  {
    src: '/screenshots/agenda.png',
    label: 'Agenda',
    desc: 'Calendário inteligente com todas as entregas organizadas por data e horário.',
  },
  {
    src: '/screenshots/calculadora.png',
    label: 'Calculadora',
    desc: 'Simulador rápido para testar margens de lucro e preços de novos produtos em segundos.',
  },
  {
    src: '/screenshots/clientes.png',
    label: 'Clientes VIP',
    desc: 'Histórico completo de cada cliente: telefone, endereço, total gasto e quantidade de pedidos.',
  },
]

const PAIN_POINTS = [
  'Passar horas tentando montar planilhas que quebram as fórmulas no celular',
  'Cobrar o mesmo preço do concorrente e descobrir no fim do mês que pagou para trabalhar',
  'Esquecer de somar embalagem, fita, gás, energia e taxa de entrega no custo final',
  'Demorar horas para responder um orçamento no WhatsApp e perder o cliente',
  'Medir ingredientes no "olhômetro" em xícaras e ter um custo diferente a cada fornada',
]

const GAINS = [
  'Custo exato por grama/ml atualizado automaticamente em todas as suas receitas',
  'Conversor integrado de xícaras e colheres para gramas direto na ficha técnica',
  'Orçamento personalizado com sua logo, QR Code Pix/MBWay e aprovação em 1 clique',
  'Controle claro de sinal pago (50%) e valor restante na entrega de cada pedido',
  'Acesso rápido pelo celular, tablet ou computador — de qualquer lugar da cozinha',
]

const STEPS = [
  {
    num: '01',
    title: 'Cadastre seus ingredientes',
    desc: 'Já entregamos uma lista inicial pronta! Basta informar quanto pagou na embalagem (ex.: 1kg de farinha ou 395g de leite condensado).',
  },
  {
    num: '02',
    title: 'Monte sua Ficha Técnica',
    desc: 'Adicione as quantidades da receita (ou use o nosso conversor de xícaras para gramas) e escolha sua margem de lucro ideal.',
  },
  {
    num: '03',
    title: 'Envie Orçamentos e Lucre',
    desc: 'Gere o link ou PDF do orçamento com sua cor, sua logo e QR Code Pix/MBWay. Quando o cliente aceita, já vira pedido confirmado!',
  },
]

const FAQS = [
  {
    q: 'Como funciona o teste grátis de 15 dias?',
    a: 'Ao criar sua conta, você tem acesso imediato a todas as funcionalidades do Doce Finance por 15 dias gratuitamente, sem precisar cadastrar cartão de crédito agora.',
  },
  {
    q: 'Preciso de conhecimentos técnicos ou saber usar Excel?',
    a: 'De jeito nenhum! O Doce Finance foi desenhado especificamente para confeiteiras. Você só digita o nome do ingrediente, o peso da embalagem e o valor pago — o sistema faz todas as contas sozinho.',
  },
  {
    q: 'Minhas receitas estão em xícaras e colheres. Consigo usar?',
    a: 'Sim! Temos um Conversor Culinário exclusivo integrado dentro das receitas: você escolhe o ingrediente (ex.: farinha, açúcar, cacau), informa quantas xícaras ou colheres usa e ele converte para gramas ou ml na hora.',
  },
  {
    q: 'Como funciona o orçamento com QR Code Pix e MBWay?',
    a: 'Nas configurações você informa sua chave Pix (Brasil) ou número MBWay (Portugal), além da logo e cor do seu atelier. Todo orçamento gerado cria um link lindo e um PDF com QR Code pronto para o cliente pagar e aprovar online.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim! O sistema é 100% responsivo e funciona direto no navegador do seu celular (Android ou iPhone), tablet e computador, sem ocupar memória do aparelho.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, com apenas 1 clique direto na tela de Configurações, sem multas, sem fidelidade e sem precisar ligar para ninguém.',
  },
  {
    q: 'Os meus dados e as minhas receitas secretas ficam seguros?',
    a: 'Totalmente. Utilizamos criptografia avançada (AES-256-GCM e Bcrypt) e isolamento por usuário no banco de dados. Suas receitas e dados de clientes são 100% privados e você ainda pode exportar backup em Excel (.xlsx) quando quiser.',
  },
]

export default function LandingPage({ isBrazil }: Props) {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [currency, setCurrency] = useState<'EUR' | 'BRL'>(isBrazil ? 'BRL' : 'EUR')
  const [activeScreenshot, setActiveScreenshot] = useState(0)
  const [activeFaq, setActiveFaq] = useState<number | null>(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.language.includes('pt-BR')) {
      setCurrency('BRL')
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) router.replace('/dashboard')
      } catch {
        // Mostra landing page normalmente
      }
    }
    checkAuth()
  }, [router])

  const p = PRICING[currency]

  const prevScreenshot = () =>
    setActiveScreenshot((prev) => (prev === 0 ? SCREENSHOTS.length - 1 : prev - 1))
  const nextScreenshot = () =>
    setActiveScreenshot((prev) => (prev === SCREENSHOTS.length - 1 ? 0 : prev + 1))

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-gray-900 font-sans selection:bg-teal-700 selection:text-white">
      {/* ── BARRA DE DESTAQUE TOPO ── */}
      <div className="bg-teal-900 px-4 py-2 text-center text-xs font-medium text-teal-50">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>
            <strong>Novo:</strong> Conversor de Xícaras para Balança + Orçamentos em PDF com QR Code Pix!{' '}
          </span>
          <Link
            href="/login?mode=signup"
            className="ml-1 underline decoration-emerald-400 underline-offset-2 font-bold text-white hover:text-emerald-300"
          >
            Teste 15 dias grátis ➔
          </Link>
        </span>
      </div>

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900">
              Doce Finance
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#comparativo" className="hover:text-teal-700 transition-colors">
              Por que usar
            </a>
            <a href="#features" className="hover:text-teal-700 transition-colors">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="hover:text-teal-700 transition-colors">
              Como funciona
            </a>
            <a href="#screenshots" className="hover:text-teal-700 transition-colors">
              Por dentro do App
            </a>
            <a href="#pricing" className="hover:text-teal-700 transition-colors">
              Planos
            </a>
            <a href="#faq" className="hover:text-teal-700 transition-colors">
              Dúvidas
            </a>
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-teal-700 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800 transition-all hover:-translate-y-0.5"
            >
              <span>Testar grátis</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Botão Menu Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Menu Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-5 shadow-lg md:hidden">
            <div className="flex flex-col space-y-3 text-sm font-medium text-gray-700">
              <a href="#comparativo" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Por que usar
              </a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Funcionalidades
              </a>
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Como funciona
              </a>
              <a href="#screenshots" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Por dentro do App
              </a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Planos e Preços
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Dúvidas Frequentes
              </a>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
                >
                  Entrar
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="flex items-center justify-center rounded-xl bg-teal-700 py-2.5 text-sm font-bold text-white"
                >
                  Testar 15 dias grátis
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-[#FAFAF8] to-[#FAFAF8] pt-12 pb-20 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Copy Principal */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3.5 py-1.5 text-xs font-bold text-teal-800 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Sistema nº 1 de Precificação e Gestão para Confeiteiras</span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl lg:text-[52px] leading-[1.1]">
                Pare de chutar preços e{' '}
                <span className="bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                  veja o lucro real
                </span>{' '}
                de cada encomenda.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                Monte fichas técnicas em minutos, converta receitas de xícaras para gramas, envie{' '}
                <strong className="font-semibold text-gray-900">
                  orçamentos profissionais com QR Code Pix
                </strong>{' '}
                e organize toda a sua agenda de entregas num só lugar.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3.5">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-7 py-4 text-base font-bold text-white shadow-lg shadow-teal-700/20 hover:bg-teal-800 transition-all hover:-translate-y-0.5"
                >
                  <span>Começar 15 dias grátis</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#screenshots"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 hover:border-teal-600 hover:text-teal-700 transition-all"
                >
                  Ver o sistema por dentro
                </a>
              </div>

              {/* Microcopy de confiança */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  15 dias grátis para testar tudo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Funciona no celular e computador
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Cancele com 1 clique
                </span>
              </div>
            </div>

            {/* Mockup Visual com Badges Flutuantes */}
            <div className="relative lg:col-span-6">
              <div className="relative rounded-2xl border border-gray-200/80 bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between bg-gray-100 px-4 py-2.5 border-b border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-400">
                    doce-finance.vercel.app/dashboard
                  </span>
                  <div className="w-10" />
                </div>
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Painel de controle Doce Finance"
                  width={640}
                  height={420}
                  className="w-full h-auto block"
                  priority
                />
              </div>

              {/* Card Flutuante 1: Lucro Calculado */}
              <div className="hidden sm:flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/95 backdrop-blur-md p-3.5 shadow-xl absolute -bottom-5 -left-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Bolo de Brigadeiro
                  </p>
                  <p className="text-sm font-extrabold text-gray-900">
                    Custo: {p.heroExampleCost} ➔ Venda: {p.heroExampleSale}
                  </p>
                </div>
              </div>

              {/* Card Flutuante 2: Orçamento Aprovado */}
              <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-teal-200 bg-white/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl absolute -top-4 -right-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-gray-800">
                  Orçamento #104 aprovado pelo cliente!
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROVA SOCIAL & NÚMEROS ── */}
      <section className="border-y border-gray-200/80 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs font-medium text-gray-500">
                Aprovado por confeiteiras no 🇧🇷 Brasil e 🇵🇹 Portugal
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-teal-700">100% Exato</p>
              <p className="text-xs font-medium text-gray-500">
                Custo calculado por grama, ml ou unidade
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-teal-700">&lt; 1 minuto</p>
              <p className="text-xs font-medium text-gray-500">
                Para gerar um orçamento em PDF com QR Code Pix
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-teal-700">15 Dias Grátis</p>
              <p className="text-xs font-medium text-gray-500">
                Para testar todas as ferramentas sem compromisso
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO DOR VS SOLUÇÃO (ANTES E DEPOIS) ── */}
      <section id="comparativo" className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-800 border border-teal-200/60">
              Chega de trabalhar no escuro
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Por que tantas confeiteiras trabalham muito e não veem a cor do dinheiro?
            </h2>
            <p className="mt-3 text-base text-gray-600">
              A diferença entre um atelier que apenas sobrevive e um atelier lucrativo está no
              controle dos custos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Sem Doce Finance */}
            <div className="rounded-2xl border border-red-200/80 bg-red-50/30 p-7 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-800 mb-5">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>Sem o Doce Finance (Caderninho / Planilhas)</span>
              </div>
              <ul className="space-y-4">
                {PAIN_POINTS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                    <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Com Doce Finance */}
            <div className="rounded-2xl border-2 border-teal-600 bg-white p-7 sm:p-8 shadow-xl shadow-teal-900/5">
              <div className="inline-flex items-center gap-2 rounded-lg bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900 mb-5">
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
                <span>Com o Doce Finance no seu Atelier</span>
              </div>
              <ul className="space-y-4">
                {GAINS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm font-medium text-gray-900"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES (GRID 3x2 SIMÉTRICO) ── */}
      <section id="features" className="bg-white py-20 px-4 sm:px-6 border-y border-gray-200/60">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-800 border border-teal-200/60">
              <BarChart3 className="h-3.5 w-3.5" />
              Tudo em um só lugar
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Ferramentas criadas para a rotina real da sua cozinha
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Do cálculo do grama do chocolate até o comprovante do Pix do cliente.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, tag, title, desc }) => (
              <div
                key={title}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-[#FAFAF8] p-7 transition-all hover:-translate-y-1 hover:border-teal-600/50 hover:bg-white hover:shadow-xl hover:shadow-teal-900/5"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200/60">
                      {tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA EM 3 PASSOS ── */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-800 border border-teal-200/60">
              <Clock className="h-3.5 w-3.5" />
              Simples e rápido
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Comece a organizar seu atelier em 3 passos
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="relative rounded-2xl border border-gray-200 bg-white p-7 shadow-sm"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-sm font-black text-white mb-4">
                  {s.num}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOWCASE INTERATIVO DE TELAS (COM ORÇAMENTOS E DESCRIÇÕES) ── */}
      <section id="screenshots" className="bg-gray-950 py-20 px-4 sm:px-6 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-emerald-400">
              <Smartphone className="h-3.5 w-3.5" />
              Tour pelo sistema
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Veja cada tela do Doce Finance na prática
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-400">
              Clique nas abas abaixo para explorar todas as áreas do sistema.
            </p>
          </div>

          {/* Botões seletores de tela */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {SCREENSHOTS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setActiveScreenshot(i)}
                className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  i === activeScreenshot
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Descrição da tela selecionada */}
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 max-w-3xl mx-auto">
            <button
              type="button"
              onClick={prevScreenshot}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Tela anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {SCREENSHOTS[activeScreenshot].label}
              </span>
              <p className="text-xs sm:text-sm text-gray-200 mt-0.5">
                {SCREENSHOTS[activeScreenshot].desc}
              </p>
            </div>
            <button
              type="button"
              onClick={nextScreenshot}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Próxima tela"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Moldura do navegador */}
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-gray-900 shadow-2xl">
            <div className="flex items-center gap-2 bg-gray-800/90 px-4 py-3 border-b border-white/10">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
              <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
              <span className="ml-3 rounded-md bg-gray-900/80 px-3 py-1 text-xs text-gray-400">
                doce-finance.vercel.app/{SCREENSHOTS[activeScreenshot].label.toLowerCase()}
              </span>
            </div>
            <Image
              key={activeScreenshot}
              src={SCREENSHOTS[activeScreenshot].src}
              alt={SCREENSHOTS[activeScreenshot].label}
              width={1100}
              height={620}
              className="w-full h-auto block"
            />
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="bg-emerald-50/40 py-20 px-4 sm:px-6 border-b border-gray-200/60">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-800 border border-teal-200/60">
              Quem usa, recomenda
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              O que dizem as confeiteiras
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                text: 'Mudou completamente como eu precifico os meus doces. Antes eu tinha medo de cobrar o justo, hoje sei exatamente o meu lucro em cada receita!',
                name: 'Mariana Souza',
                role: 'Confeiteira Artesanal · SP',
                avatar: '/testimonials/mariana.jpg',
              },
              {
                text: 'O conversor de xícaras para gramas e a ficha técnica por etapas me poupam horas toda semana. O meu negócio cresceu imenso.',
                name: 'Inês Carvalho',
                role: 'Cake Designer · Lisboa',
                avatar: '/testimonials/ines.jpg',
              },
              {
                text: 'Os orçamentos com a minha logo e o QR Code Pix já pronto deixam as clientes encantadas. Elas aprovam pelo celular na mesma hora!',
                name: 'Beatriz Lima',
                role: 'Atelier de Doces · RJ',
                avatar: '/testimonials/beatriz.jpg',
              },
            ].map((t) => (
              <div
                key={t.name}
                className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-white p-7 shadow-sm"
              >
                <div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 italic leading-relaxed mb-6">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <Image
                    src={t.avatar}
                    alt={t.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover border-2 border-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs font-semibold text-teal-700">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREÇOS E PLANOS ── */}
      <section id="pricing" className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-800 border border-teal-200/60">
              <Star className="h-3.5 w-3.5" />
              Preços simples e transparentes
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Invista no crescimento do seu atelier
            </h2>
            <p className="mt-2 text-base text-gray-600">{p.regionSubtitle}</p>

            {/* Toggle Mensal / Anual */}
            <div className="mt-8 inline-flex items-center rounded-full bg-gray-200/80 p-1.5 relative">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`relative z-10 rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
                  billing === 'monthly'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className={`relative z-10 rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
                  billing === 'yearly'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Anual
                <span className="absolute -top-3 -right-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm border-2 border-white whitespace-nowrap">
                  Economize {p.saving}
                </span>
              </button>
            </div>
          </div>

          {/* Card Principal com valores regionais exatos (BRL: 14,90 / 149,90 | EUR: 6,90 / 69,90) */}
          <div className="mx-auto max-w-md">
            <div className="relative rounded-3xl border-2 border-teal-700 bg-white p-8 sm:p-10 shadow-2xl shadow-teal-900/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-700 px-5 py-1 text-xs font-extrabold text-white shadow-sm whitespace-nowrap">
                ✨ Acesso Completo · 15 Dias Grátis
              </div>

              <div className="mt-2 mb-6">
                <p className="text-sm font-medium text-gray-500">
                  Doce Finance · Plano {billing === 'monthly' ? 'Mensal' : 'Anual'}
                </p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-gray-800">{p.currency}</span>
                  <span className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tight leading-none">
                    {billing === 'monthly' ? p.monthly : p.yearly}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {billing === 'monthly'
                    ? 'por mês · cancele quando quiser'
                    : `por ano · equivale a ${p.currency} ${p.yearlySub}`}
                </p>
              </div>

              <hr className="my-6 border-gray-100" />

              <ul className="space-y-3.5 text-sm font-medium text-gray-700 mb-8">
                {[
                  'Dashboard financeiro completo',
                  'Ingredientes e fichas técnicas ilimitadas',
                  'Conversor culinário (Xícaras e Colheres ➔ Gramas/ML)',
                  'Pedidos, controle de sinais e gestão de entregas',
                  `Orçamentos em PDF e link com QR Code (${p.paymentMethod})`,
                  'Agenda visual de entregas',
                  'Calculadora rápida de custos e margem',
                  'Gestão de clientes e backup em Excel (.xlsx)',
                  'Suporte em português',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login?mode=signup"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-4 text-base font-bold text-white shadow-lg shadow-teal-700/25 hover:bg-teal-800 transition-all hover:-translate-y-0.5"
              >
                <span>Começar 15 dias grátis ({billing === 'monthly' ? 'Mensal' : 'Anual'})</span>
                <ArrowRight className="h-5 w-5" />
              </Link>

              <p className="mt-4 text-center text-xs text-gray-400">
                Pagamento seguro via Stripe · Cancele quando quiser com 1 clique
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              Pagamento 100% seguro processado pela Stripe
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal-700" />
              Sem fidelidade · Cancelamento facilitado nas configurações
            </span>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-white py-20 px-4 sm:px-6 border-t border-gray-200/60">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-800 border border-teal-200/60">
              Tire suas dúvidas
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900">Perguntas Frequentes</h2>
          </div>

          <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-[#FAFAF8] px-6">
            {FAQS.map(({ q, a }, i) => {
              const isOpen = activeFaq === i
              return (
                <div key={q} className="py-5">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 text-left text-base font-bold text-gray-900 hover:text-teal-700 transition-colors"
                  >
                    <span>{q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-teal-700' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed pr-6">{a}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 py-20 px-4 sm:px-6 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
            <ChefHat className="h-8 w-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Pronta para profissionalizar o seu atelier de doces?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-teal-100 leading-relaxed">
            Crie a sua conta em menos de 30 segundos, receba ingredientes e receita modelo já
            cadastrados e experimente tudo grátis por 15 dias.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-extrabold text-teal-900 shadow-xl hover:bg-emerald-50 transition-all hover:-translate-y-0.5"
            >
              <span>Criar minha conta grátis</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-teal-200/80">
            A partir de {p.currency} {p.monthly}/mês · Sem compromisso
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 py-10 px-4 sm:px-6 text-gray-400 border-t border-white/10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
              <ChefHat className="h-4 w-4" />
            </div>
            <span className="font-bold text-white text-base">Doce Finance</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/login?mode=signup" className="hover:text-white transition-colors">
              Criar Conta
            </Link>
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <a
              href="mailto:suporte@docefinance.app"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Suporte</span>
            </a>
          </div>

          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Doce Finance. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
