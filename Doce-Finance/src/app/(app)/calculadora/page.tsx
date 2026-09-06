'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { Select, Input } from '@/components/ui/Input'
import type { Recipe } from '@/types/database'

export default function CalculadoraPage() {
  const supabase = useSupabase()
  const { format } = useCurrency()
  const [recipes, setRecipes] = useState<Recipe[]>([])

  // Seção 1 — custo proporcional
  const [recipeId, setRecipeId] = useState('')
  const [portions, setPortions] = useState('1')
  const [margin, setMargin] = useState('30')

  // Seção 2 — Simulador de Delivery
  const [isDelivery, setIsDelivery] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('recipes').select('*').order('name')
      setRecipes((data as Recipe[]) || [])
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const recipe = useMemo(
    () => recipes.find((r) => r.id === recipeId),
    [recipes, recipeId],
  )

  const proportional = useMemo(() => {
    if (!recipe) return { unitCost: 0, totalCost: 0, price: 0 }
    const yieldQty = Number(recipe.yield_quantity) || 1
    const unitCost = Number(recipe.total_cost) / yieldQty
    const p = parseFloat(portions) || 0
    const totalCost = unitCost * p
    const m = parseFloat(margin) || 0
    const price = m < 100 ? totalCost / (1 - m / 100) : 0
    return { unitCost, totalCost, price }
  }, [recipe, portions, margin])

  // Seção 2 cálculos
  const deliveryInfo = useMemo(() => {
    const basePrice = proportional.price
    const feePct = parseFloat(deliveryFee) || 0
    const deliveryPrice = feePct < 100 && basePrice > 0 ? basePrice / (1 - feePct / 100) : 0
    const platformFee = deliveryPrice > 0 ? deliveryPrice - basePrice : 0
    return { basePrice, deliveryPrice, platformFee }
  }, [proportional.price, deliveryFee])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculadora</h1>
        <p className="text-sm text-gray-500">
          Calcule custos proporcionais e margens de lucro.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Seção 1 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Calculator className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              Custo por porção / tamanho
            </h2>
          </div>

          <div className="space-y-4">
            <Select
              label="Receita"
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
            >
              <option value="">Selecione uma receita</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`Porções (rende ${recipe?.yield_quantity ?? '—'} ${recipe?.yield_unit ?? ''})`}
                type="number"
                min="0"
                step="any"
                value={portions}
                onChange={(e) => setPortions(e.target.value)}
              />
              <Input
                label="Margem (%)"
                type="number"
                min="0"
                max="99"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
              />
            </div>

            {recipe && (
              <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Custo por unidade</span>
                  <span className="font-medium text-gray-900">
                    {format(proportional.unitCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Custo total</span>
                  <span className="font-medium text-gray-900">
                    {format(proportional.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
                  <span className="font-semibold text-gray-700">Preço sugerido</span>
                  <span className="font-bold text-brand-700">
                    {format(proportional.price)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seção 2 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Calculator className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              Simulador de Taxas de Delivery
            </h2>
          </div>

          <div className="mb-6 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isDelivery}
                onChange={(e) => setIsDelivery(e.target.checked)}
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">
              Vender por aplicativo de entrega?
            </span>
          </div>

          {isDelivery && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <Input
                label="Taxa cobrada pelo App (%)"
                type="number"
                min="0"
                max="99"
                placeholder="Ex.: 12"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
              />

              <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Preço Base (Painel esquerdo)</span>
                  <span className="font-medium text-gray-900">
                    {format(deliveryInfo.basePrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Valor retido pela plataforma</span>
                  <span className="font-medium text-danger">
                    {format(deliveryInfo.platformFee)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
                  <span className="font-semibold text-gray-700">Preço de Venda no App</span>
                  <span className="font-bold text-brand-700">
                    {format(deliveryInfo.deliveryPrice)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
