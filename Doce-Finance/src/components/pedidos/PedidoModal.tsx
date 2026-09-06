'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { ORDER_STATUS_LIST } from '@/lib/orderStatus'
import type { Client, Order, OrderStatus, Recipe } from '@/types/database'

interface ItemRow {
  recipe_id: string
  name: string
  quantity: string
  unit_price: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Order | null
}

export function PedidoModal({ open, onClose, onSaved, editing }: Props) {
  const supabase = useSupabase()
  const { format } = useCurrency()
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])

  const [form, setForm] = useState({
    client_id: '',
    status: 'orcamento' as OrderStatus,
    delivery_date: '',
    delivery_time: '',
    discount: '',
    notes: '',
  })
  const [items, setItems] = useState<ItemRow[]>([])

  useEffect(() => {
    if (!open) return
    async function loadRefs() {
      const [cRes, rRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('recipes').select('*').order('name'),
      ])
      setClients((cRes.data as Client[]) || [])
      setRecipes((rRes.data as Recipe[]) || [])
    }
    loadRefs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    async function loadOrder() {
      if (editing) {
        setForm({
          client_id: editing.client_id || '',
          status: editing.status,
          delivery_date: editing.delivery_date || '',
          delivery_time: editing.delivery_time ? editing.delivery_time.slice(0, 5) : '',
          discount: String(editing.discount || ''),
          notes: editing.notes || '',
        })
        const { data } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', editing.id)
        setItems(
          (data || []).map((it: any) => ({
            recipe_id: it.recipe_id || '',
            name: it.name,
            quantity: String(it.quantity),
            unit_price: String(it.unit_price),
          })),
        )
      } else {
        setForm({
          client_id: '',
          status: 'orcamento',
          delivery_date: '',
          delivery_time: '',
          discount: '',
          notes: '',
        })
        setItems([])
      }
    }
    if (open) loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open])

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, it) =>
          sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
        0,
      ),
    [items],
  )
  const discount = parseFloat(form.discount) || 0
  const total = Math.max(0, subtotal - discount)

  const addItem = () =>
    setItems([...items, { recipe_id: '', name: '', quantity: '1', unit_price: '' }])

  const onRecipeChange = (idx: number, recipeId: string) => {
    const next = [...items]
    const recipe = recipes.find((r) => r.id === recipeId)
    next[idx].recipe_id = recipeId
    if (recipe) {
      next[idx].name = recipe.name
      if (!next[idx].unit_price) next[idx].unit_price = String(recipe.suggested_price)
    }
    setItems(next)
  }

  const handleSave = async () => {
    if (items.length === 0) return toast.error('Adicione ao menos um item.')
    if (items.some((it) => !it.name.trim()))
      return toast.error('Informe o nome de todos os itens.')

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada.')

      const orderPayload = {
        user_id: user.id,
        client_id: form.client_id || null,
        status: form.status,
        delivery_date: form.delivery_date || null,
        delivery_time: form.delivery_time || null,
        discount,
        notes: form.notes || null,
      }

      let oid = editing?.id
      if (oid) {
        const { error } = await supabase.from('orders').update(orderPayload).eq('id', oid)
        if (error) throw error
        await supabase.from('order_items').delete().eq('order_id', oid)
      } else {
        const { data, error } = await supabase
          .from('orders')
          .insert(orderPayload)
          .select('id')
          .single()
        if (error) throw error
        oid = data.id
      }

      const itemsPayload = items
        .filter((it) => it.name.trim())
        .map((it) => ({
          order_id: oid,
          recipe_id: it.recipe_id || null,
          name: it.name.trim(),
          quantity: parseFloat(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
        }))

      const { error: itErr } = await supabase.from('order_items').insert(itemsPayload)
      if (itErr) throw itErr

      toast.success(editing ? 'Pedido atualizado!' : 'Pedido criado!')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar pedido.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Pedido #${editing.order_number}` : 'Novo pedido'}
      size="xl"
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
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Cliente"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          >
            <option value="">Selecione um cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}
          >
            {ORDER_STATUS_LIST.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Input
            label="Data de entrega"
            type="date"
            value={form.delivery_date}
            onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
          />
          <Input
            label="Hora de entrega"
            type="time"
            value={form.delivery_time}
            onChange={(e) => setForm({ ...form, delivery_time: e.target.value })}
          />
        </div>

        {/* Itens */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Itens do pedido</label>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4" />
              Adicionar item
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
              Nenhum item adicionado.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 items-end gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <Select
                      value={it.recipe_id}
                      onChange={(e) => onRecipeChange(idx, e.target.value)}
                    >
                      <option value="">Produto avulso</option>
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                    {!it.recipe_id && (
                      <input
                        placeholder="Nome do item"
                        value={it.name}
                        onChange={(e) => {
                          const next = [...items]
                          next[idx].name = e.target.value
                          setItems(next)
                        }}
                        className="mt-2 h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    )}
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="mb-1 block text-xs text-gray-400">Qtd</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => {
                        const next = [...items]
                        next[idx].quantity = e.target.value
                        setItems(next)
                      }}
                      className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <label className="mb-1 block text-xs text-gray-400">Preço unit.</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={it.unit_price}
                      onChange={(e) => {
                        const next = [...items]
                        next[idx].unit_price = e.target.value
                        setItems(next)
                      }}
                      className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {format(
                        (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
                      )}
                    </span>
                    <button
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Textarea
            label="Observações"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="space-y-2 rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">{format(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Desconto</span>
              <div className="w-28">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-brand-700">{format(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
