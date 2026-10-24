<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  FileQuestion, Plus, Pencil, Trash2, Save, Download, Upload, X,
  CheckCircle2, Circle, Search,
} from '@lucide/vue'
import * as XLSX from 'xlsx'
import { useLmsQuestionStore } from '../../../stores/lmsQuestionStore.js'
import { useLmsCourseStore }   from '../../../stores/lmsCourseStore.js'
import { useToast }            from '../../../shared/composables/useToast.js'
import BaseButton  from '../../../shared/components/BaseButton.vue'
import BaseModal   from '../../../shared/components/BaseModal.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const questionStore = useLmsQuestionStore()
const courseStore   = useLmsCourseStore()
const toast         = useToast()

onMounted(() => { questionStore.load(); courseStore.load() })

const search     = ref('')
const filterCourse = ref('')
const filterType = ref('')
const filterDifficulty = ref('')
const filterClause = ref('')

const QUESTION_TYPES  = ['PG', 'BS', 'Isian', 'Esai', 'Kasus']
const DIFFICULTY_OPTS = ['Mudah', 'Sedang', 'Sulit']
const TYPE_LABELS = { PG: 'Pilihan Ganda', BS: 'Benar / Salah', Isian: 'Isian Singkat', Esai: 'Esai', Kasus: 'Kasus' }

function courseTitle(id) { return courseStore.courses.find(c => c.id === id)?.title ?? '—' }

const filteredQuestions = computed(() => {
  return questionStore.questions.filter(q => {
    if (search.value && !q.text?.toLowerCase().includes(search.value.toLowerCase())) return false
    if (filterCourse.value && q.courseId !== filterCourse.value) return false
    if (filterType.value && q.type !== filterType.value) return false
    if (filterDifficulty.value && q.difficulty !== filterDifficulty.value) return false
    if (filterClause.value && !q.clauseTag?.toLowerCase().includes(filterClause.value.toLowerCase())) return false
    return true
  })
})

const formOpen    = ref(false)
const formErrors  = ref({})
const formLoading = ref(false)
const editingId   = ref(null)
const answerKey   = ref({ answer: null, explanation: '' })

function emptyForm() {
  return {
    id: '', courseId: '', type: 'PG',
    text: '', options: ['', '', '', ''],
    correctOption: 0,
    bsAnswer: 'true',
    isianAnswers: [''],
    clauseTag: '', difficulty: 'Sedang', points: 1,
  }
}
const form = ref(emptyForm())

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  answerKey.value = { answer: null, explanation: '' }
  formErrors.value = {}
  formOpen.value = true
}

async function openEdit(q) {
  editingId.value = q.id
  form.value = {
    id: q.id, courseId: q.courseId, type: q.type,
    text: q.text, options: q.options?.length ? [...q.options] : ['', '', '', ''],
    correctOption: 0, bsAnswer: 'true', isianAnswers: [''],
    clauseTag: q.clauseTag, difficulty: q.difficulty, points: q.points,
  }
  answerKey.value = { answer: null, explanation: '' }
  formErrors.value = {}
  const key = await questionStore.getQuestionKey(q.id)
  if (key) {
    answerKey.value = { answer: key.answer, explanation: key.explanation ?? '' }
    if (q.type === 'PG' && key.answer != null) {
      form.value.correctOption = Number(key.answer) || 0
    } else if (q.type === 'BS') {
      form.value.bsAnswer = String(key.answer)
    } else if (q.type === 'Isian' && Array.isArray(key.answer)) {
      form.value.isianAnswers = key.answer.map(a => String(a))
    }
  }
  formOpen.value = true
}

function addOption() { form.value.options.push('') }
function removeOption(i) { form.value.options.splice(i, 1) }
function addIsianAnswer() { form.value.isianAnswers.push('') }
function removeIsianAnswer(i) { form.value.isianAnswers.splice(i, 1) }

function validateForm() {
  const e = {}
  if (!form.value.courseId) e.courseId = 'Pilih kursus'
  if (!form.value.text?.trim()) e.text = 'Teks soal wajib diisi'
  if (form.value.type === 'PG') {
    form.value.options.forEach((opt, i) => {
      if (!opt?.trim()) e[`opt_${i}`] = true
    })
    if (form.value.options.length < 2) e.options = 'Minimal 2 opsi'
  }
  if (form.value.type === 'Isian') {
    if (!form.value.isianAnswers.some(a => a?.trim())) e.isianAnswers = 'Minimal 1 jawaban benar'
  }
  if (form.value.points == null || form.value.points < 1) e.points = 'Poin minimal 1'
  return e
}

function buildKey() {
  if (form.value.type === 'PG') {
    return { answer: form.value.correctOption, explanation: answerKey.value.explanation }
  } else if (form.value.type === 'BS') {
    return { answer: form.value.bsAnswer === 'true', explanation: answerKey.value.explanation }
  } else if (form.value.type === 'Isian') {
    return { answer: form.value.isianAnswers.filter(a => a?.trim()), explanation: answerKey.value.explanation }
  } else {
    return { answer: answerKey.value.explanation || '', explanation: answerKey.value.explanation }
  }
}

async function saveQuestion() {
  formErrors.value = validateForm()
  if (Object.keys(formErrors.value).length) {
    toast.error('Lengkapi semua field yang wajib diisi.')
    return
  }
  formLoading.value = true
  try {
    const question = {
      id: editingId.value || '',
      courseId: form.value.courseId,
      type: form.value.type,
      text: form.value.text,
      options: form.value.type === 'PG' ? form.value.options : form.value.type === 'BS' ? ['Benar', 'Salah'] : [],
      clauseTag: form.value.clauseTag,
      difficulty: form.value.difficulty,
      points: Number(form.value.points),
    }
    const key = buildKey()
    const id = await questionStore.upsertQuestion(question, key)
    if (id) {
      toast.success(editingId.value ? 'Soal diperbarui.' : 'Soal ditambahkan.')
      formOpen.value = false
    } else {
      toast.error('Gagal menyimpan soal.')
    }
  } finally { formLoading.value = false }
}

async function deleteQuestion(id) {
  if (!confirm('Hapus soal ini?')) return
  await questionStore.deleteQuestion(id)
  toast.success('Soal dihapus.')
}

const importOpen = ref(false)
const fileInput  = ref(null)

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet([
    { course_id: 'course-id-disini', type: 'PG', text: 'Pertanyaan...', options: 'Opsi A|Opsi B|Opsi C|Opsi D', correct_option: 0, isian_answers: '', clause_tag: '7.1.2', difficulty: 'Sedang', points: 1, explanation: 'Penjelasan jawaban' },
    { course_id: 'course-id-disini', type: 'BS', text: 'Pernyataan...', options: '', correct_option: '', isian_answers: 'true', clause_tag: '', difficulty: 'Mudah', points: 1, explanation: '' },
    { course_id: 'course-id-disini', type: 'Isian', text: 'Isi titik titik...', options: '', correct_option: '', isian_answers: 'jawaban1|jawaban2', clause_tag: '', difficulty: 'Sedang', points: 2, explanation: '' },
    { course_id: 'course-id-disini', type: 'Esai', text: 'Jelaskan...', options: '', correct_option: '', isian_answers: '', clause_tag: '', difficulty: 'Sulit', points: 5, explanation: 'Rubrik penilaian...' },
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template Soal')
  XLSX.writeFile(wb, 'template_soal_lms.xlsx')
  toast.success('Template diunduh.')
}

async function handleFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws)
    let success = 0, fail = 0
    for (const row of rows) {
      if (!row.course_id || !row.type || !row.text) { fail++; continue }
      const type = String(row.type).trim()
      if (!QUESTION_TYPES.includes(type)) { fail++; continue }
      const q = {
        id: '',
        courseId: String(row.course_id).trim(),
        type,
        text: String(row.text),
        options: type === 'PG' ? String(row.options || '').split('|').map(s => s.trim()) : type === 'BS' ? ['Benar', 'Salah'] : [],
        clauseTag: String(row.clause_tag || ''),
        difficulty: DIFFICULTY_OPTS.includes(String(row.difficulty)) ? String(row.difficulty) : 'Sedang',
        points: Number(row.points) || 1,
      }
      let key
      if (type === 'PG') {
        key = { answer: Number(row.correct_option) || 0, explanation: String(row.explanation || '') }
      } else if (type === 'BS') {
        key = { answer: String(row.isian_answers || '').trim().toLowerCase() === 'true', explanation: String(row.explanation || '') }
      } else if (type === 'Isian') {
        key = { answer: String(row.isian_answers || '').split('|').map(s => s.trim()).filter(Boolean), explanation: String(row.explanation || '') }
      } else {
        key = { answer: String(row.explanation || ''), explanation: String(row.explanation || '') }
      }
      const id = await questionStore.upsertQuestion(q, key)
      if (id) success++; else fail++
    }
    toast.success(`${success} soal diimpor${fail > 0 ? `, ${fail} gagal` : ''}.`)
    importOpen.value = false
  } catch {
    toast.error('Gagal membaca file Excel.')
  }
  if (fileInput.value) fileInput.value.value = ''
}

function difficultyColor(d) {
  return { Mudah: 'text-emerald-600', Sedang: 'text-amber-600', Sulit: 'text-red-600' }[d] ?? ''
}
function answerPreview(q) {
  if (q.type === 'PG') return `Jawaban: ${String.fromCharCode(65 + (answerKey.value.answer ?? 0))}`
  if (q.type === 'BS') return `Jawaban: ${answerKey.value.answer === true ? 'Benar' : 'Salah'}`
  if (q.type === 'Isian') return `Jawaban: ${(answerKey.value.answer ?? []).join(' / ')}`
  return 'Manual'
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Bank Soal</h1>
        <p class="text-slate-500 text-sm mt-1">Kelola soal pilihan ganda, benar/salah, isian, esai, dan kasus</p>
      </div>
      <div class="flex gap-2">
        <BaseButton variant="secondary" @click="importOpen = true"><Upload class="w-4 h-4" /> Import Excel</BaseButton>
        <BaseButton variant="primary" @click="openCreate"><Plus class="w-4 h-4" /> Tambah Soal</BaseButton>
      </div>
    </div>

    <div class="ct-card p-4 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div class="md:col-span-2 relative">
          <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input v-model="search" class="ct-input pl-9" placeholder="Cari teks soal..." />
        </div>
        <select v-model="filterCourse" class="ct-input text-xs">
          <option value="">Semua Kursus</option>
          <option v-for="c in courseStore.courses" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
        <select v-model="filterType" class="ct-input text-xs">
          <option value="">Semua Tipe</option>
          <option v-for="t in QUESTION_TYPES" :key="t" :value="t">{{ TYPE_LABELS[t] }}</option>
        </select>
        <select v-model="filterDifficulty" class="ct-input text-xs">
          <option value="">Semua Tingkat</option>
          <option v-for="d in DIFFICULTY_OPTS" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div class="flex items-center gap-3 mt-3">
        <input v-model="filterClause" class="ct-input text-xs flex-1" placeholder="Filter tag klausul (cth: 7.1.2)..." />
        <span class="text-xs text-slate-400">{{ filteredQuestions.length }} soal</span>
      </div>
    </div>

    <div class="ct-card overflow-hidden">
      <div v-if="filteredQuestions.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Soal</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Kursus</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Tipe</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Klausul</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Tingkat</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Poin</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="q in filteredQuestions" :key="q.id" class="hover:bg-blue-50/20">
              <td class="px-4 py-3 max-w-md">
                <p class="text-slate-700 text-sm line-clamp-2">{{ q.text }}</p>
              </td>
              <td class="px-4 py-3 text-slate-600 text-xs max-w-[160px] truncate">{{ courseTitle(q.courseId) }}</td>
              <td class="px-4 py-3 text-center"><StatusBadge :status="q.type" :variant="q.type === 'Esai' || q.type === 'Kasus' ? 'amber' : 'blue'" /></td>
              <td class="px-4 py-3 text-center text-slate-500 text-xs">{{ q.clauseTag || '—' }}</td>
              <td class="px-4 py-3 text-center">
                <span class="text-xs font-semibold" :class="difficultyColor(q.difficulty)">{{ q.difficulty }}</span>
              </td>
              <td class="px-4 py-3 text-center text-slate-600 font-medium">{{ q.points }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1.5">
                  <button class="ct-action-btn-edit" @click="openEdit(q)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button class="ct-action-btn-danger" @click="deleteQuestion(q.id)"><Trash2 class="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center">
        <div class="ct-empty-icon-wrap"><FileQuestion class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Belum ada soal. Klik "Tambah Soal" atau import dari Excel.</p>
      </div>
    </div>

    <BaseModal v-model="formOpen" :title="editingId ? 'Edit Soal' : 'Tambah Soal'" size="xl">
      <div class="space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="md:col-span-2">
            <label class="ct-label">Kursus <span class="text-red-500">*</span></label>
            <select v-model="form.courseId" class="ct-input" :class="formErrors.courseId ? 'border-red-400' : ''">
              <option value="">-- Pilih --</option>
              <option v-for="c in courseStore.courses" :key="c.id" :value="c.id">{{ c.title }}</option>
            </select>
            <p v-if="formErrors.courseId" class="text-red-500 text-xs mt-1">{{ formErrors.courseId }}</p>
          </div>
          <div>
            <label class="ct-label">Tipe Soal</label>
            <select v-model="form.type" class="ct-input">
              <option v-for="t in QUESTION_TYPES" :key="t" :value="t">{{ TYPE_LABELS[t] }}</option>
            </select>
          </div>
          <div>
            <label class="ct-label">Poin</label>
            <input v-model.number="form.points" type="number" min="1" class="ct-input" :class="formErrors.points ? 'border-red-400' : ''" />
          </div>
        </div>

        <div>
          <label class="ct-label">Teks Soal <span class="text-red-500">*</span></label>
          <textarea v-model="form.text" class="ct-input resize-none" rows="3" :class="formErrors.text ? 'border-red-400' : ''" placeholder="Tulis pertanyaan..." />
          <p v-if="formErrors.text" class="text-red-500 text-xs mt-1">{{ formErrors.text }}</p>
        </div>

        <div v-if="form.type === 'PG'">
          <label class="ct-label">Opsi Jawaban <span class="text-red-500">*</span></label>
          <div class="space-y-2">
            <div v-for="(opt, i) in form.options" :key="i" class="flex items-center gap-2">
              <button
                :class="form.correctOption === i ? 'text-emerald-600' : 'text-slate-300'"
                class="shrink-0"
                @click="form.correctOption = i"
                title="Tandai jawaban benar"
              >
                <CheckCircle2 v-if="form.correctOption === i" class="w-5 h-5" />
                <Circle v-else class="w-5 h-5" />
              </button>
              <span class="text-xs font-bold text-slate-400 w-5">{{ String.fromCharCode(65 + i) }}</span>
              <input v-model="form.options[i]" class="ct-input flex-1" :class="formErrors[`opt_${i}`] ? 'border-red-400' : ''" :placeholder="`Opsi ${String.fromCharCode(65 + i)}`" />
              <button v-if="form.options.length > 2" class="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600" @click="removeOption(i)">
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
          <button class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2" @click="addOption">
            <Plus class="w-3 h-3" /> Tambah Opsi
          </button>
          <p class="text-xs text-slate-400 mt-1">Klik lingkaran hijau untuk menandai jawaban benar.</p>
        </div>

        <div v-if="form.type === 'BS'">
          <label class="ct-label">Jawaban Benar</label>
          <div class="flex gap-3">
            <button
              :class="form.bsAnswer === 'true' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'ring-1 ring-slate-200'"
              class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              @click="form.bsAnswer = 'true'"
            >Benar</button>
            <button
              :class="form.bsAnswer === 'false' ? 'ring-2 ring-red-500 bg-red-50' : 'ring-1 ring-slate-200'"
              class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              @click="form.bsAnswer = 'false'"
            >Salah</button>
          </div>
        </div>

        <div v-if="form.type === 'Isian'">
          <label class="ct-label">Jawaban Benar (boleh beberapa) <span class="text-red-500">*</span></label>
          <div class="space-y-2">
            <div v-for="(ans, i) in form.isianAnswers" :key="i" class="flex items-center gap-2">
              <input v-model="form.isianAnswers[i]" class="ct-input flex-1" placeholder="Jawaban yang diterima" />
              <button v-if="form.isianAnswers.length > 1" class="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600" @click="removeIsianAnswer(i)">
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
          <button class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2" @click="addIsianAnswer">
            <Plus class="w-3 h-3" /> Tambah Jawaban
          </button>
          <p v-if="formErrors.isianAnswers" class="text-red-500 text-xs mt-1">{{ formErrors.isianAnswers }}</p>
        </div>

        <div v-if="form.type === 'Esai' || form.type === 'Kasus'">
          <label class="ct-label">Rubrik / Panduan Penilaian</label>
          <textarea v-model="answerKey.explanation" class="ct-input resize-none" rows="3" placeholder="Rubrik penilaian untuk asessor..." />
          <p class="text-xs text-slate-400 mt-1">Soal {{ form.type }} dinilai manual oleh asessor.</p>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="ct-label">Tag Klausul</label>
            <input v-model="form.clauseTag" class="ct-input" placeholder="cth: 8.5.1" />
          </div>
          <div>
            <label class="ct-label">Tingkat Kesulitan</label>
            <select v-model="form.difficulty" class="ct-input">
              <option v-for="d in DIFFICULTY_OPTS" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div v-if="form.type !== 'Esai' && form.type !== 'Kasus'">
            <label class="ct-label">Penjelasan (opsional)</label>
            <input v-model="answerKey.explanation" class="ct-input" placeholder="Penjelasan jawaban" />
          </div>
        </div>

        <div v-if="editingId && answerKey.answer != null" class="bg-slate-50 rounded-lg px-4 py-3 text-sm">
          <p class="ct-label">Kunci Jawaban Saat Ini</p>
          <p class="text-slate-700 font-medium">{{ answerPreview(form) }}</p>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="formOpen = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="formLoading" @click="saveQuestion"><Save class="w-3.5 h-3.5" /> Simpan</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="importOpen" title="Import Soal dari Excel" size="md">
      <div class="space-y-4">
        <p class="text-sm text-slate-600">Unduh template, isi data soal, lalu unggah kembali.</p>
        <BaseButton variant="secondary" @click="downloadTemplate"><Download class="w-4 h-4" /> Unduh Template</BaseButton>
        <div class="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <Upload class="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p class="text-sm text-slate-500 mb-2">Pilih file .xlsx</p>
          <input ref="fileInput" type="file" accept=".xlsx,.xls" class="text-xs" @change="handleFileUpload" />
        </div>
        <div class="text-xs text-slate-400 space-y-1">
          <p><strong>Format kolom:</strong> course_id, type, text, options (PG: dipisah |), correct_option (PG: 0-3), isian_answers (Isian: dipisah |, BS: true/false), clause_tag, difficulty, points, explanation</p>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="importOpen = false">Tutup</BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
