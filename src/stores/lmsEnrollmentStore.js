import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import {
  lmsEnrollmentRowToFrontend, lmsEnrollmentFrontendToRow,
  lmsAttemptRowToFrontend, lmsAttemptFrontendToRow,
} from '../services/dataMappers.js'

export const useLmsEnrollmentStore = defineStore('lmsEnrollment', () => {
  const enrollments = ref([])
  const attempts = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const [en, att] = await Promise.all([
      supabase.from('lms_enrollments').select('*').order('created_at', { ascending: false }),
      supabase.from('lms_attempts').select('*').order('created_at', { ascending: false }),
    ])
    if (en.error) console.error('[lmsEnrollmentStore] enrollments load error:', en.error.message)
    if (att.error) console.error('[lmsEnrollmentStore] attempts load error:', att.error.message)
    enrollments.value = (en.data ?? []).map(lmsEnrollmentRowToFrontend)
    attempts.value = (att.data ?? []).map(lmsAttemptRowToFrontend)
    loading.value = false
  }

  async function addEnrollment(en) {
    const { error } = await supabase.from('lms_enrollments').insert(lmsEnrollmentFrontendToRow(en))
    if (error) { console.error('[lmsEnrollmentStore] addEnrollment error:', error.message); return }
    enrollments.value.push(en)
  }

  async function updateEnrollment(updated) {
    const { error } = await supabase.from('lms_enrollments').update(lmsEnrollmentFrontendToRow(updated)).eq('id', updated.id)
    if (error) { console.error('[lmsEnrollmentStore] updateEnrollment error:', error.message); return }
    const idx = enrollments.value.findIndex(e => e.id === updated.id)
    if (idx !== -1) enrollments.value[idx] = updated
  }

  async function deleteEnrollment(id) {
    const { error } = await supabase.from('lms_enrollments').delete().eq('id', id)
    if (error) { console.error('[lmsEnrollmentStore] deleteEnrollment error:', error.message); return }
    enrollments.value = enrollments.value.filter(e => e.id !== id)
  }

  async function updateAttempt(updated) {
    const { error } = await supabase.from('lms_attempts').update(lmsAttemptFrontendToRow(updated)).eq('id', updated.id)
    if (error) { console.error('[lmsEnrollmentStore] updateAttempt error:', error.message); return }
    const idx = attempts.value.findIndex(a => a.id === updated.id)
    if (idx !== -1) attempts.value[idx] = updated
  }

  function enrollmentsBySession(sessionId) {
    return enrollments.value.filter(e => e.sessionId === sessionId)
  }

  function enrollmentsByAuditor(auditorId) {
    return enrollments.value.filter(e => e.auditorId === auditorId)
  }

  function attemptsByAuditor(auditorId) {
    return attempts.value.filter(a => a.auditorId === auditorId)
  }

  function attemptsByTest(testId) {
    return attempts.value.filter(a => a.testId === testId)
  }

  return {
    enrollments, attempts, loading,
    load, addEnrollment, updateEnrollment, deleteEnrollment, updateAttempt,
    enrollmentsBySession, enrollmentsByAuditor, attemptsByAuditor, attemptsByTest,
  }
})
