'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import type { Ingredient, IngredientUnit } from '@/types/database'

const UNITS: IngredientUnit[] = ['g', 'kg', 'ml', 'L', 'un', 'cx', 'pct']
const CATEGORIES = [
  'Farinhas',
  'Açúcares',
  'Laticínios',
  'Chocolates',
  'Frutas',
  'Gorduras',
  'Fermentos',
  'Essências',
  'Embalagens',
  'Outros',
]

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Ingredient | null
}

export function IngredienteModal({ open, onClose, onSaved, editing }: Props) {
  const supabase = useSupabase()
  const { format } = useCurrency()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'Outros',
    unit: 'g' as IngredientUnit,
    quantity_purchased: '',
    cost_per_package: '',
    stock_quantity: '',
  })

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        category: editing.category,
        unit: editing.unit,
        quantity_purchased: String(editing.quantity_purchased),
        cost_per_package: String(editing.cost_per_package),
        stock_quantity: String(editing.stock_quantity),
      })
    } else {
      setForm({
        name: '',
        category: 'Outros',
        unit: 'g',
        quantity_purchased: '',
        cost_per_package: '',
        stock_quantity: '',
      })
    }
  }, [editing, open])

  const qty = parseFloat(form.quantity_purchased) || 0
  const cost = parseFloat(form.cost_per_package) || 0
  const costPerUnit = qty > 0 ? cost / qty : 0

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Informe o nome do ingrediente.')
    if (qty <= 0) return toast.error('A quantidade deve ser maior que zero.')
    if (cost <= 0) return toast.error('O custo deve ser maior que zero.')

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada.')

      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        quantity_purchased: qty,
        cost_per_package: cost,
        stock_quantity: parseFloat(form.stock_quantity) || 0,
      }

      if (editing) {
        const { error } = await supabase
          .from('ingredients')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        toast.success('Ingrediente atualizado!')
      } else {
        const { error } = await supabase.from('ingredients').insert(payload)
        if (error) throw error
        toast.success('Ingrediente cadastrado!')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar ingrediente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar ingrediente' : 'Novo ingrediente'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome"
          placeholder="Ex.: Farinha de trigo"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
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
          <Select
            label="Unidade"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value as IngredientUnit })}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Qtd. da embalagem (${form.unit})`}
            type="number"
            min="0"
            step="any"
            placeholder="Ex.: 1000"
            value={form.quantity_purchased}
            onChange={(e) => setForm({ ...form, quantity_purchased: e.target.value })}
          />
          <Input
            label="Custo da embalagem"
            type="number"
            min="0"
            step="any"
            placeholder="Ex.: 5.90"
            value={form.cost_per_package}
            onChange={(e) => setForm({ ...form, cost_per_package: e.target.value })}
          />
        </div>
        <Input
          label={`Estoque atual (${form.unit})`}
          type="number"
          min="0"
          step="any"
          placeholder="Opcional"
          value={form.stock_quantity}
          onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
        />

        <div className="rounded-lg bg-brand-50 p-4">
          <p className="text-sm text-brand-800">
            Custo por <strong>{form.unit}</strong>:{' '}
            <strong>{format(costPerUnit)}</strong>
          </p>
        </div>
      </div>
    </Modal>
  )
}
