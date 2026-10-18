'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Trash2, Plus, Pencil } from 'lucide-react'
import { MeasurementRow } from '@/lib/measurementsData'
import toast from 'react-hot-toast'

interface EditarIngredienteModalProps {
  open: boolean
  onClose: () => void
  ingredientName: string
  measurements: MeasurementRow[]
  onRename: (oldName: string, newName: string) => void
  onDeleteIngredient: (name: string) => void
  onAddMeasure: (item: Omit<MeasurementRow, 'id'>) => void
}

export function EditarIngredienteModal({
  open,
  onClose,
  ingredientName,
  measurements,
  onRename,
  onDeleteIngredient,
  onAddMeasure,
}: EditarIngredienteModalProps) {
  const [newName, setNewName] = useState(ingredientName)
  const [showAddMeasure, setShowAddMeasure] = useState(false)

  // Campos para adicionar nova medida neste ingrediente
  const [conversao, setConversao] = useState('COLHER SOPA')
  const [quantidade, setQuantidade] = useState('1')
  const [gramasMl, setGramasMl] = useState('')
  const [tipo, setTipo] = useState('NORMAL')
  const [unidade, setUnidade] = useState<'g' | 'ml'>('g')

  // Medidas existentes deste ingrediente
  const relatedMeasures = measurements.filter((m) => m.ingrediente === ingredientName)

  useEffect(() => {
    if (open) {
      setNewName(ingredientName)
      setShowAddMeasure(false)
      const first = relatedMeasures[0]
      if (first) {
        setTipo(first.tipo)
        setUnidade(first.unidadeMedida)
      }
    }
  }, [open, ingredientName, relatedMeasures])

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formatted = newName.toUpperCase().trim()
    if (!formatted) {
      toast.error('Informe um nome válido')
      return
    }
    if (formatted === ingredientName) {
      onClose()
      return
    }
    onRename(ingredientName, formatted)
    toast.success(`Ingrediente renomeado para ${formatted}!`)
    onClose()
  }

  const handleAddMeasureSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(gramasMl.replace(',', '.'))
    if (!num || num <= 0) {
      toast.error('Informe um peso ou volume válido')
      return
    }

    onAddMeasure({
      ingrediente: ingredientName,
      tipo: (tipo || 'NORMAL').toUpperCase().trim(),
      conversao: conversao.toUpperCase().trim(),
      quantidade: quantidade.trim() || '1',
      gramasMl: num,
      unidadeMedida: unidade,
      isCustom: true,
    })

    toast.success('Nova medida adicionada para este ingrediente!')
    setGramasMl('')
    setShowAddMeasure(false)
  }

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja remover o ingrediente "${ingredientName}" e todas as suas medidas?`)) {
      onDeleteIngredient(ingredientName)
      toast.success(`Ingrediente ${ingredientName} removido da lista.`)
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Gerenciar Ingrediente: ${ingredientName}`}
    >
      <div className="space-y-5">
        {/* Formulário de Renomear */}
        <form onSubmit={handleRenameSubmit} className="space-y-3">
          <Input
            label="Renomear Ingrediente"
            placeholder="Ex: FARINHA DE TRIGO ESPECIAL"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="submit" size="sm" className="flex items-center gap-1.5 text-xs">
              <Pencil className="h-3.5 w-3.5" />
              Salvar Nome
            </Button>
          </div>
        </form>

        {/* Medidas cadastradas para este ingrediente */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Medidas deste Ingrediente ({relatedMeasures.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddMeasure(!showAddMeasure)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              <Plus className="h-3.5 w-3.5" />
              {showAddMeasure ? 'Cancelar' : 'Adicionar Outra Medida'}
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-xs">
            {relatedMeasures.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 border border-gray-100"
              >
                <span className="font-medium text-gray-800">
                  {m.quantidade} {m.conversao} ({m.tipo})
                </span>
                <span className="font-bold text-brand-800">
                  {m.gramasMl} {m.unidadeMedida}
                </span>
              </div>
            ))}
          </div>

          {/* Form inline para adicionar nova medida a este ingrediente */}
          {showAddMeasure && (
            <form onSubmit={handleAddMeasureSubmit} className="mt-3 pt-3 border-t border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Medida (Ex: XÍCARA, COLHER)"
                  value={conversao}
                  onChange={(e) => setConversao(e.target.value)}
                  required
                />
                <Input
                  label="Qtd (Ex: 1, 1/2, 2)"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label={`Peso (${unidade})`}
                  type="number"
                  step="any"
                  placeholder="Ex: 80"
                  value={gramasMl}
                  onChange={(e) => setGramasMl(e.target.value)}
                  required
                />
                <Select
                  label="Unidade"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value as 'g' | 'ml')}
                >
                  <option value="g">Gramas (g)</option>
                  <option value="ml">Mililitros (ml)</option>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" className="text-xs">
                  Salvar Nova Medida
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Zona de Perigo: Excluir ingrediente inteiro */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Ingrediente da Lista
          </button>

          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
