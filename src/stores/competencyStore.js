import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import {
  competencyItemRowToFrontend, competencyItemFrontendToRow,
  competencyCellRowToFrontend, competencyCellFrontendToRow,
} from '../services/dataMappers.js'

export const useCompetencyStore = defineStore('competency', () => {
  const items = ref([])
  const matrix = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const [itemsRes, cellsRes] = await Promise.all([
      supabase.from('competency_items').select('*').order('category, item_name'),
      supabase.from('competency_cells').select('*'),
    ])
    if (itemsRes.error) console.error('[competencyStore] items load error:', itemsRes.error.message)
    if (cellsRes.error) console.error('[competencyStore] cells load error:', cellsRes.error.message)
    items.value = (itemsRes.data ?? []).map(competencyItemRowToFrontend)
    matrix.value = (cellsRes.data ?? []).map(competencyCellRowToFrontend)
    loading.value = false
  }

  async function updateCell(auditorId, itemId, level, updatedBy, sourceEvaluationId = null) {
    const cell = {
      auditor_id: auditorId,
      item_id: itemId,
      level,
      last_updated: new Date().toISOString().slice(0, 10),
      updated_by: updatedBy,
      source_evaluation_id: sourceEvaluationId,
    }
    const { error } = await supabase
      .from('competency_cells')
      .upsert(cell, { onConflict: 'auditor_id,item_id' })
    if (error) { console.error('[competencyStore] updateCell error:', error.message); return }
    const idx = matrix.value.findIndex(c => c.auditorId === auditorId && c.itemId === itemId)
    const frontendCell = competencyCellRowToFrontend(cell)
    if (idx !== -1) matrix.value[idx] = frontendCell
    else matrix.value.push(frontendCell)
  }

  function getCell(auditorId, itemId) {
    return matrix.value.find(c => c.auditorId === auditorId && c.itemId === itemId)
  }

  async function addAuditorCells(auditorId) {
    const newCells = items.value
      .filter(item => !matrix.value.find(c => c.auditorId === auditorId && c.itemId === item.id))
      .map(item => ({
        auditor_id: auditorId,
        item_id: item.id,
        level: '',
        last_updated: new Date().toISOString().slice(0, 10),
        updated_by: 'System',
        source_evaluation_id: null,
      }))
    if (newCells.length === 0) return
    const { error } = await supabase.from('competency_cells').insert(newCells)
    if (error) { console.error('[competencyStore] addAuditorCells error:', error.message); return }
    matrix.value.push(...newCells.map(competencyCellRowToFrontend))
  }

  return { items, matrix, loading, load, updateCell, getCell, addAuditorCells }
})
