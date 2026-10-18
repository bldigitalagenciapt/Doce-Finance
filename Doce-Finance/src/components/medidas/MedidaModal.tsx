'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MeasurementRow } from '@/lib/measurementsData'
import toast from 'react-hot-toast'

interface MedidaModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<MeasurementRow, 'id'>) => void
  initialData?: MeasurementRow | null
}

const COMMON_CONVERSIONS = [
  'XÍCARA',
  'COLHER SOPA',
  'COLHER CHÁ',
  'COLHER SOBREMESA',
  'COPO AMERICANO (190ML)',
  'COPO (240ML)',
  'UNIDADE',
  'GEMA',
  'CLARA',
  'PITADA',
]

export function MedidaModal({
  open,
  onClose,
  onSave,
  initialData,
}: MedidaModalProps) {
  const [ingrediente, setIngrediente] = useState('')
  const [tipo, setTipo] = useState('')
  const [conversao, setConversao] = useState('XÍCARA')
  const [quantidade, setQuantidade] = useState('1')
  const [gramasMl, setGramasMl] = useState('')
  const [unidadeMedida, setUnidadeMedida] = useState<'g' | 'ml'>('g')

  useEffect(() => {
    if (initialData) {
      setIngrediente(initialData.ingrediente)
      setTipo(initialData.tipo)
      setConversao(initialData.conversao)
      setQuantidade(initialData.quantidade)
      setGramasMl(String(initialData.gramasMl))
      setUnidadeMedida(initialData.unidadeMedida)
    } else {
      setIngrediente('')
      setTipo('NORMAL')
      setConversao('XÍCARA')
      setQuantidade('1')
      setGramasMl('')
      setUnidadeMedida('g')
    }
  }, [initialData, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ingrediente.trim()) {
      toast.error('Informe o nome do ingrediente')
      return
    }
    const valorNum = parseFloat(gramasMl.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error('Informe um valor válido em gramas ou ml')
      return
    }

    onSave({
      ingrediente: ingrediente.toUpperCase().trim(),
      tipo: (tipo || 'NORMAL').toUpperCase().trim(),
      conversao: conversao.toUpperCase().trim(),
      quantidade: quantidade.trim() || '1',
      gramasMl: valorNum,
      unidadeMedida,
      isCustom: true,
    })

    toast.success(initialData ? 'Medida atualizada!' : 'Medida cadastrada!')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? 'Editar Medida Culinária' : 'Nova Medida Culinária'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500">
          Defina quanto pesa esta medida caseira na sua balança para padronizar suas receitas.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Ingrediente *"
            placeholder="Ex: FARINHA, AÇÚCAR, LEITE NINHO..."
            value={ingrediente}
            onChange={(e) => setIngrediente(e.target.value)}
            required
          />

          <Input
            label="Tipo / Variação"
            placeholder="Ex: TRIGO, REFINADO, CONFEITEIRO, EM PÓ..."
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Medida Caseira *
            </label>
            <input
              list="conversoes-sugestoes"
              value={conversao}
              onChange={(e) => setConversao(e.target.value)}
              placeholder="Ex: XÍCARA, COLHER SOPA..."
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 uppercase"
              required
            />
            <datalist id="conversoes-sugestoes">
              {COMMON_CONVERSIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <Input
            label="Quantidade da Medida *"
            placeholder="Ex: 1, 1/2, 1/3, 1/4, 2..."
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Peso ou Volume Equivalente *"
            type="number"
            step="any"
            min="0.1"
            placeholder="Ex: 120"
            value={gramasMl}
            onChange={(e) => setGramasMl(e.target.value)}
            required
          />

          <Select
            label="Unidade na Balança *"
            value={unidadeMedida}
            onChange={(e) => setUnidadeMedida(e.target.value as 'g' | 'ml')}
          >
            <option value="g">Gramas (g) — Sólidos / Pós</option>
            <option value="ml">Mililitros (ml) — Líquidos</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Salvar Alterações' : 'Cadastrar Medida'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
