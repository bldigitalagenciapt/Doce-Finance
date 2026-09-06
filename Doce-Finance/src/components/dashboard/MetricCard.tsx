import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'brand' | 'green' | 'blue' | 'amber'
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
