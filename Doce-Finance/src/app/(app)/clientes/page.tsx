'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users, Plus, Search, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSupabase } from '@/hooks/useSupabase'
import { useCurrency } from '@/hooks/useCurrency'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClienteModal } from '@/components/clientes/ClienteModal'
import type { Client } from '@/types/database'

export default function ClientesPage() {
  const supabase = useSupabase()
  const { format } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })
    if (error) toast.error('Erro ao carregar clientes.')
    setClients((data as Client[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(
    () =>
      clients.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [clients, search],
  )

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    const { error } = await supabase.from('clients').delete().eq('id', deleting.id)
    setDeleteLoading(false)
    if (error) {
      toast.error('Não foi possível excluir o cliente.')
    } else {
      toast.success('Cliente excluído.')
      setDeleting(null)
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">Sua base de clientes e histórico de compras.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado ainda"
          description="Cadastre seus clientes para vincular aos pedidos."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Cadastrar cliente
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Contato</TH>
              <TH>Pedidos</TH>
              <TH>Total gasto</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-gray-900">{c.name}</TD>
                <TD>
                  <div className="space-y-0.5 text-xs text-gray-500">
                    {c.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {c.email}
                      </div>
                    )}
                    {!c.phone && !c.email && '—'}
                  </div>
                </TD>
                <TD>{c.orders_count}</TD>
                <TD className="font-semibold text-gray-900">{format(c.total_spent)}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditing(c)
                        setModalOpen(true)
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(c)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        message={`Excluir "${deleting?.name}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
