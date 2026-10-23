import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { lmsQuestionRowToFrontend, lmsQuestionFrontendToRow } from '../services/dataMappers.js'

export const useLmsQuestionStore = defineStore('lmsQuestion', () => {
  const questions = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase.from('lms_questions').select('*').order('created_at', { ascending: false })
    if (error) { console.error('[lmsQuestionStore] load error:', error.message); loading.value = false; return }
    questions.value = (data ?? []).map(lmsQuestionRowToFrontend)
    loading.value = false
  }

  async function loadByCourse(courseId) {
    loading.value = true
    const { data, error } = await supabase.from('lms_questions').select('*').eq('course_id', courseId).order('created_at', { ascending: false })
    if (error) { console.error('[lmsQuestionStore] loadByCourse error:', error.message); loading.value = false; return }
    questions.value = (data ?? []).map(lmsQuestionRowToFrontend)
    loading.value = false
  }

  /**
   * Upsert question + answer key via SECURITY DEFINER RPC.
   * @param {object} question - question object (camelCase)
   * @param {object} key - { answer, explanation }
   * @returns {Promise<string|null>} question ID or null on error
   */
  async function upsertQuestion(question, key) {
    const { data, error } = await supabase.rpc('lms_upsert_question', {
      p_question: lmsQuestionFrontendToRow(question),
      p_key: { answer: key.answer, explanation: key.explanation ?? '' },
    })
    if (error) { console.error('[lmsQuestionStore] upsertQuestion error:', error.message); return null }
    const id = data?.id ?? question.id
    // Update local state
    const idx = questions.value.findIndex(q => q.id === id)
    if (idx !== -1) questions.value[idx] = question
    else questions.value.push(question)
    return id
  }

  async function deleteQuestion(id) {
    const { error } = await supabase.from('lms_questions').delete().eq('id', id)
    if (error) { console.error('[lmsQuestionStore] deleteQuestion error:', error.message); return }
    questions.value = questions.value.filter(q => q.id !== id)
  }

  /**
   * Fetch answer key for a question via SECURITY DEFINER RPC.
   * TODO: restrict to admin after Supabase Auth
   * @param {string} questionId
   * @returns {Promise<{answer: any, explanation: string}|null>}
   */
  async function getQuestionKey(questionId) {
    const { data, error } = await supabase.rpc('lms_get_question_key', { p_question_id: questionId })
    if (error) { console.error('[lmsQuestionStore] getQuestionKey error:', error.message); return null }
    return data
  }

  return { questions, loading, load, loadByCourse, upsertQuestion, deleteQuestion, getQuestionKey }
})
