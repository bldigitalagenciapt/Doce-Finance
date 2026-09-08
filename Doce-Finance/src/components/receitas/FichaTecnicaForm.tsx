'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Search, Save, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Ingredient, Recipe, YieldUnit } from '@/types/database'

const CATEGORIES = ['Bolo', 'Torta', 'Doce', 'Salgado', 'Cupcake', 'Sobremesa', 'Outros']
const YIELD_UNITS: YieldUnit[] = ['un', 'fatia', 'porção', 'g', 'kg', 'ml', 'L']

interface RecipeItemRow {
  ingredient_id: string
  quantity: string
  categoria: string
  blockId: string
}
interface ExtraCost {
  nome: string
  valor: string
}

export function FichaTecnicaForm({ recipeId }: { recipeId?: string }) {
  const supabase = useSupabase()
  const router = useRouter()
  const { format, symbol } = useCurrency()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>(() => [
    { id: Math.random().toString(36).slice(2), name: 'Nova Etapa' },
  ])
  const [searches, setSearches] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: '',
    category: 'Bolo',
    description: '',
    yield_quantity: '1',
    yield_unit: 'un' as YieldUnit,
    margin_percent: 30,
  })
  const [rows, setRows] = useState<RecipeItemRow[]>([])
  const [extras, setExtras] = useState<ExtraCost[]>([])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const ingRes = await supabase
        .from('ingredients')
        .select('*')
        .order('name', { ascending: true })
      const ings = (ingRes.data as Ingredient[]) || []
      setIngredients(ings)

      if (recipeId) {
        const [recipeRes, riRes] = await Promise.all([
          supabase.from('recipes').select('*').eq('id', recipeId).single(),
          supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId),
        ])
        const r = recipeRes.data as Recipe | null
        if (r) {
          setForm({
            name: r.name,
            category: r.category,
            description: r.description || '',
            yield_quantity: String(r.yield_quantity),
            yield_unit: r.yield_unit,
            margin_percent: Number(r.margin_percent),
          })
          setExtras(
            r.extra_costs > 0
              ? [{ nome: 'Custos extras', valor: String(r.extra_costs) }]
              : [],
          )
        }
        const initialRows = (riRes.data || []).map((ri: any) => ({
          ingredient_id: ri.ingredient_id,
          quantity: String(ri.quantity),
          categoria: ri.categoria || 'Nova Etapa',
        }))

        const uniqueCats = Array.from(new Set(initialRows.map((r: any) => r.categoria)))
        const catToBlockId: Record<string, string> = {}
        const loadedBlocks = uniqueCats.length > 0 
          ? uniqueCats.map(name => {
              const id = Math.random().toString(36).slice(2)
              catToBlockId[name as string] = id
              return { id, name: name as string }
            })
          : [{ id: Math.random().toString(36).slice(2), name: 'Nova Etapa' }]
        
        setBlocks(loadedBlocks)

        setRows(initialRows.map((r: any) => ({
          ...r,
          blockId: catToBlockId[r.categoria] || loadedBlocks[0].id
        })))
      }
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId])

  const ingMap = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])),
    [ingredients],
  )

  const getAvailableIngredients = (blockId: string) => {
    const s = (searches[blockId] || '').toLowerCase()
    return ingredients.filter(
      (i) =>
        i.name.toLowerCase().includes(s) &&
        !rows.some((r) => r.ingredient_id === i.id && r.blockId === blockId),
    )
  }

  const ingredientsCost = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const ing = ingMap[r.ingredient_id]
        const qty = parseFloat(r.quantity) || 0
        return sum + (ing ? qty * Number(ing.cost_per_unit) : 0)
      }, 0),
    [rows, ingMap],
  )

  const extraCost = useMemo(
    () => extras.reduce((sum, e) => sum + (parseFloat(e.valor) || 0), 0),
    [extras],
  )

  const totalCost = ingredientsCost + extraCost
  const suggestedPrice =
    form.margin_percent < 100 ? totalCost / (1 - form.margin_percent / 100) : 0
  const profit = suggestedPrice - totalCost

  const addRow = (id: string, blockName: string, blockId: string) => {
    setRows([...rows, { ingredient_id: id, quantity: '', categoria: blockName, blockId }])
    setSearches({ ...searches, [blockId]: '' })
  }

  const addBlock = () => {
    setBlocks([...blocks, { id: Math.random().toString(36).slice(2), name: 'Nova Etapa' }])
  }

  const updateBlockName = (id: string, newName: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, name: newName } : b)))
    setRows(rows.map((r) => (r.blockId === id ? { ...r, categoria: newName } : r)))
  }

  const removeBlock = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta etapa e todos os seus ingredientes?')) {
      setBlocks(blocks.filter((b) => b.id !== id))
      setRows(rows.filter((r) => r.blockId !== id))
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Informe o nome da receita.')
    if (rows.length === 0) return toast.error('Adicione ao menos um ingrediente.')

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada.')

      const recipePayload = {
        user_id: user.id,
        name: form.name.trim(),
        category: form.category,
        description: form.description || null,
        yield_quantity: parseFloat(form.yield_quantity) || 1,
        yield_unit: form.yield_unit,
        extra_costs: extraCost,
        margin_percent: form.margin_percent,
      }

      let rid = recipeId
      if (rid) {
        const { error } = await supabase.from('recipes').update(recipePayload).eq('id', rid)
        if (error) throw error
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', rid)
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert(recipePayload)
          .select('id')
          .single()
        if (error) throw error
        rid = data.id
      }

      const riPayload = rows
        .filter((r) => r.ingredient_id && parseFloat(r.quantity) > 0)
        .map((r) => ({
          recipe_id: rid,
          ingredient_id: r.ingredient_id,
          quantity: parseFloat(r.quantity),
          unit: ingMap[r.ingredient_id]?.unit || 'g',
          categoria: r.categoria,
        }))

      if (riPayload.length > 0) {
        const { error } = await supabase.from('recipe_ingredients').insert(riPayload)
        if (error) throw error
      }

      toast.success(recipeId ? 'Receita atualizada!' : 'Receita criada!')
      router.push('/receitas')
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar receita.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Painel principal */}
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Dados da receita</h2>
          <div className="space-y-4">
            <Input
              label="Nome da receita"
              placeholder="Ex.: Bolo de chocolate"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Categoria"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                label="Rendimento"
                type="number"
                min="1"
                step="any"
                value={form.yield_quantity}
                onChange={(e) => setForm({ ...form, yield_quantity: e.target.value })}
              />
              <Select
                label="Unidade"
                value={form.yield_unit}
                onChange={(e) =>
                  setForm({ ...form, yield_unit: e.target.value as YieldUnit })
                }
              >
                {YIELD_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              label="Descrição (opcional)"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        {/* Ingredientes */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Etapas do Preparo</h2>
            <Button variant="outline" size="sm" onClick={addBlock}>
              <Plus className="h-4 w-4" />
              Nova Etapa
            </Button>
          </div>

          <div className="space-y-6">
            {blocks.map((block) => {
              const blockSearch = searches[block.id] || ''
              const avail = getAvailableIngredients(block.id)
              const blockRows = rows
                .map((r, idx) => ({ ...r, originalIndex: idx }))
                .filter((r) => r.blockId === block.id)

              return (
                <div
                  key={block.id}
                  className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="group relative flex flex-1 items-center">
                      <input
                        type="text"
                        value={block.name}
                        onChange={(e) => updateBlockName(block.id, e.target.value)}
                        className="peer w-full bg-transparent text-lg font-bold text-gray-800 placeholder-gray-400 pr-8 focus:border-b-2 focus:border-brand-500 focus:outline-none"
                        placeholder="Nome da etapa (ex: Massa, Recheio)"
                      />
                      <Pencil className="absolute right-2 h-4 w-4 text-gray-300 opacity-50 transition-opacity group-hover:opacity-100 peer-focus:opacity-0 pointer-events-none" />
                    </div>
                    <button
                      onClick={() => removeBlock(block.id)}
                      className="ml-4 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-danger"
                      title="Remover Etapa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="pl-9 bg-white"
                      placeholder="Buscar ingrediente para adicionar..."
                      value={blockSearch}
                      onChange={(e) =>
                        setSearches({ ...searches, [block.id]: e.target.value })
                      }
                    />
                    {blockSearch && avail.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {avail.slice(0, 8).map((i) => (
                          <button
                            key={i.id}
                            onClick={() => addRow(i.id, block.name, block.id)}
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-brand-50"
                          >
                            <span>{i.name}</span>
                            <span className="text-xs text-gray-400">
                              {format(i.cost_per_unit)}/{i.unit}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {blockRows.length === 0 ? (
                    <p className="py-2 text-center text-sm text-gray-400">
                      Nenhum ingrediente adicionado nesta etapa.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {blockRows.map((r) => {
                        const idx = r.originalIndex
                        const ing = ingMap[r.ingredient_id]
                        const qty = parseFloat(r.quantity) || 0
                        const cost = ing ? qty * Number(ing.cost_per_unit) : 0
                        return (
                          <div
                            key={`${r.blockId}-${r.ingredient_id}`}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{ing?.name}</p>
                              <p className="text-xs text-gray-400">
                                {format(ing?.cost_per_unit || 0)}/{ing?.unit}
                              </p>
                            </div>
                            <div className="w-28">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="Qtd"
                                  value={r.quantity}
                                  onChange={(e) => {
                                    const next = [...rows]
                                    next[idx].quantity = e.target.value
                                    setRows(next)
                                  }}
                                  className="h-9 w-full rounded-lg border border-gray-300 pl-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                  {ing?.unit}
                                </span>
                              </div>
                            </div>
                            <div className="w-20 text-right text-sm font-semibold text-gray-900">
                              {format(cost)}
                            </div>
                            <button
                              onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Custos extras */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Custos extras</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExtras([...extras, { nome: '', valor: '' }])}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
          {extras.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              Ex.: embalagem, gás, energia.
            </p>
          ) : (
            <div className="space-y-2">
              {extras.map((e, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Input
                    placeholder="Descrição"
                    value={e.nome}
                    onChange={(ev) => {
                      const next = [...extras]
                      next[idx].nome = ev.target.value
                      setExtras(next)
                    }}
                  />
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      {symbol}
                    </span>
                    <Input
                      className="pl-9"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Valor"
                      value={e.valor}
                      onChange={(ev) => {
                        const next = [...extras]
                        next[idx].valor = ev.target.value
                        setExtras(next)
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setExtras(extras.filter((_, i) => i !== idx))}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Painel resumo */}
      <div className="lg:col-span-1">
        <div className="sticky top-20 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <h2 className="text-base font-semibold text-gray-900">Resumo de precificação</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Custo ingredientes</span>
              <span className="font-medium text-gray-900">{format(ingredientsCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Custos extras</span>
              <span className="font-medium text-gray-900">{format(extraCost)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-medium text-gray-700">Custo total</span>
              <span className="font-semibold text-gray-900">{format(totalCost)}</span>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Margem de lucro</label>
              <span className="text-sm font-semibold text-brand-700">
                {form.margin_percent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="1"
              value={form.margin_percent}
              onChange={(e) =>
                setForm({ ...form, margin_percent: Number(e.target.value) })
              }
              className="w-full accent-brand-700"
            />
          </div>

          <div className="rounded-lg bg-brand-700 p-4 text-white">
            <p className="text-xs text-brand-100">Preço sugerido</p>
            <p className="text-2xl font-bold">{format(suggestedPrice)}</p>
            <p className="mt-1 text-xs text-brand-100">Lucro: {format(profit)}</p>
          </div>

          <Button className="w-full" onClick={handleSave} loading={saving} size="lg">
            <Save className="h-4 w-4" />
            Salvar receita
          </Button>
        </div>
      </div>
    </div>
  )
}
