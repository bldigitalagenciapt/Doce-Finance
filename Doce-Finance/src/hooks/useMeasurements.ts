'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  DEFAULT_MEASUREMENTS,
  MeasurementRow,
} from '@/lib/measurementsData'

const STORAGE_KEY = 'doce_finance_measurements_v2'

export interface NewIngredientPayload {
  ingrediente: string
  tipo: string
  unidadeMedida: 'g' | 'ml'
  xicaraGrams?: number
  colherSopaGrams?: number
  colherChaGrams?: number
  outraMedida?: {
    conversao: string
    quantidade: string
    gramasMl: number
  }
}

export function useMeasurements() {
  const [measurements, setMeasurements] = useState<MeasurementRow[]>(DEFAULT_MEASUREMENTS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Carrega do localStorage ou inicia com DEFAULT_MEASUREMENTS
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMeasurements(parsed)
          setIsLoaded(true)
          return
        }
      }
      // Se não havia nada salvo, usa os defaults
      setMeasurements(DEFAULT_MEASUREMENTS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEASUREMENTS))
    } catch (err) {
      console.error('Erro ao ler medidas do armazenamento:', err)
      setMeasurements(DEFAULT_MEASUREMENTS)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  const persist = (items: MeasurementRow[]) => {
    setMeasurements(items)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (err) {
      console.error('Erro ao salvar medidas:', err)
    }
  }

  // Adicionar nova medida individual
  const addMeasurement = (item: Omit<MeasurementRow, 'id'>) => {
    const newItem: MeasurementRow = {
      ...item,
      id: `medida-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true,
    }
    const updated = [newItem, ...measurements]
    persist(updated)
    return newItem
  }

  // Adicionar novo ingrediente com suas equivalências (xícara, colher sopa, colher chá)
  const addIngredientWithMeasures = (payload: NewIngredientPayload) => {
    const ingName = payload.ingrediente.toUpperCase().trim()
    const tipo = (payload.tipo || 'NORMAL').toUpperCase().trim()
    const unit = payload.unidadeMedida
    const newItems: MeasurementRow[] = []

    // 1. Se informou xícara, gera 1 xícara e as frações padrão da confeitaria (1/2, 1/3, 1/4)
    if (payload.xicaraGrams && payload.xicaraGrams > 0) {
      const x = payload.xicaraGrams
      newItems.push({
        id: `medida-${Date.now()}-xic-1`,
        ingrediente: ingName,
        tipo,
        conversao: 'XÍCARA',
        quantidade: '1',
        gramasMl: x,
        unidadeMedida: unit,
        isCustom: true,
      })
      newItems.push({
        id: `medida-${Date.now()}-xic-12`,
        ingrediente: ingName,
        tipo,
        conversao: 'XÍCARA',
        quantidade: '1/2',
        gramasMl: Math.round((x / 2) * 10) / 10,
        unidadeMedida: unit,
        isCustom: true,
      })
      newItems.push({
        id: `medida-${Date.now()}-xic-13`,
        ingrediente: ingName,
        tipo,
        conversao: 'XÍCARA',
        quantidade: '1/3',
        gramasMl: Math.round((x / 3) * 10) / 10,
        unidadeMedida: unit,
        isCustom: true,
      })
      newItems.push({
        id: `medida-${Date.now()}-xic-14`,
        ingrediente: ingName,
        tipo,
        conversao: 'XÍCARA',
        quantidade: '1/4',
        gramasMl: Math.round((x / 4) * 10) / 10,
        unidadeMedida: unit,
        isCustom: true,
      })
    }

    // 2. Colher de sopa
    if (payload.colherSopaGrams && payload.colherSopaGrams > 0) {
      newItems.push({
        id: `medida-${Date.now()}-csopa`,
        ingrediente: ingName,
        tipo,
        conversao: 'COLHER SOPA',
        quantidade: '1',
        gramasMl: payload.colherSopaGrams,
        unidadeMedida: unit,
        isCustom: true,
      })
    }

    // 3. Colher de chá
    if (payload.colherChaGrams && payload.colherChaGrams > 0) {
      newItems.push({
        id: `medida-${Date.now()}-ccha`,
        ingrediente: ingName,
        tipo,
        conversao: 'COLHER CHÁ',
        quantidade: '1',
        gramasMl: payload.colherChaGrams,
        unidadeMedida: unit,
        isCustom: true,
      })
    }

    // 4. Outra medida avulsa
    if (payload.outraMedida && payload.outraMedida.gramasMl > 0) {
      newItems.push({
        id: `medida-${Date.now()}-outra`,
        ingrediente: ingName,
        tipo,
        conversao: payload.outraMedida.conversao.toUpperCase().trim(),
        quantidade: payload.outraMedida.quantidade.trim() || '1',
        gramasMl: payload.outraMedida.gramasMl,
        unidadeMedida: unit,
        isCustom: true,
      })
    }

    if (newItems.length > 0) {
      const updated = [...newItems, ...measurements]
      persist(updated)
    }

    return newItems
  }

  // Renomear um ingrediente em todas as medidas correspondentes
  const renameIngredient = (oldName: string, newName: string) => {
    const formattedNewName = newName.toUpperCase().trim()
    if (!formattedNewName) return
    const updated = measurements.map((m) =>
      m.ingrediente === oldName ? { ...m, ingrediente: formattedNewName, isCustom: true } : m,
    )
    persist(updated)
  }

  // Excluir um ingrediente inteiro e todas as suas medidas
  const deleteIngredient = (ingredientName: string) => {
    const updated = measurements.filter((m) => m.ingrediente !== ingredientName)
    persist(updated)
  }

  // Editar qualquer medida existente
  const updateMeasurement = (id: string, updatedFields: Partial<MeasurementRow>) => {
    const updated = measurements.map((m) =>
      m.id === id ? { ...m, ...updatedFields } : m,
    )
    persist(updated)
  }

  // Excluir qualquer medida
  const deleteMeasurement = (id: string) => {
    const updated = measurements.filter((m) => m.id !== id)
    persist(updated)
  }

  // Restaurar tabela para os valores padrão originais
  const resetToDefaults = () => {
    persist(DEFAULT_MEASUREMENTS)
  }

  // Exportar para Excel (.xlsx)
  const exportToExcel = () => {
    const rows = measurements.map((m) => ({
      QUANTIDADE: m.quantidade,
      CONVERSÃO: m.conversao,
      INGREDIENTE: m.ingrediente,
      TIPO: m.tipo,
      'GRAMAS/ ML': m.gramasMl,
      UNIDADE: m.unidadeMedida,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Unidades de Medida')
    XLSX.writeFile(wb, 'tabela-unidades-de-medida.xlsx')
  }

  return {
    measurements,
    isLoaded,
    addMeasurement,
    addIngredientWithMeasures,
    renameIngredient,
    deleteIngredient,
    updateMeasurement,
    deleteMeasurement,
    resetToDefaults,
    exportToExcel,
  }
}
