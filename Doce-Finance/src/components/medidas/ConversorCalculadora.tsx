'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ArrowRightLeft,
  Copy,
  Check,
  Scale,
  Sparkles,
  Plus,
  Pencil,
} from 'lucide-react'
import { MeasurementRow, parseFraction } from '@/lib/measurementsData'
import { Input, Select } from '@/components/ui/Input'
import { NovoIngredienteModal } from './NovoIngredienteModal'
import { EditarIngredienteModal } from './EditarIngredienteModal'
import { NewIngredientPayload } from '@/hooks/useMeasurements'

interface ConversorCalculadoraProps {
  measurements: MeasurementRow[]
  onUseValue?: (gramsMl: number, unit: string, ingredientName: string) => void
  onAddIngredientWithMeasures?: (payload: NewIngredientPayload) => void
  onRenameIngredient?: (oldName: string, newName: string) => void
  onDeleteIngredient?: (name: string) => void
  onAddSingleMeasure?: (item: Omit<MeasurementRow, 'id'>) => void
}

export function ConversorCalculadora({
  measurements,
  onUseValue,
  onAddIngredientWithMeasures,
  onRenameIngredient,
  onDeleteIngredient,
  onAddSingleMeasure,
}: ConversorCalculadoraProps) {
  const [mode, setMode] = useState<'caseira_para_gramas' | 'gramas_para_caseira'>('caseira_para_gramas')
  const [selectedIngredient, setSelectedIngredient] = useState('FARINHA')
  const [selectedTipo, setSelectedTipo] = useState('TRIGO')
  const [selectedConversion, setSelectedConversion] = useState('XÍCARA')
  const [qtyInput, setQtyInput] = useState('1')
  const [gramsInput, setGramsInput] = useState('120')
  const [copied, setCopied] = useState(false)

  // Modais de gerenciamento de ingrediente
  const [modalNewOpen, setModalNewOpen] = useState(false)
  const [modalEditOpen, setModalEditOpen] = useState(false)

  // Mapeamento de ingredientes para tipos e conversões
  const ingredientsMap = useMemo(() => {
    const map = new Map<string, { tipos: Set<string>; conversoes: Map<string, Set<string>> }>()
    measurements.forEach((m) => {
      if (!map.has(m.ingrediente)) {
        map.set(m.ingrediente, { tipos: new Set(), conversoes: new Map() })
      }
      const entry = map.get(m.ingrediente)!
      entry.tipos.add(m.tipo)
      if (!entry.conversoes.has(m.tipo)) {
        entry.conversoes.set(m.tipo, new Set())
      }
      entry.conversoes.get(m.tipo)!.add(m.conversao)
    })
    return map
  }, [measurements])

  const ingredientsList = useMemo(() => {
    return Array.from(ingredientsMap.keys()).sort()
  }, [ingredientsMap])

  // Inicializa com primeiro ingrediente caso o atual não exista
  useEffect(() => {
    if (ingredientsList.length > 0 && !ingredientsMap.has(selectedIngredient)) {
      const firstIng = ingredientsList[0]
      setSelectedIngredient(firstIng)
      const tipos = Array.from(ingredientsMap.get(firstIng)?.tipos || ['NORMAL'])
      const firstTipo = tipos[0] || 'NORMAL'
      setSelectedTipo(firstTipo)
      const convs = Array.from(ingredientsMap.get(firstIng)?.conversoes.get(firstTipo) || ['XÍCARA'])
      setSelectedConversion(convs[0] || 'XÍCARA')
    }
  }, [ingredientsList, ingredientsMap, selectedIngredient])

  // Tipos disponíveis para o ingrediente selecionado
  const availableTipos = useMemo(() => {
    const entry = ingredientsMap.get(selectedIngredient)
    return entry ? Array.from(entry.tipos) : ['NORMAL']
  }, [ingredientsMap, selectedIngredient])

  // Medidas de conversão disponíveis para o ingrediente + tipo
  const availableConversions = useMemo(() => {
    const entry = ingredientsMap.get(selectedIngredient)
    if (!entry) return ['XÍCARA']
    const convSet = entry.conversoes.get(selectedTipo) || entry.conversoes.get(availableTipos[0])
    return convSet ? Array.from(convSet) : ['XÍCARA']
  }, [ingredientsMap, selectedIngredient, selectedTipo, availableTipos])

  // Sincronização automática quando o ingrediente ou tipo mudam
  const handleIngredientChange = (newIng: string) => {
    if (newIng === '__ADD_NEW__') {
      setModalNewOpen(true)
      return
    }

    setSelectedIngredient(newIng)
    const entry = ingredientsMap.get(newIng)
    const newTipos = entry ? Array.from(entry.tipos) : ['NORMAL']
    const nextTipo = newTipos[0] || 'NORMAL'
    setSelectedTipo(nextTipo)

    const nextConvs = entry && entry.conversoes.get(nextTipo)
      ? Array.from(entry.conversoes.get(nextTipo)!)
      : ['XÍCARA']
    setSelectedConversion(nextConvs[0] || 'XÍCARA')
  }

  const handleTipoChange = (newTipo: string) => {
    setSelectedTipo(newTipo)
    const entry = ingredientsMap.get(selectedIngredient)
    const nextConvs = entry && entry.conversoes.get(newTipo)
      ? Array.from(entry.conversoes.get(newTipo)!)
      : ['XÍCARA']
    if (!nextConvs.includes(selectedConversion)) {
      setSelectedConversion(nextConvs[0] || 'XÍCARA')
    }
  }

  // Obter peso base para a combinação selecionada
  const baseWeight = useMemo(() => {
    // 1. Procura item com quantidade = "1"
    const exact = measurements.find(
      (m) =>
        m.ingrediente === selectedIngredient &&
        m.tipo === selectedTipo &&
        m.conversao === selectedConversion &&
        (m.quantidade === '1' || m.quantidade === '1.0'),
    )
    if (exact) {
      return { value: exact.gramasMl, unit: exact.unidadeMedida }
    }

    // 2. Procura qualquer fração com essa conversão para achar o valor de 1 unidade
    const anyMatchingConv = measurements.find(
      (m) =>
        m.ingrediente === selectedIngredient &&
        m.tipo === selectedTipo &&
        m.conversao === selectedConversion,
    )
    if (anyMatchingConv) {
      const frac = parseFraction(anyMatchingConv.quantidade) || 1
      return {
        value: anyMatchingConv.gramasMl / frac,
        unit: anyMatchingConv.unidadeMedida,
      }
    }

    // 3. Fallback: pega o primeiro item deste ingrediente
    const firstAny = measurements.find((m) => m.ingrediente === selectedIngredient)
    if (firstAny) {
      return { value: firstAny.gramasMl, unit: firstAny.unidadeMedida }
    }

    return { value: 0, unit: 'g' as const }
  }, [measurements, selectedIngredient, selectedTipo, selectedConversion])

  // Cálculo: Medida Caseira -> Gramas / ML
  const calculatedGrams = useMemo(() => {
    const qty = parseFraction(qtyInput)
    if (!qty || !baseWeight.value) return 0
    const total = qty * baseWeight.value
    return Math.round(total * 10) / 10
  }, [qtyInput, baseWeight])

  // Cálculo Inverso: Gramas -> Medida Caseira
  const calculatedReverse = useMemo(() => {
    const g = parseFloat(gramsInput) || 0
    if (!g || !baseWeight.value) return { raw: 0, formatted: '0' }
    const x = g / baseWeight.value
    const rounded = Math.round(x * 100) / 100
    let friendly = `${rounded}`
    if (Math.abs(x - 0.25) < 0.04) friendly = '1/4'
    else if (Math.abs(x - 0.33) < 0.04) friendly = '1/3'
    else if (Math.abs(x - 0.5) < 0.04) friendly = '1/2'
    else if (Math.abs(x - 0.66) < 0.04) friendly = '2/3'
    else if (Math.abs(x - 0.75) < 0.04) friendly = '3/4'
    else if (Math.abs(x - 1) < 0.04) friendly = '1'
    else if (Math.abs(x - 1.25) < 0.04) friendly = '1 e 1/4'
    else if (Math.abs(x - 1.5) < 0.04) friendly = '1 e 1/2'
    else if (Math.abs(x - 2) < 0.04) friendly = '2'

    return { raw: rounded, formatted: friendly }
  }, [gramsInput, baseWeight])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const quickFractions = ['1/4', '1/3', '1/2', '1', '1.5', '2']

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Conversor Rápido para a Balança
            </h3>
            <p className="text-xs text-gray-500">
              Digite a medida que está na receita e descubra o peso exato em gramas ou ml.
            </p>
          </div>
        </div>

        {/* Alternar modo */}
        <div className="inline-flex self-start rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('caseira_para_gramas')}
            className={`rounded-md px-3 py-1.5 transition-all ${
              mode === 'caseira_para_gramas'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Medida ➔ Balança (g/ml)
          </button>
          <button
            type="button"
            onClick={() => setMode('gramas_para_caseira')}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 transition-all ${
              mode === 'gramas_para_caseira'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowRightLeft className="h-3 w-3" />
            Balança (g/ml) ➔ Medida
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Ingrediente com botões de Editar e Adicionar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              1. Ingrediente
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setModalEditOpen(true)}
                title="Editar ou renomear este ingrediente"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                <span>Editar</span>
              </button>
              <span className="text-gray-300 text-xs">|</span>
              <button
                type="button"
                onClick={() => setModalNewOpen(true)}
                title="Cadastrar novo ingrediente"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>+ Novo</span>
              </button>
            </div>
          </div>

          <select
            value={selectedIngredient}
            onChange={(e) => handleIngredientChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {ingredientsList.map((ing) => (
              <option key={ing} value={ing}>
                {ing}
              </option>
            ))}
            <option disabled value="">
              ──────────
            </option>
            <option value="__ADD_NEW__" className="font-semibold text-brand-700">
              + Adicionar novo ingrediente...
            </option>
          </select>
        </div>

        {/* 2. Tipo / Subtipo */}
        <div>
          <Select
            label="2. Variação / Tipo"
            value={selectedTipo}
            onChange={(e) => handleTipoChange(e.target.value)}
          >
            {availableTipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        {/* 3. Conversão (Xícara, Colher) */}
        <div>
          <Select
            label="3. Medida da Receita"
            value={selectedConversion}
            onChange={(e) => setSelectedConversion(e.target.value)}
          >
            {availableConversions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {/* 4. Quantidade ou Gramas */}
        <div>
          {mode === 'caseira_para_gramas' ? (
            <div>
              <Input
                label="4. Quantidade na Receita"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                placeholder="Ex: 1, 1/2, 2..."
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {quickFractions.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setQtyInput(f)}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                      qtyInput === f
                        ? 'bg-brand-700 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <Input
                label={`Peso na Balança (${baseWeight.unit || 'g'})`}
                type="number"
                min="0"
                step="any"
                value={gramsInput}
                onChange={(e) => setGramsInput(e.target.value)}
                placeholder="Ex: 180"
              />
            </div>
          )}
        </div>
      </div>

      {/* Caixa de Resultado Destacada */}
      <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              Coloque na balança:
            </span>
            {mode === 'caseira_para_gramas' ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 sm:text-3xl">
                  {calculatedGrams} {baseWeight.unit}
                </span>
                <span className="text-xs text-gray-500">
                  equivale a {qtyInput} {selectedConversion.toLowerCase()} de{' '}
                  {selectedIngredient.toLowerCase()} ({selectedTipo.toLowerCase()})
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-black text-brand-800 sm:text-3xl">
                  {calculatedReverse.formatted} {selectedConversion.toLowerCase()}
                </span>
                <span className="text-xs text-gray-500">
                  (aprox. {calculatedReverse.raw} {selectedConversion.toLowerCase()} para{' '}
                  {gramsInput}
                  {baseWeight.unit})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() =>
              handleCopy(
                mode === 'caseira_para_gramas'
                  ? `${calculatedGrams}`
                  : `${calculatedReverse.formatted}`,
              )
            }
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-success" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-gray-500" />
                <span>Copiar Peso</span>
              </>
            )}
          </button>

          {onUseValue && (
            <button
              type="button"
              onClick={() =>
                onUseValue(
                  calculatedGrams,
                  baseWeight.unit,
                  `${selectedIngredient} (${selectedTipo})`,
                )
              }
              className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-800"
            >
              Usar na Receita
            </button>
          )}
        </div>
      </div>

      {/* Modal Adicionar Novo Ingrediente */}
      <NovoIngredienteModal
        open={modalNewOpen}
        onClose={() => setModalNewOpen(false)}
        onSave={(payload) => {
          if (onAddIngredientWithMeasures) {
            onAddIngredientWithMeasures(payload)
          }
        }}
        onSelectIngredient={(name) => {
          setSelectedIngredient(name)
          const entry = ingredientsMap.get(name)
          const nextTipos = entry ? Array.from(entry.tipos) : ['NORMAL']
          setSelectedTipo(nextTipos[0] || 'NORMAL')
        }}
      />

      {/* Modal Editar Ingrediente Selecionado */}
      <EditarIngredienteModal
        open={modalEditOpen}
        onClose={() => setModalEditOpen(false)}
        ingredientName={selectedIngredient}
        measurements={measurements}
        onRename={(oldName, newName) => {
          if (onRenameIngredient) {
            onRenameIngredient(oldName, newName)
            setSelectedIngredient(newName)
          }
        }}
        onDeleteIngredient={(name) => {
          if (onDeleteIngredient) {
            onDeleteIngredient(name)
          }
        }}
        onAddMeasure={(item) => {
          if (onAddSingleMeasure) {
            onAddSingleMeasure(item)
          }
        }}
      />
    </div>
  )
}
