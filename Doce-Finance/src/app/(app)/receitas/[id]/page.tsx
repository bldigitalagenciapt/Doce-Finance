'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useParams } from 'next/navigation'
import { FichaTecnicaForm } from '@/components/receitas/FichaTecnicaForm'

export default function EditarReceitaPage() {
  const params = useParams()
  const id = params?.id as string

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/receitas"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar receita</h1>
          <p className="text-sm text-gray-500">Atualize a ficha técnica e a precificação.</p>
        </div>
      </div>
      <FichaTecnicaForm recipeId={id} />
    </div>
  )
}
