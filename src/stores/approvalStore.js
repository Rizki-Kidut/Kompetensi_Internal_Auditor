import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { auditorRequestRowToFrontend, auditorRequestFrontendToRow } from '../services/dataMappers.js'

export const useApprovalStore = defineStore('approval', () => {
  const requests = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase
      .from('auditor_requests')
      .select('*')
      .order('submitted_date', { ascending: false })
    if (error) { console.error('[approvalStore] load error:', error.message); loading.value = false; return }
    requests.value = (data ?? []).map(auditorRequestRowToFrontend)
    loading.value = false
  }

  async function addRequest(req) {
    const { error } = await supabase
      .from('auditor_requests')
      .insert(auditorRequestFrontendToRow(req))
    if (error) { console.error('[approvalStore] addRequest error:', error.message); return }
    requests.value.push(req)
  }

  async function updateRequest(updated) {
    const { error } = await supabase
      .from('auditor_requests')
      .update(auditorRequestFrontendToRow(updated))
      .eq('id', updated.id)
    if (error) { console.error('[approvalStore] updateRequest error:', error.message); return }
    const idx = requests.value.findIndex(r => r.id === updated.id)
    if (idx !== -1) requests.value[idx] = updated
  }

  async function approveStep(requestId, role, approverName, note = '') {
    const req = requests.value.find(r => r.id === requestId)
    if (!req) return
    const step = req.approvalChain.find(s => s.role === role && s.status === 'Pending')
    if (step) {
      step.status = 'Approved'
      step.name = approverName
      step.date = new Date().toISOString().slice(0, 10)
      step.note = note
    }
    const allApproved = req.approvalChain.every(s => s.status === 'Approved')
    const anyDeclined = req.approvalChain.some(s => s.status === 'Declined')
    if (allApproved) req.finalStatus = 'Approved'
    if (anyDeclined) req.finalStatus = 'Declined'
    await updateRequest(req)
    return req
  }

  async function declineStep(requestId, role, approverName, note = '') {
    const req = requests.value.find(r => r.id === requestId)
    if (!req) return
    const step = req.approvalChain.find(s => s.role === role && s.status === 'Pending')
    if (step) {
      step.status = 'Declined'
      step.name = approverName
      step.date = new Date().toISOString().slice(0, 10)
      step.note = note
    }
    req.finalStatus = 'Declined'
    await updateRequest(req)
    return req
  }

  return { requests, loading, load, addRequest, updateRequest, approveStep, declineStep }
})
