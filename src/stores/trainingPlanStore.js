import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import { trainingPlanRowToFrontend, trainingPlanFrontendToRow } from '../services/dataMappers.js'

export const useTrainingPlanStore = defineStore('trainingPlan', () => {
  const plans = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .order('planned_date', { ascending: false })
    if (error) { console.error('[trainingPlanStore] load error:', error.message); loading.value = false; return }
    plans.value = (data ?? []).map(trainingPlanRowToFrontend)
    loading.value = false
  }

  async function addPlan(plan) {
    const { error } = await supabase
      .from('training_plans')
      .insert(trainingPlanFrontendToRow(plan))
    if (error) { console.error('[trainingPlanStore] addPlan error:', error.message); return }
    plans.value.push(plan)
  }

  async function updatePlan(updated) {
    const { error } = await supabase
      .from('training_plans')
      .update(trainingPlanFrontendToRow(updated))
      .eq('id', updated.id)
    if (error) { console.error('[trainingPlanStore] updatePlan error:', error.message); return }
    const idx = plans.value.findIndex(p => p.id === updated.id)
    if (idx !== -1) plans.value[idx] = updated
  }

  async function deletePlan(id) {
    const { error } = await supabase.from('training_plans').delete().eq('id', id)
    if (error) { console.error('[trainingPlanStore] deletePlan error:', error.message); return }
    plans.value = plans.value.filter(p => p.id !== id)
  }

  async function approvePlan(id) {
    const p = plans.value.find(p => p.id === id)
    if (p && p.status === 'Draft') {
      p.status = 'Disetujui'
      await updatePlan(p)
    }
  }

  async function completePlan(id) {
    const p = plans.value.find(p => p.id === id)
    if (p && p.status !== 'Selesai') {
      p.status = 'Selesai'
      await updatePlan(p)
    }
  }

  return { plans, loading, load, addPlan, updatePlan, deletePlan, approvePlan, completePlan }
})
