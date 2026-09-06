'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSupabase } from '@/hooks/useSupabase'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReceitaCard } from '@/components/receitas/ReceitaCard'
import type { Recipe } from '@/types/database'

export default function ReceitasPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) toast.error('Erro ao carregar receitas.')
      setRecipes((data as Recipe[]) || [])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = useMemo(
    () => Array.from(new Set(recipes.map((r) => r.category))).sort(),
    [recipes],
  )

  const filtered = useMemo(
    () =>
      recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) &&
          (!category || r.category === category),
      ),
    [recipes, search, category],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
          <p className="text-sm text-gray-500">Suas fichas técnicas e precificações.</p>
        </div>
        <Button onClick={() => router.push('/receitas/nova')}>
          <Plus className="h-4 w-4" />
          Nova receita
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar receita..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma receita cadastrada ainda"
          description="Crie fichas técnicas para calcular custos e definir preços de venda."
          action={
            <Button onClick={() => router.push('/receitas/nova')}>
              <Plus className="h-4 w-4" />
              Criar receita
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <ReceitaCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  )
}
