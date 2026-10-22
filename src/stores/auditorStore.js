import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { auditorRowToFrontend, auditorFrontendToRow } from '../services/dataMappers.js'

export const useAuditorStore = defineStore('auditor', () => {
  const auditors = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase
      .from('auditors')
      .select('*')
      .order('name')
    if (error) { console.error('[auditorStore] load error:', error.message); loading.value = false; return }
    auditors.value = (data ?? []).map(auditorRowToFrontend)
    loading.value = false
  }

  async function add(auditor) {
    const { error } = await supabase
      .from('auditors')
      .insert(auditorFrontendToRow(auditor))
    if (error) { console.error('[auditorStore] add error:', error.message); return }
    auditors.value.push(auditor)
  }

  async function update(updated) {
    const { error } = await supabase
      .from('auditors')
      .update(auditorFrontendToRow(updated))
      .eq('id', updated.id)
    if (error) { console.error('[auditorStore] update error:', error.message); return }
    const idx = auditors.value.findIndex(a => a.id === updated.id)
    if (idx !== -1) auditors.value[idx] = updated
  }

  async function setStatus(id, status) {
    const { error } = await supabase
      .from('auditors')
      .update({ status })
      .eq('id', id)
    if (error) { console.error('[auditorStore] setStatus error:', error.message); return }
    const a = auditors.value.find(a => a.id === id)
    if (a) a.status = status
  }

  return { auditors, loading, load, add, update, setStatus }
})
