'use client'

import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IngredienteModal } from '@/components/ingredientes/IngredienteModal'
import type { Ingredient } from '@/types/database'

export default function IngredientesPage() {
  const supabase = useSupabase()
  const { format } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Ingredient[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [deleting, setDeleting] = useState<Ingredient | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true })
    if (error) toast.error('Erro ao carregar ingredientes.')
    setItems((data as Ingredient[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  )

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) &&
          (!category || i.category === category),
      ),
    [items, search, category],
  )

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const { error } = await supabase.from('ingredients').delete().eq('id', deleting.id)
    setDeleteLoading(false)
    if (error) {
      toast.error('Não foi possível excluir (verifique se está em uso).')
    } else {
      toast.success('Ingrediente excluído.')
      setDeleting(null)
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingredientes</h1>
          <p className="text-sm text-gray-500">
            Gerencie seus insumos e o custo por unidade.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Novo ingrediente
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar ingrediente..."
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
          icon={Package}
          title="Nenhum ingrediente encontrado"
          description="Cadastre seus insumos para calcular o custo das receitas."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Cadastrar ingrediente
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Categoria</TH>
              <TH>Embalagem</TH>
              <TH>Custo embalagem</TH>
              <TH>Custo / 100g</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((i) => (
              <TR key={i.id}>
                <TD className="font-medium text-gray-900">{i.name}</TD>
                <TD>
                  <Badge tone="brand">{i.category}</Badge>
                </TD>
                <TD>
                  {i.quantity_purchased} {i.unit}
                </TD>
                <TD>{format(i.cost_per_package)}</TD>
                <TD className="font-semibold text-gray-900">
                  {format(i.cost_per_unit * 100)} / 100{i.unit}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditing(i)
                        setModalOpen(true)
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(i)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <IngredienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        message={`Excluir "${deleting?.name}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
