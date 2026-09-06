import { cn } from '@/lib/utils'

export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-card',
        className,
      )}
    >
      {children}
    </div>
  )
}
