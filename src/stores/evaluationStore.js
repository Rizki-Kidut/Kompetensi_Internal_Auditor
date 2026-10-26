import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { evaluationRowToFrontend, evaluationFrontendToRow } from '../services/dataMappers.js'

export const useEvaluationStore = defineStore('evaluation', () => {
  const evaluations = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase
      .from('training_evaluations')
      .select('*')
      .order('evaluation_date', { ascending: false })
    if (error) { console.error('[evaluationStore] load error:', error.message); loading.value = false; return }
    evaluations.value = (data ?? []).map(evaluationRowToFrontend)
    loading.value = false
  }

  async function addEvaluation(ev) {
    const { error } = await supabase
      .from('training_evaluations')
      .insert(evaluationFrontendToRow(ev))
    if (error) { console.error('[evaluationStore] addEvaluation error:', error.message); return }
    evaluations.value.push(ev)
  }

  async function updateEvaluation(updated) {
    const { error } = await supabase
      .from('training_evaluations')
      .update(evaluationFrontendToRow(updated))
      .eq('id', updated.id)
    if (error) { console.error('[evaluationStore] updateEvaluation error:', error.message); return }
    const idx = evaluations.value.findIndex(e => e.id === updated.id)
    if (idx !== -1) evaluations.value[idx] = updated
  }

  async function createDraftEvaluation(sessionId, auditorId) {
    const { data, error } = await supabase.rpc('lms_create_draft_evaluation', {
      p_session_id: sessionId, p_auditor_id: auditorId,
    })
    if (error) { console.error('[evaluationStore] createDraftEvaluation error:', error.message); return null }
    if (data?.success) {
      await load()
    }
    return data
  }

  async function approveStep(evalId, role, approverName, note = '') {
    const ev = evaluations.value.find(e => e.id === evalId)
    if (!ev) return
    const step = ev.approvalChain.find(s => s.role === role && s.status === 'Pending')
    if (step) {
      step.status = 'Approved'
      step.name = approverName
      step.date = new Date().toISOString().slice(0, 10)
      step.note = note
    }
    if (ev.approvalChain.every(s => s.status === 'Approved')) {
      ev.finalStatus = 'Approved'
    }
    await updateEvaluation(ev)
    return ev
  }

  async function declineStep(evalId, role, approverName, note = '') {
    const ev = evaluations.value.find(e => e.id === evalId)
    if (!ev) return
    const step = ev.approvalChain.find(s => s.role === role && s.status === 'Pending')
    if (step) {
      step.status = 'Declined'
      step.name = approverName
      step.date = new Date().toISOString().slice(0, 10)
      step.note = note
    }
    ev.finalStatus = 'Ditolak'
    await updateEvaluation(ev)
    return ev
  }

  return { evaluations, loading, load, addEvaluation, updateEvaluation, createDraftEvaluation, approveStep, declineStep }
})
