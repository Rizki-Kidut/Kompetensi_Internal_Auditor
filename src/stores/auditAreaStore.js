import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'

export const useAuditAreaStore = defineStore('auditArea', () => {
  const areas = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase
      .from('audit_areas')
      .select('id, name, sort_order')
      .order('sort_order')
    loading.value = false
    if (error) { console.error('[auditAreaStore] load error:', error.message); return false }
    areas.value = (data ?? []).map(row => ({ id: row.id, name: row.name, sortOrder: row.sort_order }))
    return true
  }

  async function add(name) {
    const sortOrder = areas.value.length ? Math.max(...areas.value.map(a => a.sortOrder)) + 1 : 1
    const area = { id: `area-${Date.now()}`, name, sortOrder }
    const { error } = await supabase
      .from('audit_areas')
      .insert({ id: area.id, name: area.name, sort_order: area.sortOrder })
    if (error) { console.error('[auditAreaStore] add error:', error.message); return false }
    areas.value.push(area)
    return true
  }

  async function remove(id) {
    const { error } = await supabase
      .from('audit_areas')
      .delete()
      .eq('id', id)
    if (error) { console.error('[auditAreaStore] remove error:', error.message); return false }
    areas.value = areas.value.filter(a => a.id !== id)
    return true
  }

  return { areas, loading, load, add, remove }
})
