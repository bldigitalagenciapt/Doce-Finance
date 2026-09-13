import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Se ja estiver logado, vai pro dashboard
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  // Deteccao de pais via Vercel header
  const headersList = headers()
  const country = headersList.get('x-vercel-ip-country') || 'PT'
  const isBrazil = country === 'BR'

  return <LandingPage isBrazil={isBrazil} />
}
