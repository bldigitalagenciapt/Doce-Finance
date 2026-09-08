'use client'

import { useEffect, useState } from 'react'
import {
  Store,
  Coins,
  Lock,
  Check,
  CreditCard,
  Phone,
  Clock,
  FileDown,
  Settings,
  Mail,
  MapPin,
  Percent,
  CalendarClock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { useSupabase } from '@/hooks/useSupabase'
import { useAppStore } from '@/store/useAppStore'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { Currency, PixKeyType, Profile } from '@/types/database'

export default function ConfiguracoesPage() {
  const supabase = useSupabase()
  const profile = useAppStore((s) => s.profile)
  const setProfile = useAppStore((s) => s.setProfile)
  const currency = useAppStore((s) => s.currency)
  const setCurrency = useAppStore((s) => s.setCurrency)

  const [loading, setLoading] = useState(!profile)
  const [userEmail, setUserEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  const [form, setForm] = useState({
    business_name: '',
    full_name: '',
    brand_color: '',
    logo_url: '',
  })
  const [contact, setContact] = useState({
    phone: '',
    email_contact: '',
    address: '',
    business_hours: '',
  })
  const [prefs, setPrefs] = useState({
    default_margin_percent: 30,
    quote_validity_days: 7,
  })
  const [payment, setPayment] = useState({
    pix_key: '',
    pix_key_type: '' as PixKeyType | '',
    mbway_phone: '',
    payment_instructions: '',
  })
  const [password, setPassword] = useState({ next: '', confirm: '' })

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return setLoading(false)
      setUserEmail(user.email || '')
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        const p = data as Profile
        setProfile(p)
        applyProfile(p)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (profile) applyProfile(profile)
  }, [profile])

  function applyProfile(p: Profile) {
    setForm({
      business_name: p.business_name || '',
      full_name: p.full_name || '',
      brand_color: p.brand_color || '',
      logo_url: p.logo_url || '',
    })
    setContact({
      phone: p.phone || '',
      email_contact: p.email_contact || '',
      address: p.address || '',
      business_hours: p.business_hours || '',
    })
    setPrefs({
      default_margin_percent: p.default_margin_percent ?? 30,
      quote_validity_days: p.quote_validity_days ?? 7,
    })
    setPayment({
      pix_key: p.pix_key || '',
      pix_key_type: p.pix_key_type || '',
      mbway_phone: p.mbway_phone || '',
      payment_instructions: p.payment_instructions || '',
    })
  }

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessão expirada.'); return null }
    return user
  }

  const handleSaveProfile = async () => {
    const user = await getUser(); if (!user) return
    setSavingProfile(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        business_name: form.business_name || null,
        full_name: form.full_name || null,
        brand_color: form.brand_color || null,
        logo_url: form.logo_url || null,
      })
      .eq('id', user.id)
      .select('*')
      .single()
    setSavingProfile(false)
    if (error) return toast.error('Erro ao salvar perfil.')
    if (data) setProfile(data as Profile)
    toast.success('Perfil atualizado!')
  }

  const handleSaveContact = async () => {
    const user = await getUser(); if (!user) return
    setSavingContact(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        phone: contact.phone || null,
        email_contact: contact.email_contact || null,
        address: contact.address || null,
        business_hours: contact.business_hours || null,
      })
      .eq('id', user.id)
      .select('*')
      .single()
    setSavingContact(false)
    if (error) return toast.error('Erro ao salvar contato.')
    if (data) setProfile(data as Profile)
    toast.success('Informações de contato salvas!')
  }

  const handleSavePrefs = async () => {
    const user = await getUser(); if (!user) return
    const margin = Math.min(99, Math.max(0, prefs.default_margin_percent))
    const days = Math.max(1, prefs.quote_validity_days)
    setSavingPrefs(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        default_margin_percent: margin,
        quote_validity_days: days,
      })
      .eq('id', user.id)
      .select('*')
      .single()
    setSavingPrefs(false)
    if (error) return toast.error('Erro ao salvar preferências.')
    if (data) setProfile(data as Profile)
    toast.success('Preferências salvas!')
  }

  const handleSavePayment = async () => {
    const user = await getUser(); if (!user) return
    setSavingPayment(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        pix_key: payment.pix_key || null,
        pix_key_type: payment.pix_key_type || null,
        mbway_phone: payment.mbway_phone || null,
        payment_instructions: payment.payment_instructions || null,
      })
      .eq('id', user.id)
      .select('*')
      .single()
    setSavingPayment(false)
    if (error) return toast.error('Erro ao salvar formas de pagamento.')
    if (data) setProfile(data as Profile)
    toast.success('Formas de pagamento salvas!')
  }

  const handleChangeCurrency = async (c: Currency) => {
    if (c === currency) return
    setSavingCurrency(true)
    setCurrency(c)
    const user = await getUser()
    if (!user) { setSavingCurrency(false); return }
    const { data, error } = await supabase
      .from('profiles')
      .update({ currency: c })
      .eq('id', user.id)
      .select('*')
      .single()
    setSavingCurrency(false)
    if (error) { toast.error('Erro ao alterar moeda.'); return }
    if (data) setProfile(data as Profile)
    toast.success(`Moeda alterada para ${c === 'BRL' ? 'Real (R$)' : 'Euro (€)'}!`)
  }

  const handleChangePassword = async () => {
    if (password.next.length < 6) return toast.error('A senha deve ter ao menos 6 caracteres.')
    if (password.next !== password.confirm) return toast.error('As senhas não coincidem.')
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: password.next })
    setSavingPassword(false)
    if (error) return toast.error(error.message || 'Erro ao alterar senha.')
    setPassword({ next: '', confirm: '' })
    toast.success('Senha alterada com sucesso!')
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${profile?.id}-${Math.random()}.${fileExt}`
      setSavingProfile(true)
      const { error: uploadError } = await supabase.storage
        .from('atelier-images')
        .upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('atelier-images').getPublicUrl(filePath)
      setForm((prev) => ({ ...prev, logo_url: urlData.publicUrl }))
      toast.success('Logo enviada! Lembre-se de salvar as alterações.')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar imagem.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleExportData = async () => {
    const user = await getUser(); if (!user) return
    setExportingData(true)
    try {
      const [ingRes, recRes, cliRes, ordRes] = await Promise.all([
        supabase.from('ingredients').select('name, category, unit, quantity_purchased, cost_per_package, cost_per_unit, stock_quantity').eq('user_id', user.id),
        supabase.from('recipes').select('name, category, yield_quantity, yield_unit, ingredients_cost, extra_costs, total_cost, suggested_price, margin_percent').eq('user_id', user.id),
        supabase.from('clients').select('name, phone, email, address, total_spent, orders_count').eq('user_id', user.id),
        supabase.from('orders').select('order_number, status, delivery_date, subtotal, discount, total, paid_amount').eq('user_id', user.id).order('order_number', { ascending: false }),
      ])

      const wb = XLSX.utils.book_new()

      // Aba 1: Ingredientes
      const ingRows = (ingRes.data || []).map((r: any) => ({
        'Nome': r.name,
        'Categoria': r.category,
        'Unidade': r.unit,
        'Qtd Comprada': r.quantity_purchased,
        'Custo Embalagem (R$)': r.cost_per_package,
        'Custo por Unidade (R$)': r.cost_per_unit,
        'Estoque': r.stock_quantity,
      }))
      const wsIng = XLSX.utils.json_to_sheet(ingRows.length ? ingRows : [{}])
      XLSX.utils.book_append_sheet(wb, wsIng, 'Ingredientes')

      // Aba 2: Receitas
      const recRows = (recRes.data || []).map((r: any) => ({
        'Nome': r.name,
        'Categoria': r.category,
        'Rendimento': r.yield_quantity,
        'Unidade': r.yield_unit,
        'Custo Ingredientes': r.ingredients_cost,
        'Custos Extras': r.extra_costs,
        'Custo Total': r.total_cost,
        'Preço Sugerido': r.suggested_price,
        'Margem (%)': r.margin_percent,
      }))
      const wsRec = XLSX.utils.json_to_sheet(recRows.length ? recRows : [{}])
      XLSX.utils.book_append_sheet(wb, wsRec, 'Receitas')

      // Aba 3: Clientes (telefone forçado como texto)
      const cliRows = (cliRes.data || []).map((r: any) => ({
        'Nome': r.name,
        'Telefone': r.phone ? String(r.phone) : '',
        'E-mail': r.email,
        'Endereço': r.address,
        'Total Gasto': r.total_spent,
        'Pedidos': r.orders_count,
      }))
      const wsCli = XLSX.utils.json_to_sheet(cliRows.length ? cliRows : [{}])
      // Garante que coluna Telefone seja texto
      if (cliRows.length) {
        cliRows.forEach((_, i) => {
          const cell = wsCli[XLSX.utils.encode_cell({ r: i + 1, c: 1 })]
          if (cell) { cell.t = 's'; cell.z = '@' }
        })
      }
      XLSX.utils.book_append_sheet(wb, wsCli, 'Clientes')

      // Aba 4: Pedidos
      const ordRows = (ordRes.data || []).map((r: any) => ({
        'Nº Pedido': r.order_number,
        'Status': r.status,
        'Entrega': r.delivery_date ? r.delivery_date.toString().split('T')[0] : '',
        'Subtotal': r.subtotal,
        'Desconto': r.discount,
        'Total': r.total,
        'Valor Pago': r.paid_amount,
      }))
      const wsOrd = XLSX.utils.json_to_sheet(ordRows.length ? ordRows : [{}])
      XLSX.utils.book_append_sheet(wb, wsOrd, 'Pedidos')

      // Gera e faz download do arquivo .xlsx
      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `doce-finance-backup-${date}.xlsx`)
      toast.success('Dados exportados com sucesso!')
    } catch {
      toast.error('Erro ao exportar dados.')
    } finally {
      setExportingData(false)
    }
  }

  if (loading) return <PageSpinner />

  const currencies: { value: Currency; label: string; symbol: string; hint: string }[] = [
    { value: 'BRL', label: 'Real', symbol: 'R$', hint: 'Brasil · pt-BR' },
    { value: 'EUR', label: 'Euro', symbol: '€', hint: 'Portugal · pt-PT' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Ajuste os dados do seu atelier.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Dados do atelier ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Store className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Dados do atelier</h2>
          </div>
          <div className="space-y-4">
            {/* E-mail somente-leitura */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                E-mail da conta
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{userEmail || '—'}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Para alterar o e-mail contacte o suporte.</p>
            </div>
            <Input
              label="Nome do atelier"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />
            <Input
              label="Nome da confeiteira"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <Button onClick={handleSaveProfile} loading={savingProfile}>
              Salvar dados
            </Button>
          </div>
        </div>

        {/* ── Identidade Visual ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Store className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Identidade Visual</h2>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Personalize as cores e a logo do seu sistema e orçamentos.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Logo do Atelier</label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-12 w-12 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-gray-400">
                    <Store className="h-6 w-6" />
                  </div>
                )}
                <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <span>Escolher imagem</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={savingProfile}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cor da Marca</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brand_color || '#c4673e'}
                  onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                  className="h-10 w-20 cursor-pointer rounded border border-gray-300 p-1"
                />
                <span className="text-sm uppercase text-gray-500">
                  {form.brand_color || '#C4673E'}
                </span>
              </div>
            </div>
            <Button onClick={handleSaveProfile} loading={savingProfile}>
              Salvar identidade visual
            </Button>
          </div>
        </div>

        {/* ── Informações de contato ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Informações de contato</h2>
              <p className="text-xs text-gray-400">Aparecem nos orçamentos enviados aos clientes.</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input
              label="WhatsApp / Telefone"
              placeholder="+55 11 99999-9999"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            />
            <Input
              label="E-mail de contato"
              type="email"
              placeholder="seuemail@atelier.com"
              value={contact.email_contact}
              onChange={(e) => setContact({ ...contact, email_contact: e.target.value })}
            />
            <Input
              label="Cidade / Endereço"
              placeholder="São Paulo, SP"
              value={contact.address}
              onChange={(e) => setContact({ ...contact, address: e.target.value })}
            />
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 text-gray-400" /> Horário de atendimento
              </label>
              <Input
                placeholder="Ex.: Seg a Sex: 8h às 18h"
                value={contact.business_hours}
                onChange={(e) => setContact({ ...contact, business_hours: e.target.value })}
              />
            </div>
            <Button onClick={handleSaveContact} loading={savingContact}>
              Salvar contato
            </Button>
          </div>
        </div>

        {/* ── Preferências ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Preferências de negócio</h2>
              <p className="text-xs text-gray-400">Valores padrão usados automaticamente.</p>
            </div>
          </div>
          <div className="space-y-5">
            {/* Margem padrão */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Percent className="h-4 w-4 text-gray-400" /> Margem de lucro padrão
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    step="1"
                    value={prefs.default_margin_percent}
                    onChange={(e) => {
                      const v = Math.min(99, Math.max(0, Number(e.target.value)))
                      setPrefs({ ...prefs, default_margin_percent: v })
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
                value={prefs.default_margin_percent}
                onChange={(e) => setPrefs({ ...prefs, default_margin_percent: Number(e.target.value) })}
                className="w-full accent-brand-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                Pré-preenchida automaticamente ao criar uma nova receita.
              </p>
            </div>

            {/* Validade padrão dos orçamentos */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <CalendarClock className="h-4 w-4 text-gray-400" /> Validade padrão dos orçamentos
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={prefs.quote_validity_days}
                  onChange={(e) => setPrefs({ ...prefs, quote_validity_days: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-500">dias após a criação</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Orçamentos expiram automaticamente após este prazo.
              </p>
            </div>

            <Button onClick={handleSavePrefs} loading={savingPrefs}>
              Salvar preferências
            </Button>
          </div>
        </div>

        {/* ── Moeda ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Coins className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Moeda</h2>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Escolha a moeda usada em todos os cálculos e telas.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {currencies.map((c) => {
              const active = currency === c.value
              return (
                <button
                  key={c.value}
                  onClick={() => handleChangeCurrency(c.value)}
                  disabled={savingCurrency}
                  className={cn(
                    'relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-colors',
                    active
                      ? 'border-brand-700 bg-brand-50'
                      : 'border-gray-200 hover:border-brand-300',
                  )}
                >
                  {active && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span className="text-2xl font-bold text-brand-700">{c.symbol}</span>
                  <span className="font-medium text-gray-900">{c.label}</span>
                  <span className="text-xs text-gray-400">{c.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Exportar dados ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Exportar dados</h2>
              <p className="text-xs text-gray-400">Faça backup de todos os seus dados.</p>
            </div>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Exporta todos os seus ingredientes, receitas, clientes e pedidos num ficheiro
            CSV (compatível com Excel e Google Sheets).
          </p>
          <Button variant="outline" onClick={handleExportData} loading={exportingData}>
            <FileDown className="h-4 w-4" />
            Exportar todos os dados (.xlsx)
          </Button>
        </div>

        {/* ── Formas de pagamento ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Formas de pagamento</h2>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Estes dados aparecem no orçamento público que você envia aos clientes. A chave Pix
            gera automaticamente um QR Code para pagamento.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de chave Pix"
              value={payment.pix_key_type}
              onChange={(e) =>
                setPayment({ ...payment, pix_key_type: e.target.value as PixKeyType | '' })
              }
            >
              <option value="">Selecione…</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="telefone">Telefone</option>
              <option value="aleatoria">Chave aleatória</option>
            </Select>
            <Input
              label="Chave Pix"
              placeholder="Sua chave Pix"
              value={payment.pix_key}
              onChange={(e) => setPayment({ ...payment, pix_key: e.target.value })}
            />
            <div>
              <Input
                label="Telefone Mbway"
                placeholder="+351 912 345 678"
                value={payment.mbway_phone}
                onChange={(e) => setPayment({ ...payment, mbway_phone: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-400">Para clientes portugueses (opcional)</p>
            </div>
          </div>
          <div className="mt-4">
            <Textarea
              label="Instruções de pagamento"
              rows={3}
              placeholder="Ex.: Sinal de 50% para confirmar o pedido. Restante na entrega."
              value={payment.payment_instructions}
              onChange={(e) => setPayment({ ...payment, payment_instructions: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleSavePayment} loading={savingPayment}>
              Salvar pagamento
            </Button>
          </div>
        </div>

        {/* ── Trocar senha ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Trocar senha</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nova senha"
              type="password"
              placeholder="••••••••"
              value={password.next}
              onChange={(e) => setPassword({ ...password, next: e.target.value })}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              placeholder="••••••••"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleChangePassword} loading={savingPassword}>
              Alterar senha
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
