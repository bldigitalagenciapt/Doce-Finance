'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  FileSpreadsheet,
  Printer,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Pencil,
  Scale,
} from 'lucide-react'
import { MeasurementRow } from '@/lib/measurementsData'
import { MedidaModal } from './MedidaModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'

interface TabelaMedidasProps {
  measurements: MeasurementRow[]
  onAdd: (item: Omit<MeasurementRow, 'id'>) => void
  onUpdate: (id: string, item: Partial<MeasurementRow>) => void
  onDelete: (id: string) => void
  onResetDefaults: () => void
  onExportExcel: () => void
  onSelectRow?: (row: MeasurementRow) => void
}

export function TabelaMedidas({
  measurements,
  onAdd,
  onUpdate,
  onDelete,
  onResetDefaults,
  onExportExcel,
  onSelectRow,
}: TabelaMedidasProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TODOS')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Estado para Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MeasurementRow | null>(null)

  // Estado para Confirmação de Exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Estado para Confirmação de Restaurar Padrões
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // Categorias para filtro rápido extraídas da base de medidas
  const categories = useMemo(() => {
    const list = Array.from(new Set(measurements.map((m) => m.ingrediente))).sort()
    return ['TODOS', ...list]
  }, [measurements])

  // Filtro de busca e categoria
  const filteredRows = useMemo(() => {
    return measurements.filter((row) => {
      // Filtro categoria
      if (selectedCategory !== 'TODOS' && row.ingrediente !== selectedCategory) {
        return false
      }

      // Filtro texto
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        row.ingrediente.toLowerCase().includes(q) ||
        row.conversao.toLowerCase().includes(q) ||
        row.tipo.toLowerCase().includes(q) ||
        row.quantidade.toLowerCase().includes(q) ||
        String(row.gramasMl).includes(q)
      )
    })
  }, [measurements, selectedCategory, search])

  const handleCopy = (row: MeasurementRow) => {
    navigator.clipboard.writeText(`${row.gramasMl}`)
    setCopiedId(row.id)
    toast.success(`${row.gramasMl}${row.unidadeMedida} copiado!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSaveModal = (data: Omit<MeasurementRow, 'id'>) => {
    if (editingItem) {
      onUpdate(editingItem.id, data)
    } else {
      onAdd(data)
    }
  }

  const handleConfirmDelete = () => {
    if (deletingId) {
      onDelete(deletingId)
      toast.success('Medida excluída.')
      setDeletingId(null)
    }
  }

  const handleConfirmReset = () => {
    onResetDefaults()
    toast.success('Tabela restaurada para os padrões originais!')
    setResetDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações Superior (oculta na impressão) */}
      <div className="no-print flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ingrediente, medida (xícara, colher), tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            className="flex items-center gap-1.5 text-xs"
            title="Baixar planilha Excel"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs"
            title="Imprimir em folha A4"
          >
            <Printer className="h-4 w-4 text-gray-600" />
            <span>Imprimir</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs text-gray-600"
            title="Restaurar lista padrão original da planilha"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Padrão</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Medida</span>
          </Button>
        </div>
      </div>

      {/* Pílulas de filtro rápido por ingrediente */}
      <div className="no-print flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500 mr-1">Filtrar por:</span>
        {categories.slice(0, 10).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-brand-700 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:bg-brand-50/50'
            }`}
          >
            {cat}
          </button>
        ))}
        {selectedCategory !== 'TODOS' && (
          <button
            type="button"
            onClick={() => setSelectedCategory('TODOS')}
            className="flex items-center gap-1 text-xs text-brand-700 hover:underline ml-2"
          >
            <RotateCcw className="h-3 w-3" />
            Limpar filtro
          </button>
        )}
      </div>

      {/* Tabela Principal estilizada com a identidade visual da confeitaria */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        {/* Cabeçalho da Tabela com a Cor da Marca */}
        <div className="bg-brand-700 px-6 py-3.5 text-center text-white">
          <h2 className="text-base font-extrabold tracking-wider uppercase sm:text-lg">
            Tabela de Equivalências & Medidas Culinárias
          </h2>
          <p className="text-xs font-medium text-brand-100">
            Valores de referência para padronização e pesagem na balança
          </p>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3 text-center w-24">QUANTIDADE</th>
                <th className="px-4 py-3">MEDIDA CASEIRA</th>
                <th className="px-4 py-3">INGREDIENTE</th>
                <th className="px-4 py-3">TIPO / VARIAÇÃO</th>
                <th className="px-4 py-3 text-right font-black">PESO NA BALANÇA</th>
                <th className="no-print px-4 py-3 text-center w-28">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Scale className="h-8 w-8 text-gray-300" />
                      <p className="font-medium text-gray-600">Nenhuma medida encontrada.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearch('')
                          setSelectedCategory('TODOS')
                        }}
                      >
                        Limpar busca
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isEven = idx % 2 === 0
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onSelectRow && onSelectRow(row)}
                      className={`transition-colors hover:bg-brand-50/40 ${
                        isEven ? 'bg-white' : 'bg-gray-50/40'
                      } ${onSelectRow ? 'cursor-pointer' : ''}`}
                    >
                      {/* Quantidade */}
                      <td className="px-4 py-3 text-center font-bold text-gray-900">
                        <span className="inline-block rounded-md bg-brand-50 px-2 py-0.5 text-xs text-brand-800 border border-brand-200/60 font-mono">
                          {row.quantidade}
                        </span>
                      </td>

                      {/* Medida Caseira */}
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {row.conversao}
                      </td>

                      {/* Ingrediente */}
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {row.ingrediente}
                        {row.isCustom && (
                          <Badge tone="brand" className="ml-2 text-[10px]">
                            Personalizado
                          </Badge>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3 text-gray-600">
                        <span className="text-xs uppercase text-gray-600 font-medium">
                          {row.tipo}
                        </span>
                      </td>

                      {/* Gramas / ML */}
                      <td className="px-4 py-3 text-right font-black text-brand-800 text-sm sm:text-base">
                        {row.gramasMl}{' '}
                        <span className="text-xs font-semibold text-gray-500">
                          {row.unidadeMedida}
                        </span>
                      </td>

                      {/* Ações: Editar, Copiar, Excluir */}
                      <td className="no-print px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Botão Editar */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingItem(row)
                              setModalOpen(true)
                            }}
                            title="Editar esta medida"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Botão Copiar */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(row)
                            }}
                            title="Copiar valor"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                          >
                            {copiedId === row.id ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          {/* Botão Excluir */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingId(row.id)
                            }}
                            title="Excluir medida"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-danger transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela com contagem e dica */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 sm:flex-row">
          <span>
            Mostrando <strong>{filteredRows.length}</strong> de{' '}
            <strong>{measurements.length}</strong> medidas cadastradas
          </span>
          <span className="text-[11px] text-gray-500">
            Dica: Clique no lápis ✏️ para ajustar qualquer peso conforme as xícaras e colheres da sua cozinha.
          </span>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      <MedidaModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingItem(null)
        }}
        onSave={handleSaveModal}
        initialData={editingItem}
      />

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir medida"
        message="Tem certeza que deseja remover esta medida da sua tabela?"
        confirmLabel="Sim, excluir"
      />

      {/* Confirmação de Restaurar Padrões */}
      <ConfirmDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        title="Restaurar tabela original"
        message="Deseja restaurar todas as medidas para a tabela padrão original da confeitaria? Quaisquer edições personalizadas serão redefinidas."
        confirmLabel="Sim, restaurar"
      />
    </div>
  )
}
