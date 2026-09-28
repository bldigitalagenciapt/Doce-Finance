import { headers } from "next/headers"
import LandingPage from "@/components/landing/LandingPage"

export const dynamic = "force-dynamic"

export default async function Home() {
  // Deteccao de pais via Vercel header (server-side, sem Supabase)
  const headersList = await headers()
  const country = headersList.get("x-vercel-ip-country") || "PT"
  const isBrazil = country === "BR"

  // Sem verificacao de auth server-side aqui
  // LandingPage verifica auth no client e redireciona se logado
  return <LandingPage isBrazil={isBrazil} />
}
