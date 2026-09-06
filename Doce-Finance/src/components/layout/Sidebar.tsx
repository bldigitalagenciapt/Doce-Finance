'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  BookOpen,
  Calculator,
  Users,
  ShoppingBag,
  FileText,
  Calendar,
  Settings,
  ChefHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ingredientes', label: 'Ingredientes', icon: Package },
  { href: '/receitas', label: 'Receitas', icon: BookOpen },
  { href: '/calculadora', label: 'Calculadora', icon: Calculator },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white">
          <ChefHat className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900">Doce Finance</p>
          <p className="text-xs text-gray-400">Gestão Inteligente</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-700 text-white'
                  : 'text-gray-600 hover:bg-brand-50 hover:text-brand-800',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <p className="text-center text-xs text-gray-400">Doce Finance © 2026</p>
      </div>
    </div>
  )
}
