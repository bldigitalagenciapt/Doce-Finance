'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import type { Recipe } from '@/types/database'
import { Badge } from '@/components/ui/Badge'
import { useCurrency } from '@/hooks/useCurrency'

export function ReceitaCard({ recipe }: { recipe: Recipe }) {
  const { format } = useCurrency()

  return (
    <Link
      href={`/receitas/${recipe.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition-shadow hover:shadow-md"
    >
      <div className="flex h-32 items-center justify-center bg-brand-50">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="h-10 w-10 text-brand-300" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700">
            {recipe.name}
          </h3>
          <Badge tone="brand">{recipe.category}</Badge>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Custo total</p>
            <p className="font-medium text-gray-700">{format(recipe.total_cost)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Preço sugerido</p>
            <p className="font-semibold text-brand-700">{format(recipe.suggested_price)}</p>
          </div>
        </div>
        <div className="mt-2">
          <Badge tone="success">Margem {Number(recipe.margin_percent).toFixed(0)}%</Badge>
        </div>
      </div>
    </Link>
  )
}
