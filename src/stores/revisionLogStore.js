import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { revisionLogRowToFrontend, revisionLogFrontendToRow } from '../services/dataMappers.js'

export const useRevisionLogStore = defineStore('revisionLog', () => {
  const entries = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase
      .from('revision_logs')
      .select('*')
      .order('date', { ascending: false })
    if (error) { console.error('[revisionLogStore] load error:', error.message); loading.value = false; return }
    entries.value = (data ?? []).map(revisionLogRowToFrontend)
    loading.value = false
  }

  async function addEntry(entry) {
    const { error } = await supabase
      .from('revision_logs')
      .insert(revisionLogFrontendToRow(entry))
    if (error) { console.error('[revisionLogStore] addEntry error:', error.message); return }
    entries.value.unshift(entry)
  }

  function getByType(type) {
    return entries.value.filter(e => e.type === type)
  }

  return { entries, loading, load, addEntry, getByType }
})
