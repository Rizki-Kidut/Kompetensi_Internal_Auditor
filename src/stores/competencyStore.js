import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import {
  competencyItemRowToFrontend, competencyItemFrontendToRow,
  competencyCellRowToFrontend, competencyCellFrontendToRow,
} from '../services/dataMappers.js'

const CATEGORY_ORDER = ['Auditor QMS', 'Audit Manufaktur dan Shift', 'Audit Produk', 'Audit Supplier']

export const useCompetencyStore = defineStore('competency', () => {
  const items = ref([])
  const matrix = ref([])
  const loading = ref(false)

  const categories = computed(() => {
    const present = [...new Set(items.value.map(i => i.category))]
    return [
      ...CATEGORY_ORDER.filter(c => present.includes(c)),
      ...present.filter(c => !CATEGORY_ORDER.includes(c)).sort(),
    ]
  })

  async function load() {
    loading.value = true
    const [itemsRes, cellsRes] = await Promise.all([
      supabase.from('competency_items').select('*').order('category').order('item_name'),
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

  async function addItem(item) {
    const { error } = await supabase.from('competency_items').insert(competencyItemFrontendToRow(item))
    if (error) { console.error('[competencyStore] addItem error:', error.message); return false }
    items.value.push(item)
    return true
  }

  async function updateItemName(id, itemName) {
    const { error } = await supabase.from('competency_items').update({ item_name: itemName }).eq('id', id)
    if (error) { console.error('[competencyStore] updateItemName error:', error.message); return false }
    const item = items.value.find(i => i.id === id)
    if (item) item.itemName = itemName
    return true
  }

  return { items, categories, matrix, loading, load, updateCell, getCell, addAuditorCells, addItem, updateItemName }
})
