'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  ingredientData?: Ingredient
}
interface ExtraCost {
  nome: string
  valor: string
}
interface Block {
  id: string
  name: string
}

/* ─── Sub-componente do Bloco de Etapa ─────────────────────────────────── */
interface RecipeBlockProps {
  block: Block
  rows: RecipeItemRow[]
  ingredients: Ingredient[]
  searchValue: string
  format: (v: number) => string
  onSearchChange: (val: string) => void
  onAddRow: (ingredientId: string, blockName: string, blockId: string) => void
  onRenameBlock: (id: string, newName: string) => void
  onBlurBlock: (id: string, currentName: string) => void
  onRemoveBlock: (id: string) => void
  onRemoveRow: (blockId: string, ingredientId: string) => void
  onQuantityChange: (blockId: string, ingredientId: string, qty: string) => void
}

function RecipeBlock({
  block, rows, ingredients, searchValue, format,
  onSearchChange, onAddRow, onRenameBlock, onBlurBlock,
  onRemoveBlock, onRemoveRow, onQuantityChange,
}: RecipeBlockProps) {
  const s = searchValue.toLowerCase()
  const avail = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(s) &&
      !rows.some((r) => r.ingredient_id === i.id && r.blockId === block.id),
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <label className="group relative flex flex-1 items-center">
          <input
            type="text"
            value={block.name}
            onChange={(e) => onRenameBlock(block.id, e.target.value)}
            onBlur={() => onBlurBlock(block.id, block.name)}
            className="peer w-full bg-transparent text-lg font-bold text-gray-800 placeholder-gray-400 pr-8 focus:border-b-2 focus:border-brand-500 focus:outline-none"
            placeholder="Nome da etapa (ex: Massa, Recheio)"
          />
          <Pencil className="absolute right-2 h-4 w-4 text-gray-400 transition-opacity peer-focus:opacity-0 cursor-pointer" />
        </label>
        <button
          onClick={() => onRemoveBlock(block.id)}
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
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchValue && avail.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {avail.slice(0, 8).map((i) => (
              <button
                key={i.id}
                onClick={() => onAddRow(i.id, block.name, block.id)}
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
        {searchValue && avail.length === 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 shadow-lg">
            Nenhum ingrediente encontrado.
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-2 text-center text-sm text-gray-400">
          Nenhum ingrediente adicionado nesta etapa.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const ing = r.ingredientData
            const qty = parseFloat(r.quantity) || 0
            const cost = ing ? qty * Number(ing.cost_per_unit) : 0
            const hasEmptyQty = !r.quantity || parseFloat(r.quantity) <= 0
            return (
              <div
                key={`${r.blockId}-${r.ingredient_id}`}
                className={`flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition-colors ${
                  hasEmptyQty ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
                }`}
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
                      onChange={(e) => onQuantityChange(block.id, r.ingredient_id, e.target.value)}
                      className={`h-9 w-full rounded-lg border pl-3 pr-8 text-sm focus:outline-none focus:ring-1 ${
                        hasEmptyQty
                          ? 'border-orange-300 focus:border-orange-400 focus:ring-orange-400'
                          : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500'
                      }`}
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
                  onClick={() => onRemoveRow(block.id, r.ingredient_id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-danger"
                  title="Remover ingrediente"
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

  const addRow = useCallback((id: string, blockName: string, blockId: string) => {
    setRows((prev) => [...prev, { ingredient_id: id, quantity: '', categoria: blockName, blockId }])
    setSearches((prev) => ({ ...prev, [blockId]: '' }))
  }, [])

  const addBlock = () => {
    setBlocks((prev) => [...prev, { id: Math.random().toString(36).slice(2), name: 'Nova Etapa' }])
  }

  const updateBlockName = useCallback((id: string, newName: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, name: newName } : b)))
    setRows((prev) => prev.map((r) => (r.blockId === id ? { ...r, categoria: newName } : r)))
  }, [])

  // Garante que o bloco nunca fica sem nome
  const handleBlockBlur = useCallback((id: string, currentName: string) => {
    if (!currentName.trim()) updateBlockName(id, 'Nova Etapa')
  }, [updateBlockName])

  const removeBlock = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta etapa e todos os seus ingredientes?')) {
      setBlocks((prev) => prev.filter((b) => b.id !== id))
      setRows((prev) => prev.filter((r) => r.blockId !== id))
    }
  }

  const handleQuantityChange = useCallback((blockId: string, ingredientId: string, qty: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.blockId === blockId && r.ingredient_id === ingredientId ? { ...r, quantity: qty } : r,
      ),
    )
  }, [])

  const handleRemoveRow = useCallback((blockId: string, ingredientId: string) => {
    setRows((prev) =>
      prev.filter((r) => !(r.blockId === blockId && r.ingredient_id === ingredientId)),
    )
  }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Informe o nome da receita.')
    if (rows.length === 0) return toast.error('Adicione ao menos um ingrediente.')

    const invalidRows = rows.filter((r) => !r.quantity || parseFloat(r.quantity) <= 0)
    if (invalidRows.length > 0) {
      const names = invalidRows
        .map((r) => ingMap[r.ingredient_id]?.name || 'desconhecido')
        .join(', ')
      return toast.error(`Preencha a quantidade dos ingredientes: ${names}`)
    }

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada.')

      const finalIngCost = rows.reduce((sum, r) => {
        const ing = ingMap[r.ingredient_id]
        const qty = parseFloat(r.quantity) || 0
        return sum + (ing ? qty * Number(ing.cost_per_unit) : 0)
      }, 0)
      const finalExtraCost = extras.reduce((s, e) => s + (parseFloat(e.valor) || 0), 0)
      const finalTotal = finalIngCost + finalExtraCost
      const finalPrice = form.margin_percent < 100 ? finalTotal / (1 - form.margin_percent / 100) : 0

      const recipePayload = {
        user_id: user.id,
        name: form.name.trim(),
        category: form.category,
        description: form.description || null,
        yield_quantity: parseFloat(form.yield_quantity) || 1,
        yield_unit: form.yield_unit,
        extra_costs: finalExtraCost,
        margin_percent: form.margin_percent,
        ingredients_cost: finalIngCost,
        total_cost: finalTotal,
        suggested_price: finalPrice,
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

      const riPayload = rows.map((r) => {
        const ing = ingMap[r.ingredient_id]
        const qty = parseFloat(r.quantity) || 0
        return {
          recipe_id: rid,
          ingredient_id: r.ingredient_id,
          quantity: qty,
          unit: ing?.unit || 'g',
          cost: ing ? qty * Number(ing.cost_per_unit) : 0,
          categoria: r.categoria,
        }
      })

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
              const blockRows = rows
                .filter((r) => r.blockId === block.id)
                .map((r) => ({ ...r, ingredientData: ingMap[r.ingredient_id] }))

              return (
                <RecipeBlock
                  key={block.id}
                  block={block}
                  rows={blockRows}
                  ingredients={ingredients}
                  searchValue={searches[block.id] || ''}
                  format={format}
                  onSearchChange={(val) =>
                    setSearches((prev) => ({ ...prev, [block.id]: val }))
                  }
                  onAddRow={addRow}
                  onRenameBlock={updateBlockName}
                  onBlurBlock={handleBlockBlur}
                  onRemoveBlock={removeBlock}
                  onRemoveRow={handleRemoveRow}
                  onQuantityChange={handleQuantityChange}
                />
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
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Margem de lucro</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="99"
                  step="1"
                  value={form.margin_percent}
                  onChange={(e) => {
                    const v = Math.min(99, Math.max(0, Number(e.target.value)))
                    setForm({ ...form, margin_percent: v })
                  }}
                  className="w-14 rounded-md border border-gray-300 px-2 py-0.5 text-center text-sm font-semibold text-brand-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-sm font-semibold text-brand-700">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="99"
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
