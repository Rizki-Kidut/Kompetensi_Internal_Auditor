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

  /**
   * Grade a manually-graded attempt (Esai/Kasus questions).
   * Computes final score from auto + manual scores, sets passed flag,
   * and auto-creates a draft evaluation if the test passes.
   * @param {string} attemptId
   * @param {Record<string, number>} manualScores - questionId -> score
   * @returns {Promise<{final_score: number, passed: boolean}|null>}
   */
  async function gradeAttempt(attemptId, manualScores) {
    let attempt = attempts.value.find(a => a.id === attemptId)
    if (!attempt) {
      const { data: att } = await supabase.from('lms_attempts').select('*').eq('id', attemptId).maybeSingle()
      if (!att) return null
      attempt = lmsAttemptRowToFrontend(att)
    }

    // Fetch test to get pass grade and total points
    const { data: test } = await supabase.from('lms_tests').select('*').eq('id', attempt.testId).maybeSingle()
    if (!test) return null

    // Fetch questions to compute total points and earned
    const { data: tqRows } = await supabase
      .from('lms_test_questions')
      .select('question_id')
      .eq('test_id', attempt.testId)
    const qIds = (tqRows ?? []).map(r => r.question_id)
    const { data: questions } = await supabase.from('lms_questions').select('*').in('id', qIds)

    let totalPoints = 0
    let earned = Number(attempt.autoScore) || 0
    for (const q of questions ?? []) {
      totalPoints += Number(q.points) || 0
      if (q.type === 'Esai' || q.type === 'Kasus') {
        earned += Number(manualScores?.[q.id]) || 0
      }
    }

    const finalScore = totalPoints > 0 ? Math.round((earned / totalPoints) * 100 * 100) / 100 : 0
    const passed = finalScore >= (test.pass_grade || 80)

    const updated = {
      ...attempt,
      manualScore: earned - (Number(attempt.autoScore) || 0),
      finalScore,
      passed,
      status: 'Dinilai',
    }
    await updateAttempt(updated)

    // Auto-create draft evaluation if passed
    if (passed) {
      await supabase.rpc('lms_create_draft_evaluation', {
        p_session_id: attempt.sessionId, p_auditor_id: attempt.auditorId,
      })
    }

    return { final_score: finalScore, passed }
  }

  function enrollmentsBySession(sessionId) {
    return enrollments.value.filter(e => e.sessionId === sessionId)
  }

  function enrollmentsByAuditor(auditorId) {
    return enrollments.value.filter(e => e.auditorId === auditorId)
  }

  /**
   * Sync enrollments for a session: create enrollments for new participants,
   * remove enrollments for participants no longer in the session.
   * @param {string} sessionId
   * @param {string} courseId
   * @param {string[]} participantIds
   */
  async function syncEnrollments(sessionId, courseId, participantIds) {
    if (!courseId) return
    const existing = enrollments.value.filter(e => e.sessionId === sessionId)
    const existingAuditorIds = existing.map(e => e.auditorId)
    const toAdd = participantIds.filter(pid => !existingAuditorIds.includes(pid))
    const toRemove = existing.filter(e => !participantIds.includes(e.auditorId))

    for (const pid of toAdd) {
      const en = {
        id: `en-${sessionId}-${pid}`,
        sessionId, courseId, auditorId: pid,
        progress: 0, completedModules: [], status: 'Terdaftar',
      }
      await addEnrollment(en)
    }
    for (const en of toRemove) {
      await deleteEnrollment(en.id)
    }
  }

  function attemptsByAuditor(auditorId) {
    return attempts.value.filter(a => a.auditorId === auditorId)
  }

  function attemptsByTest(testId) {
    return attempts.value.filter(a => a.testId === testId)
  }

  return {
    enrollments, attempts, loading,
    load, addEnrollment, updateEnrollment, deleteEnrollment, updateAttempt, gradeAttempt,
    enrollmentsBySession, enrollmentsByAuditor, attemptsByAuditor, attemptsByTest,
    syncEnrollments,
  }
})
