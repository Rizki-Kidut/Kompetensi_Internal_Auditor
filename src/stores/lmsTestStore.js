import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import {
  lmsTestRowToFrontend, lmsTestFrontendToRow,
  lmsTestQuestionRowToFrontend, lmsTestQuestionFrontendToRow,
} from '../services/dataMappers.js'

export const useLmsTestStore = defineStore('lmsTest', () => {
  const tests = ref([])
  const testQuestions = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const [t, tq] = await Promise.all([
      supabase.from('lms_tests').select('*').order('created_at', { ascending: false }),
      supabase.from('lms_test_questions').select('*'),
    ])
    if (t.error) console.error('[lmsTestStore] tests load error:', t.error.message)
    if (tq.error) console.error('[lmsTestStore] testQuestions load error:', tq.error.message)
    tests.value = (t.data ?? []).map(lmsTestRowToFrontend)
    testQuestions.value = (tq.data ?? []).map(lmsTestQuestionRowToFrontend)
    loading.value = false
  }

  async function loadByCourse(courseId) {
    loading.value = true
    const { data, error } = await supabase.from('lms_tests').select('*').eq('course_id', courseId).order('created_at', { ascending: false })
    if (error) { console.error('[lmsTestStore] loadByCourse error:', error.message); loading.value = false; return }
    tests.value = (data ?? []).map(lmsTestRowToFrontend)
    loading.value = false
  }

  async function addTest(test) {
    const { error } = await supabase.from('lms_tests').insert(lmsTestFrontendToRow(test))
    if (error) { console.error('[lmsTestStore] addTest error:', error.message); return }
    tests.value.push(test)
  }

  async function updateTest(updated) {
    const { error } = await supabase.from('lms_tests').update(lmsTestFrontendToRow(updated)).eq('id', updated.id)
    if (error) { console.error('[lmsTestStore] updateTest error:', error.message); return }
    const idx = tests.value.findIndex(t => t.id === updated.id)
    if (idx !== -1) tests.value[idx] = updated
  }

  async function deleteTest(id) {
    const { error } = await supabase.from('lms_tests').delete().eq('id', id)
    if (error) { console.error('[lmsTestStore] deleteTest error:', error.message); return }
    tests.value = tests.value.filter(t => t.id !== id)
    testQuestions.value = testQuestions.value.filter(tq => tq.testId !== id)
  }

  async function setTestQuestions(testId, questionIds) {
    // Delete existing, then insert new
    const { error: delErr } = await supabase.from('lms_test_questions').delete().eq('test_id', testId)
    if (delErr) { console.error('[lmsTestStore] setTestQuestions delete error:', delErr.message); return }
    const rows = questionIds.map((qid, i) => ({ test_id: testId, question_id: qid, sort_order: i }))
    if (rows.length === 0) {
      testQuestions.value = testQuestions.value.filter(tq => tq.testId !== testId)
      return
    }
    const { data, error } = await supabase.from('lms_test_questions').insert(rows).select('*')
    if (error) { console.error('[lmsTestStore] setTestQuestions insert error:', error.message); return }
    testQuestions.value = testQuestions.value.filter(tq => tq.testId !== testId)
    testQuestions.value.push(...(data ?? []).map(lmsTestQuestionRowToFrontend))
  }

  function questionsByTest(testId) {
    return testQuestions.value.filter(tq => tq.testId === testId).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  function testsByCourse(courseId) {
    return tests.value.filter(t => t.courseId === courseId)
  }

  /**
   * Start a new test attempt via RPC.
   * @param {string} testId
   * @param {string} sessionId
   * @param {string} auditorId
   * @returns {Promise<string|null>} attempt ID
   */
  async function startAttempt(testId, sessionId, auditorId) {
    const { data, error } = await supabase.rpc('lms_start_attempt', {
      p_test_id: testId, p_session_id: sessionId, p_auditor_id: auditorId,
    })
    if (error) { console.error('[lmsTestStore] startAttempt error:', error.message); return null }
    return data?.attempt_id ?? null
  }

  /**
   * Get test questions for an attempt (no answer keys).
   * @param {string} attemptId
   * @returns {Promise<Array|null>}
   */
  async function getTestQuestions(attemptId) {
    const { data, error } = await supabase.rpc('lms_get_test_questions', { p_attempt_id: attemptId })
    if (error) { console.error('[lmsTestStore] getTestQuestions error:', error.message); return null }
    return data
  }

  /**
   * Submit attempt answers via RPC (auto-grades).
   * @param {string} attemptId
   * @param {object} answers - { questionId: answerValue }
   * @returns {Promise<object|null>}
   */
  async function submitAttempt(attemptId, answers) {
    const { data, error } = await supabase.rpc('lms_submit_attempt', {
      p_attempt_id: attemptId, p_answers: answers,
    })
    if (error) { console.error('[lmsTestStore] submitAttempt error:', error.message); return null }
    return data
  }

  return {
    tests, testQuestions, loading,
    load, loadByCourse, addTest, updateTest, deleteTest,
    setTestQuestions, questionsByTest, testsByCourse,
    startAttempt, getTestQuestions, submitAttempt,
  }
})
