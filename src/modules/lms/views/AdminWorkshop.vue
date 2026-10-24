<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Hammer, Plus, Pencil, Trash2, Save, Eye, ChevronDown, ChevronUp,
  ClipboardList, Inbox,
} from '@lucide/vue'
import { useLmsWorkshopStore }    from '../../../stores/lmsWorkshopStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useAuditorStore }        from '../../../stores/auditorStore.js'
import { useToast }               from '../../../shared/composables/useToast.js'
import BaseButton  from '../../../shared/components/BaseButton.vue'
import BaseModal   from '../../../shared/components/BaseModal.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const workshopStore = useLmsWorkshopStore()
const sessionStore  = useTrainingSessionStore()
const auditorStore  = useAuditorStore()
const toast         = useToast()

onMounted(() => { workshopStore.load(); sessionStore.load(); auditorStore.load() })

// ── Session filter ────────────────────────────────────────
const selectedSessionId = ref('')

const lmsSessions = computed(() =>
  sessionStore.sessions.filter(s => s.deliveryMode === 'LMS' || s.deliveryMode === 'Blended')
)

function sessionName(id) { return sessionStore.sessions.find(s => s.id === id)?.trainingName ?? id }
function auditorName(id) { return auditorStore.auditors.find(a => a.id === id)?.name ?? id }

const sessionTasks = computed(() => {
  if (!selectedSessionId.value) return []
  return workshopStore.tasksBySession(selectedSessionId.value)
})

// ── Task form ─────────────────────────────────────────────
const formOpen    = ref(false)
const formErrors  = ref({})
const formLoading = ref(false)
const editingId   = ref(null)

function emptyForm() {
  return {
    id: '', sessionId: '', title: '', brief: '', dueDate: '',
    maxScore: 100,
    rubric: [{ criterion: '', weight: 100, maxScore: 100 }],
  }
}
const form = ref(emptyForm())

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  form.value.sessionId = selectedSessionId.value
  formErrors.value = {}
  formOpen.value = true
}

function openEdit(task) {
  editingId.value = task.id
  form.value = {
    id: task.id, sessionId: task.sessionId, title: task.title,
    brief: task.brief, dueDate: task.dueDate, maxScore: task.maxScore,
    rubric: task.rubric?.length ? task.rubric.map(r => ({ ...r })) : [{ criterion: '', weight: 100, maxScore: 100 }],
  }
  formErrors.value = {}
  formOpen.value = true
}

function addCriterion() {
  form.value.rubric.push({ criterion: '', weight: 0, maxScore: 100 })
  redistributeWeight()
}
function removeCriterion(i) {
  form.value.rubric.splice(i, 1)
  redistributeWeight()
}
function redistributeWeight() {
  const n = form.value.rubric.length
  if (n === 0) return
  const base = Math.floor(100 / n)
  form.value.rubric.forEach((r, i) => { r.weight = i < 100 % n ? base + 1 : base })
}

const totalWeight = computed(() =>
  form.value.rubric.reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
)

function validateForm() {
  const e = {}
  if (!form.value.sessionId) e.sessionId = 'Pilih sesi training'
  if (!form.value.title?.trim()) e.title = 'Judul tugas wajib diisi'
  if (!form.value.dueDate) e.dueDate = 'Batas pengumpulan wajib diisi'
  if (form.value.rubric.length === 0) e.rubric = 'Minimal 1 kriteria rubrik'
  form.value.rubric.forEach((r, i) => {
    if (!r.criterion?.trim()) e[`crit_${i}`] = true
    if (r.maxScore == null || r.maxScore < 1) e[`max_${i}`] = true
  })
  if (totalWeight.value !== 100) e.totalWeight = 'Total bobot harus 100'
  return e
}

async function saveTask() {
  formErrors.value = validateForm()
  if (Object.keys(formErrors.value).length) {
    if (formErrors.totalWeight) toast.error('Total bobot rubrik harus 100.')
    else toast.error('Lengkapi semua field yang wajib diisi.')
    return
  }
  formLoading.value = true
  try {
    const rec = { ...form.value, id: editingId.value || `ws-${Date.now()}` }
    if (editingId.value) { await workshopStore.updateTask(rec); toast.success('Tugas workshop diperbarui.') }
    else { await workshopStore.addTask(rec); toast.success('Tugas workshop ditambahkan.') }
    formOpen.value = false
  } finally { formLoading.value = false }
}

async function deleteTask(id) {
  if (!confirm('Hapus tugas workshop ini?')) return
  await workshopStore.deleteTask(id)
  toast.success('Tugas dihapus.')
}

// ── Submission detail ─────────────────────────────────────
const submissionOpen = ref(false)
const submissionTask = ref(null)
const expandedTaskId = ref(null)

function toggleSubmissions(task) {
  expandedTaskId.value = expandedTaskId.value === task.id ? null : task.id
}
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Workshop</h1>
        <p class="text-slate-500 text-sm mt-1">Kelola tugas workshop, rubrik penilaian, dan pengumpulan</p>
      </div>
      <BaseButton variant="primary" :disabled="!selectedSessionId" @click="openCreate">
        <Plus class="w-4 h-4" /> Tambah Tugas
      </BaseButton>
    </div>

    <!-- Session selector -->
    <div class="ct-card p-4 mb-4">
      <label class="ct-label">Pilih Sesi Training (LMS / Blended)</label>
      <select v-model="selectedSessionId" class="ct-input">
        <option value="">-- Pilih sesi --</option>
        <option v-for="s in lmsSessions" :key="s.id" :value="s.id">
          {{ s.trainingName }} · {{ s.date }} · {{ s.deliveryMode }}
        </option>
      </select>
    </div>

    <!-- Task list -->
    <div v-if="selectedSessionId" class="space-y-4">
      <div v-if="sessionTasks.length" class="space-y-3">
        <div v-for="task in sessionTasks" :key="task.id" class="ct-card overflow-hidden">
          <!-- Task header -->
          <div class="px-5 py-4 flex items-center gap-3 border-b border-slate-100">
            <div class="flex-1">
              <p class="font-semibold text-slate-800 text-sm">{{ task.title }}</p>
              <p class="text-xs text-slate-500 mt-0.5 line-clamp-1">{{ task.brief || 'Tanpa brief' }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-400">Batas Kumpul</p>
              <p class="text-sm font-medium text-slate-600">{{ task.dueDate }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-400">Skor Maks</p>
              <p class="text-sm font-medium text-slate-600">{{ task.maxScore }}</p>
            </div>
            <button class="ct-action-btn-edit" @click="openEdit(task)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
            <button class="ct-action-btn-danger" @click="deleteTask(task.id)"><Trash2 class="w-3.5 h-3.5" /></button>
            <button
              :class="expandedTaskId === task.id ? 'ct-action-btn-view bg-blue-50' : 'ct-action-btn-view'"
              title="Lihat pengumpulan"
              @click="toggleSubmissions(task)"
            >
              <component :is="expandedTaskId === task.id ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Rubric preview -->
          <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Rubrik Penilaian</p>
            <div class="flex flex-wrap gap-2">
              <div v-for="(r, i) in task.rubric" :key="i" class="ct-card px-3 py-1.5 text-xs">
                <span class="font-medium text-slate-700">{{ r.criterion }}</span>
                <span class="text-slate-400 ml-2">· {{ r.weight }}% · max {{ r.maxScore }}</span>
              </div>
            </div>
          </div>

          <!-- Submissions -->
          <div v-if="expandedTaskId === task.id" class="px-5 py-3">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pengumpulan ({{ workshopStore.submissionsByTask(task.id).length }})
            </p>
            <div v-if="workshopStore.submissionsByTask(task.id).length" class="space-y-2">
              <div
                v-for="sub in workshopStore.submissionsByTask(task.id)"
                :key="sub.id"
                class="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50"
              >
                <span class="font-medium text-sm text-slate-700 flex-1">{{ auditorName(sub.auditorId) }}</span>
                <span class="text-xs text-slate-400">{{ sub.submittedAt?.slice(0, 10) }}</span>
                <span v-if="sub.score != null" class="text-sm font-bold" :class="sub.score >= task.maxScore * 0.8 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ sub.score }}/{{ task.maxScore }}
                </span>
                <StatusBadge :status="sub.status" />
                <a v-if="sub.fileUrl" :href="sub.fileUrl" target="_blank" class="ct-action-btn-view" title="Buka file">
                  <Eye class="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div v-else class="py-6 text-center">
              <div class="ct-empty-icon-wrap"><Inbox class="w-8 h-8 text-slate-300" /></div>
              <p class="text-slate-400 italic text-xs">Belum ada pengumpulan</p>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="ct-card py-16 text-center">
        <div class="ct-empty-icon-wrap"><Hammer class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Belum ada tugas workshop untuk sesi ini.</p>
      </div>
    </div>

    <!-- No session selected -->
    <div v-else class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><ClipboardList class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Pilih sesi training di atas untuk melihat tugas workshop.</p>
    </div>

    <!-- ── Task Form Modal ── -->
    <BaseModal v-model="formOpen" :title="editingId ? 'Edit Tugas Workshop' : 'Tambah Tugas Workshop'" size="xl">
      <div class="space-y-5">
        <!-- Session + title -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="ct-label">Sesi Training <span class="text-red-500">*</span></label>
            <select v-model="form.sessionId" class="ct-input" :class="formErrors.sessionId ? 'border-red-400' : ''">
              <option value="">-- Pilih --</option>
              <option v-for="s in lmsSessions" :key="s.id" :value="s.id">{{ s.trainingName }} · {{ s.date }}</option>
            </select>
            <p v-if="formErrors.sessionId" class="text-red-500 text-xs mt-1">{{ formErrors.sessionId }}</p>
          </div>
          <div>
            <label class="ct-label">Batas Pengumpulan <span class="text-red-500">*</span></label>
            <input v-model="form.dueDate" type="date" class="ct-input" :class="formErrors.dueDate ? 'border-red-400' : ''" />
            <p v-if="formErrors.dueDate" class="text-red-500 text-xs mt-1">{{ formErrors.dueDate }}</p>
          </div>
        </div>

        <div>
          <label class="ct-label">Judul Tugas <span class="text-red-500">*</span></label>
          <input v-model="form.title" class="ct-input" :class="formErrors.title ? 'border-red-400' : ''" />
          <p v-if="formErrors.title" class="text-red-500 text-xs mt-1">{{ formErrors.title }}</p>
        </div>

        <div>
          <label class="ct-label">Brief / Instruksi Tugas</label>
          <textarea v-model="form.brief" class="ct-input resize-none" rows="3" placeholder="Instruksi tugas workshop untuk peserta..." />
        </div>

        <!-- Rubric builder -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Rubrik Penilaian</h3>
            <span class="text-xs" :class="totalWeight === 100 ? 'text-emerald-600' : 'text-red-500'">
              Total Bobot: {{ totalWeight }}% {{ totalWeight === 100 ? '✓' : '(harus 100%)' }}
            </span>
          </div>
          <div class="space-y-2">
            <div v-for="(r, i) in form.rubric" :key="i" class="flex items-center gap-2">
              <input
                v-model="r.criterion"
                class="ct-input flex-1 py-1.5"
                :class="formErrors[`crit_${i}`] ? 'border-red-400' : ''"
                placeholder="Kriteria penilaian"
              />
              <div class="flex items-center gap-1">
                <input v-model.number="r.weight" type="number" min="0" max="100" class="ct-input w-16 text-center py-1.5" placeholder="0" />
                <span class="text-xs text-slate-400">%</span>
              </div>
              <div class="flex items-center gap-1">
                <input v-model.number="r.maxScore" type="number" min="1" class="ct-input w-16 text-center py-1.5" :class="formErrors[`max_${i}`] ? 'border-red-400' : ''" placeholder="100" />
                <span class="text-xs text-slate-400">max</span>
              </div>
              <button v-if="form.rubric.length > 1" class="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600" @click="removeCriterion(i)">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <button class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2" @click="addCriterion">
            <Plus class="w-3 h-3" /> Tambah Kriteria
          </button>
          <p v-if="formErrors.totalWeight" class="text-red-500 text-xs mt-1">{{ formErrors.totalWeight }}</p>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="formOpen = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="formLoading" @click="saveTask"><Save class="w-3.5 h-3.5" /> Simpan</BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
