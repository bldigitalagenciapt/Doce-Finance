'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useSupabase } from '@/hooks/useSupabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('Preencha e-mail e senha.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        toast.success('Bem-vinda de volta!')
        router.push('/dashboard')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.fullName } },
        })
        if (error) throw error
        toast.success('Conta criada! Você já pode entrar.')
        setMode('login')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Ocorreu um erro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel ilustrativo */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <ChefHat className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">Doce Finance</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Gestão completa para o seu negócio
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            Controle ingredientes, precifique receitas com precisão, gerencie clientes,
            pedidos e a sua agenda — tudo em um só lugar.
          </p>
        </div>
        <p className="text-sm text-brand-200">© 2026 Doce Finance</p>
      </div>

      {/* Formulário */}
      <div className="flex w-full items-center justify-center bg-surface p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-gray-900">Doce Finance</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {mode === 'login'
              ? 'Acesse o painel da sua empresa.'
              : 'Comece a organizar o seu negócio agora.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <Input
                id="fullName"
                label="Nome completo"
                placeholder="Ana Confeiteira"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            )}
            <Input
              id="email"
              type="email"
              label="E-mail"
              placeholder="voce@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              id="password"
              type="password"
              label="Senha"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Button type="submit" className="w-full" loading={loading} size="lg">
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-brand-700 hover:underline"
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
