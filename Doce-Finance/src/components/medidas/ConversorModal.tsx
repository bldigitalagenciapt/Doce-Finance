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
    >
      <div className="space-y-4">
        {initialIngredientName && (
          <p className="text-xs text-gray-500">
            Convertendo medida para: <strong>{initialIngredientName}</strong>
          </p>
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
