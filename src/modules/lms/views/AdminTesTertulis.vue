<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ClipboardPenLine, Plus, Pencil, Trash2, Save, Eye, X, Search, Check,
} from '@lucide/vue'
import { useLmsTestStore }      from '../../../stores/lmsTestStore.js'
import { useLmsQuestionStore }  from '../../../stores/lmsQuestionStore.js'
import { useLmsCourseStore }    from '../../../stores/lmsCourseStore.js'
import { useToast }             from '../../../shared/composables/useToast.js'
import BaseButton  from '../../../shared/components/BaseButton.vue'
import BaseModal   from '../../../shared/components/BaseModal.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const testStore      = useLmsTestStore()
const questionStore  = useLmsQuestionStore()
const courseStore    = useLmsCourseStore()
const toast          = useToast()

onMounted(() => { testStore.load(); questionStore.load(); courseStore.load() })

function courseTitle(id) { return courseStore.courses.find(c => c.id === id)?.title ?? '—' }

const QUESTION_TYPES = ['PG', 'BS', 'Isian', 'Esai', 'Kasus']
const TYPE_LABELS = { PG: 'Pilihan Ganda', BS: 'Benar / Salah', Isian: 'Isian Singkat', Esai: 'Esai', Kasus: 'Kasus' }

const testRows = computed(() =>
  testStore.tests.map(t => ({
    ...t,
    courseTitle: courseTitle(t.courseId),
    questionCount: testStore.questionsByTest(t.id).length,
  }))
)

const formOpen    = ref(false)
const formErrors  = ref({})
const formLoading = ref(false)
const editingId   = ref(null)

function emptyForm() {
  return {
    id: '', courseId: '', title: '',
    durationMinutes: 30, passGrade: 80, maxAttempts: 3,
    shuffleQuestions: false, shuffleOptions: false,
    openOffsetDays: 0, closeOffsetDays: 7,
    status: 'Draft',
  }
}
const form = ref(emptyForm())

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  selectedQuestionIds.value = []
  formErrors.value = {}
  formOpen.value = true
}

async function openEdit(t) {
  editingId.value = t.id
  form.value = { ...t }
  selectedQuestionIds.value = testStore.questionsByTest(t.id).map(tq => tq.questionId)
  formErrors.value = {}
  formOpen.value = true
}

function validateForm() {
  const e = {}
  if (!form.value.courseId) e.courseId = 'Pilih kursus'
  if (!form.value.title?.trim()) e.title = 'Judul tes wajib diisi'
  if (form.value.durationMinutes < 1) e.durationMinutes = 'Durasi minimal 1 menit'
  if (form.value.passGrade < 1 || form.value.passGrade > 100) e.passGrade = '1–100'
  if (form.value.maxAttempts < 1) e.maxAttempts = 'Minimal 1 percobaan'
  if (selectedQuestionIds.value.length === 0) e.questions = 'Pilih minimal 1 soal'
  return e
}

async function saveTest() {
  formErrors.value = validateForm()
  if (Object.keys(formErrors.value).length) {
    toast.error('Lengkapi semua field yang wajib diisi.')
    return
  }
  formLoading.value = true
  try {
    const rec = { ...form.value, id: editingId.value || `test-${Date.now()}` }
    if (editingId.value) {
      await testStore.updateTest(rec)
      await testStore.setTestQuestions(rec.id, selectedQuestionIds.value)
      toast.success('Tes diperbarui.')
    } else {
      await testStore.addTest(rec)
      await testStore.setTestQuestions(rec.id, selectedQuestionIds.value)
      toast.success('Tes dibuat.')
    }
    formOpen.value = false
  } finally { formLoading.value = false }
}

async function deleteTest(id) {
  if (!confirm('Hapus tes ini?')) return
  await testStore.deleteTest(id)
  toast.success('Tes dihapus.')
}

const selectedQuestionIds = ref([])
const questionSearch    = ref('')
const questionFilterType = ref('')

const availableQuestions = computed(() => {
  if (!form.value.courseId) return []
  return questionStore.questions.filter(q => {
    if (q.courseId !== form.value.courseId) return false
    if (questionSearch.value && !q.text?.toLowerCase().includes(questionSearch.value.toLowerCase())) return false
    if (questionFilterType.value && q.type !== questionFilterType.value) return false
    return true
  })
})

function toggleQuestion(id) {
  const idx = selectedQuestionIds.value.indexOf(id)
  if (idx !== -1) selectedQuestionIds.value.splice(idx, 1)
  else selectedQuestionIds.value.push(id)
}

function isSelected(id) { return selectedQuestionIds.value.includes(id) }

function moveQuestion(idx, dir) {
  const swap = idx + dir
  if (swap < 0 || swap >= selectedQuestionIds.value.length) return
  const arr = [...selectedQuestionIds.value]
  const tmp = arr[idx]; arr[idx] = arr[swap]; arr[swap] = tmp
  selectedQuestionIds.value = arr
}

const selectedQuestions = computed(() =>
  selectedQuestionIds.value
    .map(id => questionStore.questions.find(q => q.id === id))
    .filter(Boolean)
)

const totalPoints = computed(() =>
  selectedQuestions.value.reduce((sum, q) => sum + (q?.points || 0), 0)
)

const previewOpen = ref(false)

function difficultyColor(d) {
  return { Mudah: 'text-emerald-600', Sedang: 'text-amber-600', Sulit: 'text-red-600' }[d] ?? ''
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Tes Tertulis</h1>
        <p class="text-slate-500 text-sm mt-1">Kelola tes: pilih soal, atur durasi, passing grade, dan percobaan</p>
      </div>
      <BaseButton variant="primary" @click="openCreate"><Plus class="w-4 h-4" /> Buat Tes</BaseButton>
    </div>

    <div class="ct-card overflow-hidden">
      <div v-if="testRows.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Judul Tes</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Kursus</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Durasi</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Passing Grade</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Maks Percobaan</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Soal</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="t in testRows" :key="t.id" class="hover:bg-blue-50/20">
              <td class="px-4 py-3 font-medium text-slate-700">{{ t.title }}</td>
              <td class="px-4 py-3 text-slate-600 text-xs max-w-[160px] truncate">{{ t.courseTitle }}</td>
              <td class="px-4 py-3 text-center text-slate-600">{{ t.durationMinutes }} min</td>
              <td class="px-4 py-3 text-center text-slate-600">{{ t.passGrade }}</td>
              <td class="px-4 py-3 text-center text-slate-600">{{ t.maxAttempts }}</td>
              <td class="px-4 py-3 text-center text-slate-600">{{ t.questionCount }}</td>
              <td class="px-4 py-3 text-center"><StatusBadge :status="t.status" /></td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1.5">
                  <button class="ct-action-btn-view" title="Pratinjau" @click="() => { openEdit(t); previewOpen = true }"><Eye class="w-3.5 h-3.5" /></button>
                  <button class="ct-action-btn-edit" @click="openEdit(t)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button class="ct-action-btn-danger" @click="deleteTest(t.id)"><Trash2 class="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center">
        <div class="ct-empty-icon-wrap"><ClipboardPenLine class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Belum ada tes. Klik "Buat Tes" untuk membuat.</p>
      </div>
    </div>

    <BaseModal v-model="formOpen" :title="editingId ? 'Edit Tes' : 'Buat Tes Baru'" size="xl">
      <div class="space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="ct-label">Judul Tes <span class="text-red-500">*</span></label>
            <input v-model="form.title" class="ct-input" :class="formErrors.title ? 'border-red-400' : ''" />
            <p v-if="formErrors.title" class="text-red-500 text-xs mt-1">{{ formErrors.title }}</p>
          </div>
          <div>
            <label class="ct-label">Kursus <span class="text-red-500">*</span></label>
            <select v-model="form.courseId" class="ct-input" :class="formErrors.courseId ? 'border-red-400' : ''">
              <option value="">-- Pilih --</option>
              <option v-for="c in courseStore.courses" :key="c.id" :value="c.id">{{ c.title }}</option>
            </select>
            <p v-if="formErrors.courseId" class="text-red-500 text-xs mt-1">{{ formErrors.courseId }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label class="ct-label">Durasi (menit)</label>
            <input v-model.number="form.durationMinutes" type="number" min="1" class="ct-input" :class="formErrors.durationMinutes ? 'border-red-400' : ''" />
          </div>
          <div>
            <label class="ct-label">Passing Grade</label>
            <input v-model.number="form.passGrade" type="number" min="1" max="100" class="ct-input" :class="formErrors.passGrade ? 'border-red-400' : ''" />
          </div>
          <div>
            <label class="ct-label">Maks Percobaan</label>
            <input v-model.number="form.maxAttempts" type="number" min="1" class="ct-input" :class="formErrors.maxAttempts ? 'border-red-400' : ''" />
          </div>
          <div>
            <label class="ct-label">Status</label>
            <select v-model="form.status" class="ct-input">
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input v-model="form.shuffleQuestions" type="checkbox" class="rounded border-slate-300" /> Acak Soal
          </label>
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input v-model="form.shuffleOptions" type="checkbox" class="rounded border-slate-300" /> Acak Opsi
          </label>
          <div>
            <label class="ct-label">Buka (hari setelah sesi)</label>
            <input v-model.number="form.openOffsetDays" type="number" min="0" class="ct-input" />
          </div>
          <div>
            <label class="ct-label">Tutup (hari setelah sesi)</label>
            <input v-model.number="form.closeOffsetDays" type="number" min="1" class="ct-input" />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Pilih Soal dari Bank Soal</h3>
            <span class="text-xs text-slate-500">{{ selectedQuestionIds.length }} dipilih · {{ totalPoints }} poin total</span>
          </div>
          <p v-if="!form.courseId" class="text-xs text-slate-400 italic">Pilih kursus dulu untuk melihat soal tersedia.</p>
          <div v-else class="space-y-3">
            <div v-if="selectedQuestions.length" class="ct-card p-3 space-y-1.5 bg-blue-50/30">
              <p class="text-xs font-bold text-slate-500 mb-1">Soal Terpilih (urutkan dengan panah)</p>
              <div v-for="(q, i) in selectedQuestions" :key="q.id" class="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-slate-100">
                <div class="flex flex-col text-xs">
                  <button class="text-slate-300 hover:text-blue-600" :disabled="i === 0" @click="moveQuestion(i, -1)">↑</button>
                  <button class="text-slate-300 hover:text-blue-600" :disabled="i === selectedQuestions.length - 1" @click="moveQuestion(i, 1)">↓</button>
                </div>
                <span class="text-xs text-slate-400 w-6">{{ i + 1 }}.</span>
                <span class="text-xs text-slate-500 w-12">{{ q.type }}</span>
                <p class="text-sm text-slate-700 flex-1 truncate">{{ q.text }}</p>
                <span class="text-xs text-slate-400">{{ q.points }}pt</span>
                <button class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600" @click="toggleQuestion(q.id)"><X class="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Search class="w-3.5 h-3.5 text-slate-400" />
                <input v-model="questionSearch" class="ct-input text-xs flex-1 py-1" placeholder="Cari soal..." />
                <select v-model="questionFilterType" class="ct-input text-xs w-auto py-1">
                  <option value="">Semua Tipe</option>
                  <option v-for="t in QUESTION_TYPES" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="max-h-60 overflow-y-auto divide-y divide-slate-50">
                <div
                  v-for="q in availableQuestions"
                  :key="q.id"
                  class="flex items-center gap-2 px-3 py-2 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  @click="toggleQuestion(q.id)"
                >
                  <Check v-if="isSelected(q.id)" class="w-4 h-4 text-emerald-600 shrink-0" />
                  <svg v-else class="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10" /></svg>
                  <span class="text-xs text-slate-500 w-12">{{ q.type }}</span>
                  <p class="text-sm text-slate-700 flex-1 truncate">{{ q.text }}</p>
                  <span class="text-xs" :class="difficultyColor(q.difficulty)">{{ q.difficulty }}</span>
                  <span class="text-xs text-slate-400">{{ q.points }}pt</span>
                </div>
                <div v-if="!availableQuestions.length" class="py-8 text-center text-xs text-slate-400 italic">
                  Tidak ada soal untuk kursus ini.
                </div>
              </div>
            </div>
          </div>
          <p v-if="formErrors.questions" class="text-red-500 text-xs mt-1">{{ formErrors.questions }}</p>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="formOpen = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="formLoading" @click="saveTest"><Save class="w-3.5 h-3.5" /> Simpan</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="previewOpen" :title="`Pratinjau Tes — ${form.title || ''}`" size="lg">
      <div class="space-y-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl text-sm">
          <div><p class="ct-label">Durasi</p><p class="font-medium">{{ form.durationMinutes }} min</p></div>
          <div><p class="ct-label">Passing Grade</p><p class="font-medium">{{ form.passGrade }}</p></div>
          <div><p class="ct-label">Maks Percobaan</p><p class="font-medium">{{ form.maxAttempts }}</p></div>
          <div><p class="ct-label">Total Poin</p><p class="font-medium">{{ totalPoints }}</p></div>
        </div>
        <div v-if="selectedQuestions.length" class="space-y-3">
          <div v-for="(q, i) in selectedQuestions" :key="q.id" class="ct-card p-4">
            <div class="flex items-start gap-3">
              <span class="font-bold text-slate-700 shrink-0">{{ i + 1 }}.</span>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <StatusBadge :status="q.type" variant="blue" />
                  <span class="text-xs text-slate-400">{{ q.points }} poin</span>
                </div>
                <p class="text-sm text-slate-700">{{ q.text }}</p>
                <div v-if="q.type === 'PG'" class="mt-2 space-y-1">
                  <div v-for="(opt, oi) in q.options" :key="oi" class="text-xs text-slate-600 pl-4">
                    {{ String.fromCharCode(65 + oi) }}. {{ opt }}
                  </div>
                </div>
                <div v-else-if="q.type === 'BS'" class="mt-2 text-xs text-slate-600 pl-4">Benar / Salah</div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-8 text-center text-sm text-slate-400 italic">Belum ada soal dipilih.</div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="previewOpen = false">Tutup</BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
