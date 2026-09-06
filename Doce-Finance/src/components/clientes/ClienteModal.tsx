'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useSupabase } from '@/hooks/useSupabase'
import type { Client } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Client | null
}

export function ClienteModal({ open, onClose, onSaved, editing }: Props) {
  const supabase = useSupabase()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        phone: editing.phone || '',
        email: editing.email || '',
        address: editing.address || '',
        notes: editing.notes || '',
      })
    } else {
      setForm({ name: '', phone: '', email: '', address: '', notes: '' })
    }
  }, [editing, open])

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Informe o nome do cliente.')
    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada.')

      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
      }

      if (editing) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Cliente atualizado!')
      } else {
        const { error } = await supabase.from('clients').insert(payload)
        if (error) throw error
        toast.success('Cliente cadastrado!')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar cliente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cliente' : 'Novo cliente'}
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
          placeholder="Nome do cliente"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="email@exemplo.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <Input
          label="Endereço"
          placeholder="Rua, número, bairro"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <Textarea
          label="Observações"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
    </Modal>
  )
}
