<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  BookOpen, Plus, ArrowLeft, Eye, Pencil, Trash2,
  ChevronUp, ChevronDown, FileText, Link as LinkIcon, Video, FileType,
  Layers, ClipboardCheck, Users, Save, X, Wrench,
} from '@lucide/vue'
import { useLmsCourseStore }      from '../../../stores/lmsCourseStore.js'
import { useLmsTestStore }        from '../../../stores/lmsTestStore.js'
import { useLmsWorkshopStore }    from '../../../stores/lmsWorkshopStore.js'
import { useLmsEnrollmentStore }  from '../../../stores/lmsEnrollmentStore.js'
import { useCompetencyStore }     from '../../../stores/competencyStore.js'
import { useAuditorStore }        from '../../../stores/auditorStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useToast }               from '../../../shared/composables/useToast.js'
import BaseButton    from '../../../shared/components/BaseButton.vue'
import BaseModal     from '../../../shared/components/BaseModal.vue'
import StatusBadge   from '../../../shared/components/StatusBadge.vue'
import CompetencySymbol from '../../../shared/components/CompetencySymbol.vue'

const courseStore     = useLmsCourseStore()
const testStore       = useLmsTestStore()
const workshopStore   = useLmsWorkshopStore()
const enrollmentStore = useLmsEnrollmentStore()
const competency      = useCompetencyStore()
const auditorStore    = useAuditorStore()
const sessionStore    = useTrainingSessionStore()
const toast           = useToast()

onMounted(() => {
  courseStore.load(); testStore.load(); workshopStore.load()
  enrollmentStore.load(); competency.load()
  auditorStore.load(); sessionStore.load()
})

// ── Helpers ───────────────────────────────────────────────
function itemName(id) { return competency.items.find(i => i.id === id)?.itemName ?? '—' }
function auditorName(id) { return auditorStore.auditors.find(a => a.id === id)?.name ?? id }
function sessionName(id) { return sessionStore.sessions.find(s => s.id === id)?.trainingName ?? id }

const COURSE_STATUS_OPTS = ['Draft', 'Published', 'Arsip']
const LEVELS = ['●', '◆', '★']
const MATERIAL_TYPES = ['PDF', 'PPT', 'Video', 'Link', 'Teks']

const materialTypeIcon = (type) => ({
  PDF: FileText, PPT: FileType, Video, Link: LinkIcon, Teks: FileText,
}[type] ?? FileText)

// ── Course list ───────────────────────────────────────────
const courseRows = computed(() =>
  courseStore.courses.map(c => ({
    ...c,
    itemName: itemName(c.competencyItemId),
    moduleCount: courseStore.modulesByCourse(c.id).length,
  }))
)

// ── Course form ───────────────────────────────────────────
const formOpen    = ref(false)
const formErrors  = ref({})
const formLoading = ref(false)
const editingId   = ref(null)

function emptyCourseForm() {
  return { id: '', title: '', description: '', competencyItemId: '', targetLevel: '◆', passGrade: 80, status: 'Draft' }
}
const courseForm = ref(emptyCourseForm())

function openCreateCourse() {
  editingId.value = null
  courseForm.value = emptyCourseForm()
  formErrors.value = {}
  formOpen.value = true
}
function openEditCourse(c) {
  editingId.value = c.id
  courseForm.value = { ...c }
  formErrors.value = {}
  formOpen.value = true
}
function validateCourse() {
  const e = {}
  if (!courseForm.value.title?.trim()) e.title = 'Judul kursus wajib diisi'
  if (!courseForm.value.competencyItemId) e.competencyItemId = 'Pilih item kompetensi'
  if (courseForm.value.passGrade == null || courseForm.value.passGrade < 1 || courseForm.value.passGrade > 100)
    e.passGrade = 'Passing grade 1–100'
  return e
}
async function saveCourse() {
  formErrors.value = validateCourse()
  if (Object.keys(formErrors.value).length) return
  formLoading.value = true
  try {
    const rec = { ...courseForm.value, id: editingId.value || `course-${Date.now()}` }
    if (editingId.value) {
      await courseStore.updateCourse(rec)
      toast.success('Kursus diperbarui.')
    } else {
      await courseStore.addCourse(rec)
      toast.success('Kursus dibuat.')
    }
    formOpen.value = false
  } finally { formLoading.value = false }
}
async function deleteCourse(id) {
  if (!confirm('Hapus kursus ini? Semua modul dan materi akan terhapus.')) return
  await courseStore.deleteCourse(id)
  toast.success('Kursus dihapus.')
}

// ── Course detail ─────────────────────────────────────────
const detailCourse  = ref(null)
const detailTab     = ref('modul')

function openDetail(c) {
  detailCourse.value = c
  detailTab.value = 'modul'
}

const detailModules = computed(() =>
  detailCourse.value ? courseStore.modulesByCourse(detailCourse.value.id) : []
)
const detailTests = computed(() =>
  detailCourse.value ? testStore.testsByCourse(detailCourse.value.id) : []
)
const detailWorkshops = computed(() =>
  detailCourse.value
    ? workshopStore.tasks.filter(t =>
        sessionStore.sessions.some(s => s.id === t.sessionId && s.lmsCourseId === detailCourse.value.id)
      )
    : []
)
const detailEnrollments = computed(() =>
  detailCourse.value ? enrollmentStore.enrollments.filter(e => e.courseId === detailCourse.value.id) : []
)

// ── Module form ───────────────────────────────────────────
const moduleFormOpen   = ref(false)
const moduleErrors     = ref({})
const moduleEditingId  = ref(null)
const moduleForm       = ref({ id: '', courseId: '', title: '', sortOrder: 0, prerequisiteModuleId: null })

function openCreateModule() {
  moduleEditingId.value = null
  moduleForm.value = { id: '', courseId: detailCourse.value.id, title: '', sortOrder: detailModules.value.length, prerequisiteModuleId: null }
  moduleErrors.value = {}
  moduleFormOpen.value = true
}
function openEditModule(m) {
  moduleEditingId.value = m.id
  moduleForm.value = { ...m }
  moduleErrors.value = {}
  moduleFormOpen.value = true
}
async function saveModule() {
  if (!moduleForm.value.title?.trim()) { moduleErrors.value = { title: 'Judul modul wajib diisi' }; return }
  const rec = { ...moduleForm.value, id: moduleEditingId.value || `mod-${Date.now()}` }
  if (moduleEditingId.value) { await courseStore.updateModule(rec); toast.success('Modul diperbarui.') }
  else { await courseStore.addModule(rec); toast.success('Modul ditambahkan.') }
  moduleFormOpen.value = false
}
async function deleteModule(id) {
  if (!confirm('Hapus modul ini? Semua materi di dalamnya akan terhapus.')) return
  await courseStore.deleteModule(id)
  toast.success('Modul dihapus.')
}
async function moveModule(idx, dir) {
  const mods = [...detailModules.value]
  const swap = idx + dir
  if (swap < 0 || swap >= mods.length) return
  const a = { ...mods[idx], sortOrder: mods[swap].sortOrder }
  const b = { ...mods[swap], sortOrder: mods[idx].sortOrder }
  await courseStore.updateModule(a)
  await courseStore.updateModule(b)
}
function moduleTitle(id) {
  if (!id) return null
  return courseStore.modules.find(m => m.id === id)?.title ?? null
}

// ── Material form ─────────────────────────────────────────
const materialFormOpen  = ref(false)
const materialErrors    = ref({})
const materialEditingId = ref(null)
const materialForm      = ref({ id: '', moduleId: '', title: '', type: 'Teks', url: '', content: '', docNumber: '', revision: '', effectiveDate: '', sortOrder: 0 })
const materialForModule = ref('')

function openCreateMaterial(moduleId) {
  materialEditingId.value = null
  const mods = courseStore.materialsByModule(moduleId)
  materialForm.value = { id: '', moduleId, title: '', type: 'Teks', url: '', content: '', docNumber: '', revision: '', effectiveDate: '', sortOrder: mods.length }
  materialErrors.value = {}
  materialFormOpen.value = true
}
function openEditMaterial(mat) {
  materialEditingId.value = mat.id
  materialForm.value = { ...mat }
  materialErrors.value = {}
  materialFormOpen.value = true
}
async function saveMaterial() {
  const e = {}
  if (!materialForm.value.title?.trim()) e.title = 'Judul materi wajib diisi'
  if (materialForm.value.type === 'Link' && !materialForm.value.url?.trim()) e.url = 'URL wajib diisi untuk tipe Link'
  if (materialForm.value.type === 'Teks' && !materialForm.value.content?.trim() && !materialForm.value.url?.trim())
    e.content = 'Konten teks atau URL wajib diisi'
  materialErrors.value = e
  if (Object.keys(e).length) return
  const rec = { ...materialForm.value, id: materialEditingId.value || `mat-${Date.now()}` }
  if (materialEditingId.value) { await courseStore.updateMaterial(rec); toast.success('Materi diperbarui.') }
  else { await courseStore.addMaterial(rec); toast.success('Materi ditambahkan.') }
  materialFormOpen.value = false
}
async function deleteMaterial(id) {
  if (!confirm('Hapus materi ini?')) return
  await courseStore.deleteMaterial(id)
  toast.success('Materi dihapus.')
}
async function moveMaterial(moduleId, idx, dir) {
  const mats = [...courseStore.materialsByModule(moduleId)]
  const swap = idx + dir
  if (swap < 0 || swap >= mats.length) return
  const a = { ...mats[idx], sortOrder: mats[swap].sortOrder }
  const b = { ...mats[swap], sortOrder: mats[idx].sortOrder }
  await courseStore.updateMaterial(a)
  await courseStore.updateMaterial(b)
}
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div v-if="!detailCourse">
        <h1 class="text-2xl font-bold text-slate-800">Kursus & Materi</h1>
        <p class="text-slate-500 text-sm mt-1">Kelola kursus LMS, modul, dan materi pembelajaran</p>
      </div>
      <div v-else>
        <button class="btn-secondary text-xs flex items-center gap-1 mb-2" @click="detailCourse = null">
          <ArrowLeft class="w-3 h-3" /> Kembali ke Daftar Kursus
        </button>
        <h1 class="text-2xl font-bold text-slate-800">{{ detailCourse.title }}</h1>
        <p class="text-slate-500 text-sm mt-1">{{ detailCourse.description || 'Tanpa deskripsi' }}</p>
      </div>
      <BaseButton v-if="!detailCourse" variant="primary" @click="openCreateCourse">
        <Plus class="w-4 h-4" /> Buat Kursus
      </BaseButton>
    </div>

    <!-- ═══ Course List ═══ -->
    <div v-if="!detailCourse" class="ct-card overflow-hidden">
      <div v-if="courseRows.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Judul</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Item Kompetensi</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Target Level</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Modul</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Passing Grade</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="c in courseRows" :key="c.id" class="hover:bg-blue-50/20 transition-colors">
              <td class="px-4 py-3 font-medium text-slate-700">{{ c.title }}</td>
              <td class="px-4 py-3 text-slate-600 max-w-[200px] truncate">{{ c.itemName }}</td>
              <td class="px-4 py-3 text-center"><CompetencySymbol :level="c.targetLevel" size="sm" /></td>
              <td class="px-4 py-3 text-center text-slate-600">{{ c.moduleCount }}</td>
              <td class="px-4 py-3 text-center font-medium text-slate-600">{{ c.passGrade }}</td>
              <td class="px-4 py-3 text-center"><StatusBadge :status="c.status" /></td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1.5">
                  <button class="ct-action-btn-view" title="Detail" @click="openDetail(c)"><Eye class="w-3.5 h-3.5" /></button>
                  <button class="ct-action-btn-edit" title="Edit" @click="openEditCourse(c)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button class="ct-action-btn-danger" title="Hapus" @click="deleteCourse(c.id)"><Trash2 class="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center">
        <div class="ct-empty-icon-wrap"><BookOpen class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Belum ada kursus. Klik "Buat Kursus" untuk membuat.</p>
      </div>
    </div>

    <!-- ═══ Course Detail ═══ -->
    <div v-if="detailCourse">
      <!-- Tab bar -->
      <div class="flex gap-1 mb-4 border-b border-slate-200">
        <button
          v-for="tab in [
            { key: 'modul', label: 'Modul & Materi', icon: Layers },
            { key: 'tes', label: 'Tes', icon: ClipboardCheck },
            { key: 'workshop', label: 'Workshop', icon: Wrench },
            { key: 'peserta', label: 'Peserta', icon: Users },
          ]"
          :key="tab.key"
          :class="detailTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
          class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          @click="detailTab = tab.key"
        >
          <component :is="tab.icon" class="w-4 h-4" /> {{ tab.label }}
        </button>
      </div>

      <!-- Tab: Modul & Materi -->
      <div v-if="detailTab === 'modul'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700">Daftar Modul</h3>
          <BaseButton variant="primary" size="sm" @click="openCreateModule"><Plus class="w-3.5 h-3.5" /> Tambah Modul</BaseButton>
        </div>
        <div v-if="detailModules.length" class="space-y-3">
          <div v-for="(m, idx) in detailModules" :key="m.id" class="ct-card overflow-hidden">
            <div class="px-4 py-3 flex items-center gap-3 border-b border-slate-100">
              <div class="flex flex-col gap-0.5">
                <button class="text-slate-300 hover:text-blue-600" :disabled="idx === 0" @click="moveModule(idx, -1)"><ChevronUp class="w-4 h-4" /></button>
                <button class="text-slate-300 hover:text-blue-600" :disabled="idx === detailModules.length - 1" @click="moveModule(idx, 1)"><ChevronDown class="w-4 h-4" /></button>
              </div>
              <div class="flex-1">
                <p class="font-semibold text-slate-700 text-sm">{{ m.title }}</p>
                <p v-if="m.prerequisiteModuleId" class="text-xs text-slate-400 mt-0.5">Prasyarat: {{ moduleTitle(m.prerequisiteModuleId) }}</p>
              </div>
              <button class="ct-action-btn-edit" @click="openEditModule(m)">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </button>
              <button class="ct-action-btn-danger" @click="deleteModule(m.id)"><Trash2 class="w-3.5 h-3.5" /></button>
            </div>
            <div class="px-4 py-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Materi</span>
                <button class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1" @click="openCreateMaterial(m.id)">
                  <Plus class="w-3 h-3" /> Tambah Materi
                </button>
              </div>
              <div v-if="courseStore.materialsByModule(m.id).length" class="space-y-1.5">
                <div
                  v-for="(mat, mi) in courseStore.materialsByModule(m.id)"
                  :key="mat.id"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div class="flex flex-col gap-0.5">
                    <button class="text-slate-300 hover:text-blue-600" :disabled="mi === 0" @click="moveMaterial(m.id, mi, -1)"><ChevronUp class="w-3 h-3" /></button>
                    <button class="text-slate-300 hover:text-blue-600" :disabled="mi === courseStore.materialsByModule(m.id).length - 1" @click="moveMaterial(m.id, mi, 1)"><ChevronDown class="w-3 h-3" /></button>
                  </div>
                  <component :is="materialTypeIcon(mat.type)" class="w-4 h-4 text-slate-400 shrink-0" />
                  <div class="flex-1">
                    <p class="text-sm text-slate-700 font-medium">{{ mat.title }}</p>
                    <p class="text-xs text-slate-400">
                      {{ mat.type }}
                      <span v-if="mat.docNumber"> · Doc: {{ mat.docNumber }}</span>
                      <span v-if="mat.revision"> · Rev: {{ mat.revision }}</span>
                      <span v-if="mat.effectiveDate"> · Efektif: {{ mat.effectiveDate }}</span>
                    </p>
                  </div>
                  <a v-if="mat.url && mat.type !== 'Teks'" :href="mat.url" target="_blank" class="ct-action-btn-view" title="Buka"><LinkIcon class="w-3.5 h-3.5" /></a>
                  <button class="ct-action-btn-edit" @click="openEditMaterial(mat)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button class="ct-action-btn-danger" @click="deleteMaterial(mat.id)"><Trash2 class="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p v-else class="text-xs text-slate-300 italic">Belum ada materi</p>
            </div>
          </div>
        </div>
        <div v-else class="ct-card py-12 text-center">
          <div class="ct-empty-icon-wrap"><Layers class="w-9 h-9 text-slate-300" /></div>
          <p class="text-slate-400 italic text-sm">Belum ada modul. Klik "Tambah Modul" untuk membuat.</p>
        </div>
      </div>

      <!-- Tab: Tes -->
      <div v-if="detailTab === 'tes'" class="ct-card overflow-hidden">
        <div v-if="detailTests.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Judul Tes</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Durasi</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Passing Grade</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Maks Percobaan</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Soal</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="t in detailTests" :key="t.id" class="hover:bg-blue-50/20">
                <td class="px-4 py-3 font-medium text-slate-700">{{ t.title }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ t.durationMinutes }} min</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ t.passGrade }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ t.maxAttempts }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ testStore.questionsByTest(t.id).length }}</td>
                <td class="px-4 py-3 text-center"><StatusBadge :status="t.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-12 text-center">
          <div class="ct-empty-icon-wrap"><ClipboardCheck class="w-9 h-9 text-slate-300" /></div>
          <p class="text-slate-400 italic text-sm">Belum ada tes. Kelola tes di menu "Tes Tertulis".</p>
        </div>
      </div>

      <!-- Tab: Workshop -->
      <div v-if="detailTab === 'workshop'" class="ct-card overflow-hidden">
        <div v-if="detailWorkshops.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Judul Tugas</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Sesi</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Batas Pengumpulan</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Skor Maks</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Pengumpulan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="w in detailWorkshops" :key="w.id" class="hover:bg-blue-50/20">
                <td class="px-4 py-3 font-medium text-slate-700">{{ w.title }}</td>
                <td class="px-4 py-3 text-slate-600">{{ sessionName(w.sessionId) }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ w.dueDate || '—' }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ w.maxScore }}</td>
                <td class="px-4 py-3 text-center text-slate-600">{{ workshopStore.submissionsByTask(w.id).length }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-12 text-center">
          <div class="ct-empty-icon-wrap"><Wrench class="w-9 h-9 text-slate-300" /></div>
          <p class="text-slate-400 italic text-sm">Belum ada tugas workshop. Kelola workshop di menu "Workshop".</p>
        </div>
      </div>

      <!-- Tab: Peserta -->
      <div v-if="detailTab === 'peserta'" class="ct-card overflow-hidden">
        <div v-if="detailEnrollments.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Auditor</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Sesi</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Progres</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="en in detailEnrollments" :key="en.id" class="hover:bg-blue-50/20">
                <td class="px-4 py-3 font-medium text-slate-700">{{ auditorName(en.auditorId) }}</td>
                <td class="px-4 py-3 text-slate-600">{{ sessionName(en.sessionId) }}</td>
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center gap-2">
                    <div class="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500 rounded-full" :style="`width: ${en.progress}%`" />
                    </div>
                    <span class="text-xs text-slate-600">{{ en.progress }}%</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-center"><StatusBadge :status="en.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-12 text-center">
          <div class="ct-empty-icon-wrap"><Users class="w-9 h-9 text-slate-300" /></div>
          <p class="text-slate-400 italic text-sm">Belum ada peserta terdaftar.</p>
        </div>
      </div>
    </div>

    <!-- ── Course Form Modal ── -->
    <BaseModal v-model="formOpen" :title="editingId ? 'Edit Kursus' : 'Buat Kursus Baru'" size="lg">
      <div class="space-y-4">
        <div>
          <label class="ct-label">Judul Kursus <span class="text-red-500">*</span></label>
          <input v-model="courseForm.title" class="ct-input" :class="formErrors.title ? 'border-red-400' : ''" placeholder="cth: Internal Auditor QMS Basic" />
          <p v-if="formErrors.title" class="text-red-500 text-xs mt-1">{{ formErrors.title }}</p>
        </div>
        <div>
          <label class="ct-label">Deskripsi</label>
          <textarea v-model="courseForm.description" class="ct-input resize-none" rows="2" placeholder="Deskripsi singkat kursus..." />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="ct-label">Item Kompetensi <span class="text-red-500">*</span></label>
            <select v-model="courseForm.competencyItemId" class="ct-input" :class="formErrors.competencyItemId ? 'border-red-400' : ''">
              <option value="">-- Pilih --</option>
              <option v-for="item in competency.items" :key="item.id" :value="item.id">{{ item.itemName }} ({{ item.category }})</option>
            </select>
            <p v-if="formErrors.competencyItemId" class="text-red-500 text-xs mt-1">{{ formErrors.competencyItemId }}</p>
          </div>
          <div>
            <label class="ct-label">Target Level</label>
            <div class="flex items-center gap-2 mt-1">
              <button
                v-for="l in LEVELS"
                :key="l"
                :class="courseForm.targetLevel === l ? 'ring-2 ring-blue-500' : 'ring-1 ring-slate-200'"
                class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:ring-blue-300"
                @click="courseForm.targetLevel = l"
              >{{ l }}</button>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="ct-label">Passing Grade</label>
            <input v-model.number="courseForm.passGrade" type="number" min="1" max="100" class="ct-input" :class="formErrors.passGrade ? 'border-red-400' : ''" />
            <p v-if="formErrors.passGrade" class="text-red-500 text-xs mt-1">{{ formErrors.passGrade }}</p>
          </div>
          <div>
            <label class="ct-label">Status</label>
            <select v-model="courseForm.status" class="ct-input">
              <option v-for="s in COURSE_STATUS_OPTS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="formOpen = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="formLoading" @click="saveCourse"><Save class="w-3.5 h-3.5" /> Simpan</BaseButton>
      </template>
    </BaseModal>

    <!-- ── Module Form Modal ── -->
    <BaseModal v-model="moduleFormOpen" :title="moduleEditingId ? 'Edit Modul' : 'Tambah Modul'" size="md">
      <div class="space-y-4">
        <div>
          <label class="ct-label">Judul Modul <span class="text-red-500">*</span></label>
          <input v-model="moduleForm.title" class="ct-input" :class="moduleErrors.title ? 'border-red-400' : ''" placeholder="cth: Modul 1 - Pendahuluan" />
          <p v-if="moduleErrors.title" class="text-red-500 text-xs mt-1">{{ moduleErrors.title }}</p>
        </div>
        <div>
          <label class="ct-label">Modul Prasyarat</label>
          <select v-model="moduleForm.prerequisiteModuleId" class="ct-input">
            <option :value="null">-- Tidak ada --</option>
            <option
              v-for="m in detailModules.filter(m => m.id !== moduleEditingId)"
              :key="m.id" :value="m.id"
            >{{ m.title }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="moduleFormOpen = false">Batal</BaseButton>
        <BaseButton variant="primary" @click="saveModule"><Save class="w-3.5 h-3.5" /> Simpan</BaseButton>
      </template>
    </BaseModal>

    <!-- ── Material Form Modal ── -->
    <BaseModal v-model="materialFormOpen" :title="materialEditingId ? 'Edit Materi' : 'Tambah Materi'" size="lg">
      <div class="space-y-4">
        <div>
          <label class="ct-label">Judul Materi <span class="text-red-500">*</span></label>
          <input v-model="materialForm.title" class="ct-input" :class="materialErrors.title ? 'border-red-400' : ''" />
          <p v-if="materialErrors.title" class="text-red-500 text-xs mt-1">{{ materialErrors.title }}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="ct-label">Tipe</label>
            <select v-model="materialForm.type" class="ct-input">
              <option v-for="t in MATERIAL_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="ct-label">URL</label>
            <input v-model="materialForm.url" class="ct-input" :class="materialErrors.url ? 'border-red-400' : ''" placeholder="https://..." :disabled="materialForm.type === 'Teks'" />
            <p v-if="materialErrors.url" class="text-red-500 text-xs mt-1">{{ materialErrors.url }}</p>
          </div>
        </div>
        <div v-if="materialForm.type === 'Teks'">
          <label class="ct-label">Konten Teks</label>
          <textarea v-model="materialForm.content" class="ct-input resize-none" rows="4" :class="materialErrors.content ? 'border-red-400' : ''" />
          <p v-if="materialErrors.content" class="text-red-500 text-xs mt-1">{{ materialErrors.content }}</p>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="ct-label">Nomor Dokumen</label>
            <input v-model="materialForm.docNumber" class="ct-input" placeholder="cth: DOC-QMS-001" />
          </div>
          <div>
            <label class="ct-label">Revisi</label>
            <input v-model="materialForm.revision" class="ct-input" placeholder="cth: 03" />
          </div>
          <div>
            <label class="ct-label">Tanggal Efektif</label>
            <input v-model="materialForm.effectiveDate" type="date" class="ct-input" />
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="materialFormOpen = false">Batal</BaseButton>
        <BaseButton variant="primary" @click="saveMaterial"><Save class="w-3.5 h-3.5" /> Simpan</BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
