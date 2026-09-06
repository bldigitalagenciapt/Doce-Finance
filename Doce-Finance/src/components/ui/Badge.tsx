import { cn } from '@/lib/utils'

type Tone = 'gray' | 'brand' | 'success' | 'warning' | 'danger' | 'blue' | 'purple'

const tones: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({
  children,
  tone = 'gray',
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
