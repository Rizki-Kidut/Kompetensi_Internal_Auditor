import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient.js'
import {
  lmsCourseRowToFrontend, lmsCourseFrontendToRow,
  lmsModuleRowToFrontend, lmsModuleFrontendToRow,
  lmsMaterialRowToFrontend, lmsMaterialFrontendToRow,
} from '../services/dataMappers.js'

export const useLmsCourseStore = defineStore('lmsCourse', () => {
  const courses = ref([])
  const modules = ref([])
  const materials = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    const [c, m, mat] = await Promise.all([
      supabase.from('lms_courses').select('*').order('title'),
      supabase.from('lms_modules').select('*').order('sort_order'),
      supabase.from('lms_materials').select('*').order('sort_order'),
    ])
    if (c.error) console.error('[lmsCourseStore] courses load error:', c.error.message)
    if (m.error) console.error('[lmsCourseStore] modules load error:', m.error.message)
    if (mat.error) console.error('[lmsCourseStore] materials load error:', mat.error.message)
    courses.value = (c.data ?? []).map(lmsCourseRowToFrontend)
    modules.value = (m.data ?? []).map(lmsModuleRowToFrontend)
    materials.value = (mat.data ?? []).map(lmsMaterialRowToFrontend)
    loading.value = false
  }

  async function addCourse(course) {
    const { error } = await supabase.from('lms_courses').insert(lmsCourseFrontendToRow(course))
    if (error) { console.error('[lmsCourseStore] addCourse error:', error.message); return }
    courses.value.push(course)
  }

  async function updateCourse(updated) {
    const { error } = await supabase.from('lms_courses').update(lmsCourseFrontendToRow(updated)).eq('id', updated.id)
    if (error) { console.error('[lmsCourseStore] updateCourse error:', error.message); return }
    const idx = courses.value.findIndex(c => c.id === updated.id)
    if (idx !== -1) courses.value[idx] = updated
  }

  async function deleteCourse(id) {
    const { error } = await supabase.from('lms_courses').delete().eq('id', id)
    if (error) { console.error('[lmsCourseStore] deleteCourse error:', error.message); return }
    courses.value = courses.value.filter(c => c.id !== id)
    modules.value = modules.value.filter(m => m.courseId !== id)
  }

  async function addModule(mod) {
    const { error } = await supabase.from('lms_modules').insert(lmsModuleFrontendToRow(mod))
    if (error) { console.error('[lmsCourseStore] addModule error:', error.message); return }
    modules.value.push(mod)
  }

  async function updateModule(updated) {
    const { error } = await supabase.from('lms_modules').update(lmsModuleFrontendToRow(updated)).eq('id', updated.id)
    if (error) { console.error('[lmsCourseStore] updateModule error:', error.message); return }
    const idx = modules.value.findIndex(m => m.id === updated.id)
    if (idx !== -1) modules.value[idx] = updated
  }

  async function deleteModule(id) {
    const { error } = await supabase.from('lms_modules').delete().eq('id', id)
    if (error) { console.error('[lmsCourseStore] deleteModule error:', error.message); return }
    modules.value = modules.value.filter(m => m.id !== id)
    materials.value = materials.value.filter(mat => mat.moduleId !== id)
  }

  async function addMaterial(mat) {
    const { error } = await supabase.from('lms_materials').insert(lmsMaterialFrontendToRow(mat))
    if (error) { console.error('[lmsCourseStore] addMaterial error:', error.message); return }
    materials.value.push(mat)
  }

  async function updateMaterial(updated) {
    const { error } = await supabase.from('lms_materials').update(lmsMaterialFrontendToRow(updated)).eq('id', updated.id)
    if (error) { console.error('[lmsCourseStore] updateMaterial error:', error.message); return }
    const idx = materials.value.findIndex(m => m.id === updated.id)
    if (idx !== -1) materials.value[idx] = updated
  }

  async function deleteMaterial(id) {
    const { error } = await supabase.from('lms_materials').delete().eq('id', id)
    if (error) { console.error('[lmsCourseStore] deleteMaterial error:', error.message); return }
    materials.value = materials.value.filter(m => m.id !== id)
  }

  function modulesByCourse(courseId) {
    return modules.value.filter(m => m.courseId === courseId).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  function materialsByModule(moduleId) {
    return materials.value.filter(m => m.moduleId === moduleId).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  return {
    courses, modules, materials, loading,
    load, addCourse, updateCourse, deleteCourse,
    addModule, updateModule, deleteModule,
    addMaterial, updateMaterial, deleteMaterial,
    modulesByCourse, materialsByModule,
  }
})
