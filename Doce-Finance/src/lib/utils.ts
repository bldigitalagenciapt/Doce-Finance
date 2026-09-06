import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Concatena classes condicionalmente (mini clsx). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Formata uma data (Date ou ISO string) em dd/MM/yyyy. */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  try {
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

/** Formata data e hora. */
export function formatDateTime(
  date: string | Date | null | undefined,
  time?: string | null,
): string {
  const base = formatDate(date)
  if (base === '—') return base
  return time ? `${base} às ${time.slice(0, 5)}` : base
}

/** Formata data por extenso: 23 de agosto de 2026. */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  try {
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return '—'
  }
}
