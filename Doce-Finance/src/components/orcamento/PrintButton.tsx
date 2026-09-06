'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg border border-[#7C4A35] bg-white px-4 py-2 text-sm font-medium text-[#7C4A35] transition-colors hover:bg-[#7C4A35] hover:text-white"
    >
      <Printer className="h-4 w-4" />
      Imprimir / Salvar PDF
    </button>
  )
}
