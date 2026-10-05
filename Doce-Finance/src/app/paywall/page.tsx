import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LogOut } from "lucide-react"
import { CheckoutButton } from "./CheckoutButton"

export default async function PaywallPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at, currency_preference, currency')
    .eq('id', user.id)
    .single()

  const isExpired = profile?.trial_ends_at ? new Date(profile.trial_ends_at) < new Date() : false
  const isTrialing = profile?.subscription_status === 'trialing'

  // Se já tem assinatura ativa, manda de volta pro dashboard
  // Não redirecionamos quem está em trial para que eles possam assinar antecipadamente
  if (profile?.subscription_status === 'active') {
    redirect("/dashboard")
  }

  // Define URLs do Stripe (estas seriam configuradas em .env na vida real)
  const STRIPE_LINKS = {
    EUR: {
      mensal: process.env.NEXT_PUBLIC_STRIPE_EUR_MENSAL || '#',
      anual: process.env.NEXT_PUBLIC_STRIPE_EUR_ANUAL || '#'
    },
    BRL: {
      mensal: process.env.NEXT_PUBLIC_STRIPE_BRL_MENSAL || '#',
      anual: process.env.NEXT_PUBLIC_STRIPE_BRL_ANUAL || '#'
    }
  }

  const userCurrency = profile?.currency || 'EUR'
  const isBRL = userCurrency === 'BRL'

  const currentStripeLinks = STRIPE_LINKS[userCurrency as 'EUR' | 'BRL'] || STRIPE_LINKS.EUR

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8">
        <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isExpired ? 'O seu período de avaliação chegou ao fim.' : 'Assine para continuar aproveitando!'}
        </h1>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          {isExpired 
            ? 'O seu período de avaliação de 15 dias terminou. As suas receitas e custos continuam salvos com segurança. Escolha um plano abaixo para reativar seu acesso.'
            : 'Garanta o seu acesso sem interrupções. Escolha o melhor plano abaixo para o seu atelier e profissionalize suas vendas.'}
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
          <div className="border border-gray-200 rounded-xl p-6 hover:border-brand-500 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900">Plano Mensal</h3>
            <div className="mt-4 flex justify-center items-baseline text-3xl font-extrabold text-brand-600">
              <span className="mr-2">{isBRL ? 'R$ 14,90' : '€ 6,90'}</span><span className="text-xl text-gray-500">/mês</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Faturado mensalmente</p>
            <CheckoutButton 
              plan="monthly" 
              currency={userCurrency as 'EUR' | 'BRL'} 
              label="Assinar Mensal" 
            />
          </div>

          <div className="border border-brand-500 rounded-xl p-6 relative bg-brand-50">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
              <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800">
                Mais Popular (20% OFF)
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Plano Anual</h3>
            <div className="mt-4 flex justify-center items-baseline text-3xl font-extrabold text-brand-600">
              <span className="mr-2">{isBRL ? 'R$ 149,90' : '€ 69,90'}</span><span className="text-xl text-gray-500">/ano</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Faturado anualmente</p>
            <CheckoutButton 
              plan="yearly" 
              currency={userCurrency as 'EUR' | 'BRL'} 
              label="Assinar Anual" 
            />
          </div>
        </div>
        
        <div className="mt-8 flex justify-center">
          <form action="/auth/signout" method="POST">
            <button type="submit" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900">
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
