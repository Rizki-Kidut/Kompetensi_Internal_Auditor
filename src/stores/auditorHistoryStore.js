import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { auditorHistoryRowToFrontend, auditorHistoryFrontendToRow } from '../services/dataMappers.js'

export const useAuditorHistoryStore = defineStore('auditorHistory', () => {
  const entries = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase
      .from('auditor_history')
      .select('*')
      .order('deactivated_date', { ascending: false })
    if (error) { console.error('[auditorHistoryStore] load error:', error.message); loading.value = false; return }
    entries.value = (data ?? []).map(auditorHistoryRowToFrontend)
    loading.value = false
  }

  async function addEntry(entry) {
    const { error } = await supabase
      .from('auditor_history')
      .insert(auditorHistoryFrontendToRow(entry))
    if (error) { console.error('[auditorHistoryStore] addEntry error:', error.message); return }
    entries.value.unshift(entry)
  }

  return { entries, loading, load, addEntry }
})
