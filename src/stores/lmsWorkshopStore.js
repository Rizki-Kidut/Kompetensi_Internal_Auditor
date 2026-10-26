import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import {
  lmsWorkshopTaskRowToFrontend, lmsWorkshopTaskFrontendToRow,
  lmsSubmissionRowToFrontend, lmsSubmissionFrontendToRow,
} from '../services/dataMappers.js'

export const useLmsWorkshopStore = defineStore('lmsWorkshop', () => {
  const tasks = ref([])
  const submissions = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const [t, s] = await Promise.all([
      supabase.from('lms_workshop_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('lms_submissions').select('*').order('submitted_at', { ascending: false }),
    ])
    if (t.error) console.error('[lmsWorkshopStore] tasks load error:', t.error.message)
    if (s.error) console.error('[lmsWorkshopStore] submissions load error:', s.error.message)
    tasks.value = (t.data ?? []).map(lmsWorkshopTaskRowToFrontend)
    submissions.value = (s.data ?? []).map(lmsSubmissionRowToFrontend)
    loading.value = false
  }

  async function addTask(task) {
    const { error } = await supabase.from('lms_workshop_tasks').insert(lmsWorkshopTaskFrontendToRow(task))
    if (error) { console.error('[lmsWorkshopStore] addTask error:', error.message); return }
    tasks.value.push(task)
  }

  async function updateTask(updated) {
    const { error } = await supabase.from('lms_workshop_tasks').update(lmsWorkshopTaskFrontendToRow(updated)).eq('id', updated.id)
    if (error) { console.error('[lmsWorkshopStore] updateTask error:', error.message); return }
    const idx = tasks.value.findIndex(t => t.id === updated.id)
    if (idx !== -1) tasks.value[idx] = updated
  }

  async function deleteTask(id) {
    const { error } = await supabase.from('lms_workshop_tasks').delete().eq('id', id)
    if (error) { console.error('[lmsWorkshopStore] deleteTask error:', error.message); return }
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  async function addSubmission(sub) {
    const { error } = await supabase.from('lms_submissions').insert(lmsSubmissionFrontendToRow(sub))
    if (error) { console.error('[lmsWorkshopStore] addSubmission error:', error.message); return }
    submissions.value.push(sub)
  }

  async function updateSubmission(updated) {
    const { error } = await supabase.from('lms_submissions').update(lmsSubmissionFrontendToRow(updated)).eq('id', updated.id)
    if (error) { console.error('[lmsWorkshopStore] updateSubmission error:', error.message); return }
    const idx = submissions.value.findIndex(s => s.id === updated.id)
    if (idx !== -1) submissions.value[idx] = updated
    // Auto-create draft evaluation when workshop is graded
    if (updated.status === 'Dinilai') {
      await supabase.rpc('lms_create_draft_evaluation', {
        p_session_id: updated.sessionId, p_auditor_id: updated.auditorId,
      })
    }
  }

  function tasksBySession(sessionId) {
    return tasks.value.filter(t => t.sessionId === sessionId)
  }

  function submissionsByTask(taskId) {
    return submissions.value.filter(s => s.taskId === taskId)
  }

  function submissionsByAuditor(auditorId) {
    return submissions.value.filter(s => s.auditorId === auditorId)
  }

  return {
    tasks, submissions, loading,
    load, addTask, updateTask, deleteTask,
    addSubmission, updateSubmission,
    tasksBySession, submissionsByTask, submissionsByAuditor,
  }
})
