'use client'

import { Modal } from '@/components/ui/Modal'
import { ConversorCalculadora } from './ConversorCalculadora'
import { useMeasurements } from '@/hooks/useMeasurements'

interface ConversorModalProps {
  open: boolean
  onClose: () => void
  onApplyValue: (gramsMl: number) => void
  initialIngredientName?: string
}

export function ConversorModal({
  open,
  onClose,
  onApplyValue,
  initialIngredientName,
}: ConversorModalProps) {
  const {
    measurements,
    addIngredientWithMeasures,
    renameIngredient,
    deleteIngredient,
    addMeasurement,
  } = useMeasurements()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conversor de Medidas para Gramas/ML"
      size="lg"
    >
      <div className="space-y-4">
        {initialIngredientName && (
          <div className="flex items-center gap-2 rounded-lg border border-brand-200/60 bg-brand-50/50 px-3.5 py-2 text-xs text-gray-600">
            <span>Convertendo medida para:</span>
            <strong className="font-semibold text-brand-900">{initialIngredientName}</strong>
          </div>
        )}
        <ConversorCalculadora
          measurements={measurements}
          onUseValue={(gramsMl) => {
            onApplyValue(gramsMl)
            onClose()
          }}
          onAddIngredientWithMeasures={addIngredientWithMeasures}
          onRenameIngredient={renameIngredient}
          onDeleteIngredient={deleteIngredient}
          onAddSingleMeasure={addMeasurement}
        />
      </div>
    </Modal>
  )
}
