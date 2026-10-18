'use client'

import { useState } from 'react'
import { useMeasurements } from '@/hooks/useMeasurements'
import { TabelaMedidas } from '@/components/medidas/TabelaMedidas'
import { Sparkles, ChefHat, Info, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MedidasPage() {
  const {
    measurements,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    resetToDefaults,
    exportToExcel,
  } = useMeasurements()

  const [showGuide, setShowGuide] = useState(false)

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Tabela de Equivalências & Medidas
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 border border-brand-200/60">
              <Sparkles className="h-3 w-3" />
              Precisão Culinária
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Converta medidas caseiras (xícaras, colheres) em gramas (g) ou mililitros (ml) para padronizar e precificar suas receitas.
          </p>
        </div>

        {/* Botão Guia do Confeiteiro */}
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="no-print inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:border-brand-300 hover:bg-brand-50/50 transition-colors self-start sm:self-auto"
        >
          <ChefHat className="h-4 w-4 text-brand-700" />
          <span>{showGuide ? 'Ocultar Guia de Equivalências' : 'Equivalências Padrão (Guia)'}</span>
          {showGuide ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </button>
      </div>

      {/* Guia Educativo do Chef Confeiteiro (Retrátil) */}
      {showGuide && (
        <div className="no-print rounded-xl border border-brand-200 bg-brand-50/40 p-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
              <div>
                <h4 className="text-sm font-bold text-brand-900 mb-1">
                  O Segredo da Confeitaria Profissional: A Balança
                </h4>
                <p>
                  Na confeitaria, precisão é tudo! Uma receita feita em xícaras varia facilmente de <strong>100g a 140g</strong> dependendo de como a farinha é nivelada na xícara. Essa variação muda a textura do bolo, altera o rendimento e faz você perder dinheiro no custo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-brand-200/60 font-medium text-gray-800">
                <div className="rounded-lg bg-white p-2.5 border border-brand-200/40">
                  <span className="block text-brand-700 font-bold">1 Xícara de Chá</span>
                  <span>= 240 ml (capacidade)</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-brand-200/40">
                  <span className="block text-brand-700 font-bold">1 Colher de Sopa</span>
                  <span>= 15 ml</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-brand-200/40">
                  <span className="block text-brand-700 font-bold">1 Colher de Sobremesa</span>
                  <span>= 10 ml</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-brand-200/40">
                  <span className="block text-brand-700 font-bold">1 Colher de Chá</span>
                  <span>= 5 ml</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 pt-1">
                💡 <strong>Dica do Chef:</strong> Você pode clicar no botão <strong>✏️ Editar</strong> em qualquer linha da tabela abaixo para ajustar o peso exato de acordo com as xícaras e colheres medidoras da sua própria cozinha!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Medidas Completa com CRUD */}
      <div>
        <TabelaMedidas
          measurements={measurements}
          onAdd={addMeasurement}
          onUpdate={updateMeasurement}
          onDelete={deleteMeasurement}
          onResetDefaults={resetToDefaults}
          onExportExcel={exportToExcel}
          onSelectRow={(row) => {
            navigator.clipboard.writeText(`${row.gramasMl}`)
            toast.success(`${row.ingrediente} (${row.conversao}): ${row.gramasMl}${row.unidadeMedida} copiado!`)
          }}
        />
      </div>
    </div>
  )
}
