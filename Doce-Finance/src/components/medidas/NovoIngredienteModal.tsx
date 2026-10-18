'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useSupabase } from '@/hooks/useSupabase'
import { NewIngredientPayload } from '@/hooks/useMeasurements'
import { Sparkles, Package } from 'lucide-react'
import toast from 'react-hot-toast'

interface NovoIngredienteModalProps {
  open: boolean
  onClose: () => void
  onSave: (payload: NewIngredientPayload) => void
  onSelectIngredient?: (ingredientName: string) => void
}

export function NovoIngredienteModal({
  open,
  onClose,
  onSave,
  onSelectIngredient,
}: NovoIngredienteModalProps) {
  const supabase = useSupabase()
  const [ingrediente, setIngrediente] = useState('')
  const [tipo, setTipo] = useState('NORMAL')
  const [unidadeMedida, setUnidadeMedida] = useState<'g' | 'ml'>('g')

  // Medidas
  const [xicaraGrams, setXicaraGrams] = useState('')
  const [colherSopaGrams, setColherSopaGrams] = useState('')
  const [colherChaGrams, setColherChaGrams] = useState('')

  // Lista de ingredientes já cadastrados no Doce Finance
  const [dbIngredients, setDbIngredients] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    async function fetchDbIngredients() {
      try {
        const { data } = await supabase
          .from('ingredients')
          .select('id, name')
          .order('name', { ascending: true })
        if (data) {
          setDbIngredients(data)
        }
      } catch (err) {
        console.error('Erro ao buscar ingredientes cadastrados:', err)
      }
    }
    if (open) {
      fetchDbIngredients()
      setIngrediente('')
      setTipo('NORMAL')
      setUnidadeMedida('g')
      setXicaraGrams('')
      setColherSopaGrams('')
      setColherChaGrams('')
    }
  }, [open, supabase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nomeFormatado = ingrediente.toUpperCase().trim()
    if (!nomeFormatado) {
      toast.error('Informe o nome do ingrediente')
      return
    }

    const xic = parseFloat(xicaraGrams.replace(',', '.')) || undefined
    const sopa = parseFloat(colherSopaGrams.replace(',', '.')) || undefined
    const cha = parseFloat(colherChaGrams.replace(',', '.')) || undefined

    if (!xic && !sopa && !cha) {
      toast.error('Preencha ao menos uma medida (Xícara, Colher de Sopa ou Colher de Chá)')
      return
    }

    onSave({
      ingrediente: nomeFormatado,
      tipo: (tipo || 'NORMAL').toUpperCase().trim(),
      unidadeMedida,
      xicaraGrams: xic,
      colherSopaGrams: sopa,
      colherChaGrams: cha,
    })

    if (onSelectIngredient) {
      onSelectIngredient(nomeFormatado)
    }

    toast.success(`Ingrediente ${nomeFormatado} adicionado com sucesso!`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar Novo Ingrediente às Medidas"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500">
          Cadastre um novo ingrediente para que ele apareça na lista de seleção e na tabela de conversões.
        </p>

        {/* Escolha rápida de ingredientes cadastrados */}
        {dbIngredients.length > 0 && (
          <div className="rounded-lg border border-brand-200/60 bg-brand-50/40 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-800 mb-1.5">
              <Package className="h-3.5 w-3.5 text-brand-700" />
              <span>Usar ingrediente já cadastrado no seu Doce Finance:</span>
            </div>
            <select
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-700 focus:border-brand-500 focus:outline-none"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  setIngrediente(e.target.value.toUpperCase())
                }
              }}
            >
              <option value="">Selecione para preencher o nome...</option>
              {dbIngredients.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nome do Ingrediente *"
            placeholder="Ex: LEITE CONDENSADO, NINHO, FARINHA DE AMÊNDOAS..."
            value={ingrediente}
            onChange={(e) => setIngrediente(e.target.value)}
            required
          />

          <Input
            label="Tipo / Variação"
            placeholder="Ex: EM PÓ, INTEGRAL, CONFEITEIRO..."
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
        </div>

        <div>
          <Select
            label="Unidade na Balança *"
            value={unidadeMedida}
            onChange={(e) => setUnidadeMedida(e.target.value as 'g' | 'ml')}
          >
            <option value="g">Gramas (g) — Sólidos, Pós e Pastas</option>
            <option value="ml">Mililitros (ml) — Líquidos e Caldas</option>
          </Select>
        </div>

        {/* Equivalências de medidas caseiras */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
            <Sparkles className="h-3.5 w-3.5 text-brand-700" />
            <span>Equivalência das Medidas na sua Cozinha</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Preencha os pesos que você usa. Ao preencher a xícara, calculamos automaticamente 1/2, 1/3 e 1/4 para você!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label={`1 Xícara (${unidadeMedida})`}
              type="number"
              step="any"
              min="0.1"
              placeholder="Ex: 120"
              value={xicaraGrams}
              onChange={(e) => setXicaraGrams(e.target.value)}
            />

            <Input
              label={`1 Colher Sopa (${unidadeMedida})`}
              type="number"
              step="any"
              min="0.1"
              placeholder="Ex: 15"
              value={colherSopaGrams}
              onChange={(e) => setColherSopaGrams(e.target.value)}
            />

            <Input
              label={`1 Colher Chá (${unidadeMedida})`}
              type="number"
              step="any"
              min="0.1"
              placeholder="Ex: 5"
              value={colherChaGrams}
              onChange={(e) => setColherChaGrams(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Cadastrar Ingrediente
          </Button>
        </div>
      </form>
    </Modal>
  )
}
