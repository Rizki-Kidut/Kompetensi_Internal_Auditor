import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { trainingSessionRowToFrontend, trainingSessionFrontendToRow } from '../services/dataMappers.js'

export const useTrainingSessionStore = defineStore('trainingSession', () => {
  const sessions = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .order('date', { ascending: false })
    if (error) { console.error('[trainingSessionStore] load error:', error.message); loading.value = false; return }
    sessions.value = (data ?? []).map(trainingSessionRowToFrontend)
    loading.value = false
  }

  async function addSession(session) {
    const { error } = await supabase
      .from('training_sessions')
      .insert(trainingSessionFrontendToRow(session))
    if (error) { console.error('[trainingSessionStore] addSession error:', error.message); return }
    sessions.value.push(session)
  }

  async function updateSession(updated) {
    const { error } = await supabase
      .from('training_sessions')
      .update(trainingSessionFrontendToRow(updated))
      .eq('id', updated.id)
    if (error) { console.error('[trainingSessionStore] updateSession error:', error.message); return }
    const idx = sessions.value.findIndex(s => s.id === updated.id)
    if (idx !== -1) sessions.value[idx] = updated
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from('training_sessions')
      .update({ status })
      .eq('id', id)
    if (error) { console.error('[trainingSessionStore] updateStatus error:', error.message); return }
    const s = sessions.value.find(s => s.id === id)
    if (s) s.status = status
  }

  async function updateAttendees(id, attendees) {
    const { error } = await supabase
      .from('training_sessions')
      .update({ attendees })
      .eq('id', id)
    if (error) { console.error('[trainingSessionStore] updateAttendees error:', error.message); return }
    const s = sessions.value.find(s => s.id === id)
    if (s) s.attendees = [...attendees]
  }

  return { sessions, loading, load, addSession, updateSession, updateStatus, updateAttendees }
})
