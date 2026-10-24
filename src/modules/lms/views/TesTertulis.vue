<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  FilePen, ArrowLeft, Clock, Flag, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, Play, Award,
} from '@lucide/vue'
import { useLmsTestStore }        from '../../../stores/lmsTestStore.js'
import { useLmsCourseStore }      from '../../../stores/lmsCourseStore.js'
import { useLmsEnrollmentStore }  from '../../../stores/lmsEnrollmentStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useLmsRole }             from '../../../shared/composables/useLmsRole.js'
import { useToast }               from '../../../shared/composables/useToast.js'
import BaseButton    from '../../../shared/components/BaseButton.vue'
import BaseModal     from '../../../shared/components/BaseModal.vue'
import StatusBadge   from '../../../shared/components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const testStore       = useLmsTestStore()
const courseStore     = useLmsCourseStore()
const enrollmentStore = useLmsEnrollmentStore()
const sessionStore    = useTrainingSessionStore()
const { auditorId, isAuditor } = useLmsRole()
const toast = useToast()

const selectedAuditorId = ref('')
const activeAuditorId = computed(() => isAuditor.value && auditorId.value ? auditorId.value : selectedAuditorId.value)

const testId = computed(() => route.currentRoute.value.params.testId)

onMounted(() => {
  testStore.load(); courseStore.load(); enrollmentStore.load(); sessionStore.load()
})

// ── Test list view ────────────────────────────────────────
function courseTitle(id) { return courseStore.courses.find(c => c.id === id)?.title ?? '—' }

const availableTests = computed(() => {
  if (!activeAuditorId.value) return []
  // Show tests from courses the auditor is enrolled in
  const enrolledCourseIds = enrollmentStore.enrollmentsByAuditor(activeAuditorId.value).map(e => e.courseId)
  return testStore.tests.filter(t => enrolledCourseIds.includes(t.courseId))
})

function openTest(tId) {
  router.push(`/lms/tes/${tId}`)
}

// ── Test detail / taking ──────────────────────────────────
const phase = ref('guide') // guide | taking | result | blocked
const currentTest = computed(() => testStore.tests.find(t => t.id === testId.value))
const attemptId = ref(null)
const questions = ref([])
const answers = ref({})
const flagged = ref({})
const currentIdx = ref(0)
const timeLeft = ref(0)
const timerInterval = ref(null)
const result = ref(null)
const submitConfirmOpen = ref(false)
const starting = ref(false)

const myAttempts = computed(() =>
  currentTest.value && activeAuditorId.value
    ? enrollmentStore.attempts.filter(a => a.testId === testId.value && a.auditorId === activeAuditorId.value)
    : []
)

const attemptsUsed = computed(() => myAttempts.value.length)
const canTakeTest = computed(() =>
  currentTest.value && attemptsUsed.value < currentTest.value.maxAttempts
)

const myEnrollment = computed(() =>
  currentTest.value && activeAuditorId.value
    ? enrollmentStore.enrollments.find(e => e.courseId === currentTest.value.courseId && e.auditorId === activeAuditorId.value)
    : null
)

const mySession = computed(() =>
  myEnrollment.value ? sessionStore.sessions.find(s => s.id === myEnrollment.value.sessionId) : null
)

const isWithinTimeWindow = computed(() => {
  if (!currentTest.value || !mySession.value) return true
  const sessionDate = new Date(mySession.value.date)
  const now = new Date()
  const openDate = new Date(sessionDate)
  openDate.setDate(openDate.getDate() + (currentTest.value.openOffsetDays || 0))
  const closeDate = new Date(sessionDate)
  closeDate.setDate(closeDate.getDate() + (currentTest.value.closeOffsetDays || 7))
  return now >= openDate && now <= closeDate
})

const allModulesComplete = computed(() => {
  if (!myEnrollment.value || !currentTest.value) return false
  const mods = courseStore.modulesByCourse(currentTest.value.courseId)
  if (!mods.length) return true
  return mods.every(m => (myEnrollment.value.completedModules ?? []).includes(m.id))
})

const blockReason = computed(() => {
  if (!canTakeTest.value) return `Anda telah menggunakan semua ${currentTest.value?.maxAttempts} percobaan.`
  if (!isWithinTimeWindow.value) return 'Tes di luar jendela waktu yang ditentukan.'
  if (!allModulesComplete.value) return 'Selesaikan semua modul kursus terlebih dahulu.'
  return null
})

async function startTest() {
  if (!activeAuditorId.value || !myEnrollment.value) return
  if (blockReason.value) { phase.value = 'blocked'; return }
  starting.value = true
  try {
    const id = await testStore.startAttempt(testId.value, myEnrollment.value.sessionId, activeAuditorId.value)
    if (!id) { toast.error('Gagal memulai tes.'); starting.value = false; return }
    attemptId.value = id
    const qs = await testStore.getTestQuestions(id)
    if (!qs) { toast.error('Gagal memuat soal.'); starting.value = false; return }
    questions.value = qs
    answers.value = {}
    flagged.value = {}
    currentIdx.value = 0
    // Restore from localStorage if exists
    const saved = localStorage.getItem(`lms_test_${id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        answers.value = parsed.answers ?? {}
        flagged.value = parsed.flagged ?? {}
      } catch { /* ignore */ }
    }
    timeLeft.value = (currentTest.value?.durationMinutes || 30) * 60
    phase.value = 'taking'
    startTimer()
  } finally { starting.value = false }
}

function startTimer() {
  if (timerInterval.value) clearInterval(timerInterval.value)
  timerInterval.value = setInterval(() => {
    timeLeft.value--
    saveToLocal()
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval.value)
      toast.error('Waktu habis. Tes otomatis disubmit.')
      submitTest()
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval.value) { clearInterval(timerInterval.value); timerInterval.value = null }
}

function saveToLocal() {
  if (!attemptId.value) return
  localStorage.setItem(`lms_test_${attemptId.value}`, JSON.stringify({
    answers: answers.value,
    flagged: flagged.value,
  }))
}

const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const currentQuestion = computed(() => questions.value[currentIdx.value])
const answeredCount = computed(() => Object.keys(answers.value).filter(k => answers.value[k] != null && answers.value[k] !== '').length)

function setAnswer(qId, val) {
  answers.value[qId] = val
  saveToLocal()
}
function toggleFlag(qId) {
  flagged.value[qId] = !flagged.value[qId]
  saveToLocal()
}
function goNext() { if (currentIdx.value < questions.value.length - 1) currentIdx.value++ }
function goPrev() { if (currentIdx.value > 0) currentIdx.value-- }
function goTo(idx) { currentIdx.value = idx }

function openSubmitConfirm() {
  submitConfirmOpen.value = true
}

async function submitTest() {
  stopTimer()
  submitConfirmOpen.value = false
  const res = await testStore.submitAttempt(attemptId.value, answers.value)
  if (!res) { toast.error('Gagal submit tes.'); return }
  localStorage.removeItem(`lms_test_${attemptId.value}`)
  result.value = res
  phase.value = 'result'
  await enrollmentStore.load()
}

function backToList() {
  router.push('/lms/tes')
}

onUnmounted(() => stopTimer())

// Reset when testId changes
watch(testId, () => {
  phase.value = 'guide'
  attemptId.value = null
  questions.value = []
  answers.value = {}
  result.value = null
  stopTimer()
})
</script>

<template>
  <div class="p-6 fade-in">
    <!-- ── Test List (no testId) ── -->
    <template v-if="!testId">
      <div class="flex items-start justify-between mb-5">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Tes Tertulis</h1>
          <p class="text-slate-500 text-sm mt-1">Pelaksanaan tes tertulis online via LMS</p>
        </div>
      </div>

      <div v-if="!isAuditor" class="ct-card p-3 mb-4 flex items-center gap-3">
        <label class="text-xs text-slate-500 shrink-0">Lihat sebagai auditor:</label>
        <select v-model="selectedAuditorId" class="ct-input text-xs">
          <option value="">-- Pilih --</option>
          <option v-for="en in [...new Set(enrollmentStore.enrollments.map(e => e.auditorId))]" :key="en" :value="en">{{ en }}</option>
        </select>
      </div>

      <div v-if="!activeAuditorId" class="ct-card py-16 text-center">
        <div class="ct-empty-icon-wrap"><FilePen class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Pilih auditor untuk melihat tes.</p>
      </div>

      <div v-else-if="availableTests.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="t in availableTests" :key="t.id" class="ct-card p-5">
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-bold text-slate-800 text-sm">{{ t.title }}</h3>
            <StatusBadge :status="t.status" />
          </div>
          <p class="text-xs text-slate-500 mb-3">{{ courseTitle(t.courseId) }}</p>
          <div class="grid grid-cols-3 gap-2 text-xs text-slate-600 mb-4">
            <div class="text-center"><p class="text-slate-400">Durasi</p><p class="font-bold">{{ t.durationMinutes }}m</p></div>
            <div class="text-center"><p class="text-slate-400">Passing</p><p class="font-bold">{{ t.passGrade }}</p></div>
            <div class="text-center"><p class="text-slate-400">Percobaan</p><p class="font-bold">{{ enrollmentStore.attempts.filter(a => a.testId === t.id && a.auditorId === activeAuditorId).length }}/{{ t.maxAttempts }}</p></div>
          </div>
          <BaseButton variant="primary" class="w-full" @click="openTest(t.id)">
            <Play class="w-3.5 h-3.5" /> Buka Tes
          </BaseButton>
        </div>
      </div>

      <div v-else class="ct-card py-16 text-center">
        <div class="ct-empty-icon-wrap"><FilePen class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Belum ada tes tersedia.</p>
      </div>
    </template>

    <!-- ── Test Detail (with testId) ── -->
    <template v-else>
      <button class="btn-secondary text-xs flex items-center gap-1 mb-4" @click="backToList">
        <ArrowLeft class="w-3 h-3" /> Kembali ke Daftar Tes
      </button>

      <div v-if="!currentTest" class="ct-card py-16 text-center">
        <p class="text-slate-400 text-sm">Tes tidak ditemukan.</p>
      </div>

      <template v-else>
        <!-- Auditor selector -->
        <div v-if="!isAuditor" class="ct-card p-3 mb-4 flex items-center gap-3">
          <label class="text-xs text-slate-500 shrink-0">Lihat sebagai auditor:</label>
          <select v-model="selectedAuditorId" class="ct-input text-xs">
            <option value="">-- Pilih --</option>
            <option v-for="en in enrollmentStore.enrollments.filter(e => e.courseId === currentTest.courseId)" :key="en.id" :value="en.auditorId">{{ en.auditorId }}</option>
          </select>
        </div>

        <!-- GUIDE phase -->
        <div v-if="phase === 'guide' && activeAuditorId" class="ct-card p-6 max-w-2xl mx-auto">
          <h2 class="text-xl font-bold text-slate-800 mb-2">{{ currentTest.title }}</h2>
          <p class="text-sm text-slate-500 mb-4">{{ courseTitle(currentTest.courseId) }}</p>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl mb-5">
            <div class="text-center"><p class="text-xs text-slate-400">Durasi</p><p class="text-lg font-bold text-slate-700">{{ currentTest.durationMinutes }} menit</p></div>
            <div class="text-center"><p class="text-xs text-slate-400">Passing Grade</p><p class="text-lg font-bold text-slate-700">{{ currentTest.passGrade }}</p></div>
            <div class="text-center"><p class="text-xs text-slate-400">Percobaan</p><p class="text-lg font-bold text-slate-700">{{ attemptsUsed }}/{{ currentTest.maxAttempts }}</p></div>
            <div class="text-center"><p class="text-xs text-slate-400">Soal</p><p class="text-lg font-bold text-slate-700">{{ testStore.questionsByTest(currentTest.id).length }}</p></div>
          </div>

          <div class="ct-card p-4 bg-blue-50/40 border-blue-200 mb-5">
            <h4 class="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Panduan</h4>
            <ul class="text-xs text-slate-600 space-y-1">
              <li>• Tes berlangsung {{ currentTest.durationMinutes }} menit. Timer dimulai saat Anda klik "Mulai Tes".</li>
              <li>• Anda dapat menandai soal sebagai "ragu-ragu" untuk ditinjau kembali.</li>
              <li>• Jawaban tersimpan otomatis selama tes berjalan.</li>
              <li>• Tes akan otomatis disubmit saat waktu habis.</li>
              <li>• Soal pilihan ganda, benar/salah, dan isian dinilai otomatis. Soal esai dinilai manual.</li>
            </ul>
          </div>

          <div v-if="blockReason" class="ct-card p-4 bg-amber-50/40 border-amber-200 mb-5">
            <div class="flex items-center gap-2">
              <AlertTriangle class="w-5 h-5 text-amber-500 shrink-0" />
              <p class="text-sm text-amber-700">{{ blockReason }}</p>
            </div>
          </div>

          <BaseButton
            variant="primary" size="md" class="w-full"
            :disabled="!!blockReason" :loading="starting"
            @click="startTest"
          >
            <Play class="w-4 h-4" /> Mulai Tes
          </BaseButton>
        </div>

        <!-- BLOCKED phase -->
        <div v-if="phase === 'blocked'" class="ct-card p-8 max-w-lg mx-auto text-center">
          <AlertTriangle class="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p class="text-slate-700 font-medium mb-2">Tidak dapat memulai tes</p>
          <p class="text-sm text-slate-500 mb-4">{{ blockReason }}</p>
          <BaseButton variant="secondary" @click="backToList">Kembali</BaseButton>
        </div>

        <!-- TAKING phase -->
        <div v-if="phase === 'taking'" class="max-w-4xl mx-auto">
          <!-- Timer bar -->
          <div class="ct-card p-3 mb-4 flex items-center justify-between sticky top-0 z-10">
            <div class="flex items-center gap-2">
              <Clock class="w-5 h-5" :class="timeLeft < 60 ? 'text-red-500' : 'text-blue-500'" />
              <span class="text-lg font-bold" :class="timeLeft < 60 ? 'text-red-600' : 'text-slate-700'">{{ formattedTime }}</span>
            </div>
            <div class="text-xs text-slate-500">
              Terjawab: <strong>{{ answeredCount }}</strong> / {{ questions.length }}
            </div>
            <BaseButton variant="danger" size="sm" @click="openSubmitConfirm">Submit Tes</BaseButton>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <!-- Question navigator -->
            <div class="lg:col-span-1">
              <div class="ct-card p-3">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Navigasi Soal</p>
                <div class="grid grid-cols-5 gap-1.5">
                  <button
                    v-for="(q, i) in questions"
                    :key="q.id"
                    :class="[
                      currentIdx === i ? 'ring-2 ring-blue-500' : '',
                      answers[q.id] != null && answers[q.id] !== '' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
                      flagged[q.id] ? 'border-amber-400 border-2' : '',
                    ]"
                    class="w-8 h-8 rounded-lg text-xs font-bold transition-all hover:bg-blue-100"
                    @click="goTo(i)"
                  >{{ i + 1 }}</button>
                </div>
                <div class="mt-3 space-y-1 text-xs text-slate-500">
                  <p class="flex items-center gap-1.5"><span class="w-3 h-3 bg-emerald-100 rounded" /> Terjawab</p>
                  <p class="flex items-center gap-1.5"><span class="w-3 h-3 bg-slate-100 rounded" /> Belum dijawab</p>
                  <p class="flex items-center gap-1.5"><span class="w-3 h-3 border-2 border-amber-400 rounded" /> Ragu-ragu</p>
                </div>
              </div>
            </div>

            <!-- Question area -->
            <div class="lg:col-span-3">
              <div v-if="currentQuestion" class="ct-card p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-xs font-bold text-slate-400">Soal {{ currentIdx + 1 }} dari {{ questions.length }}</span>
                  <button
                    :class="flagged[currentQuestion.id] ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-500'"
                    class="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                    @click="toggleFlag(currentQuestion.id)"
                  >
                    <Flag class="w-3.5 h-3.5" /> {{ flagged[currentQuestion.id] ? 'Ragu-ragu' : 'Tandai' }}
                  </button>
                </div>

                <p class="text-sm text-slate-800 mb-4 leading-relaxed">{{ currentQuestion.text }}</p>

                <!-- PG -->
                <div v-if="currentQuestion.type === 'PG'" class="space-y-2">
                  <button
                    v-for="(opt, oi) in currentQuestion.options"
                    :key="oi"
                    :class="answers[currentQuestion.id] === String(oi) ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 hover:border-blue-300'"
                    class="ct-card p-3 w-full text-left flex items-center gap-3 transition-all"
                    @click="setAnswer(currentQuestion.id, String(oi))"
                  >
                    <span
                      :class="answers[currentQuestion.id] === String(oi) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'"
                      class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    >{{ String.fromCharCode(65 + oi) }}</span>
                    <span class="text-sm text-slate-700">{{ opt }}</span>
                  </button>
                </div>

                <!-- BS -->
                <div v-else-if="currentQuestion.type === 'BS'" class="flex gap-3">
                  <button
                    :class="answers[currentQuestion.id] === 'true' ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-200 hover:border-emerald-300'"
                    class="ct-card p-4 flex-1 text-center transition-all"
                    @click="setAnswer(currentQuestion.id, 'true')"
                  >
                    <span class="text-sm font-bold text-slate-700">Benar</span>
                  </button>
                  <button
                    :class="answers[currentQuestion.id] === 'false' ? 'border-red-400 bg-red-50/60' : 'border-slate-200 hover:border-red-300'"
                    class="ct-card p-4 flex-1 text-center transition-all"
                    @click="setAnswer(currentQuestion.id, 'false')"
                  >
                    <span class="text-sm font-bold text-slate-700">Salah</span>
                  </button>
                </div>

                <!-- Isian -->
                <div v-else-if="currentQuestion.type === 'Isian'">
                  <input
                    :value="answers[currentQuestion.id] ?? ''"
                    class="ct-input"
                    placeholder="Ketik jawaban singkat..."
                    @input="setAnswer(currentQuestion.id, $event.target.value)"
                  />
                </div>

                <!-- Esai / Kasus -->
                <div v-else-if="currentQuestion.type === 'Esai' || currentQuestion.type === 'Kasus'">
                  <textarea
                    :value="answers[currentQuestion.id] ?? ''"
                    class="ct-input resize-none"
                    rows="6"
                    placeholder="Tulis jawaban Anda..."
                    @input="setAnswer(currentQuestion.id, $event.target.value)"
                  />
                  <p class="text-xs text-amber-600 mt-1">Soal {{ currentQuestion.type }} akan dinilai manual oleh asessor.</p>
                </div>

                <!-- Navigation -->
                <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                  <BaseButton variant="secondary" size="sm" :disabled="currentIdx === 0" @click="goPrev">
                    <ChevronLeft class="w-3.5 h-3.5" /> Sebelumnya
                  </BaseButton>
                  <span class="text-xs text-slate-400">{{ currentIdx + 1 }} / {{ questions.length }}</span>
                  <BaseButton
                    v-if="currentIdx < questions.length - 1"
                    variant="primary" size="sm"
                    @click="goNext"
                  >Selanjutnya <ChevronRight class="w-3.5 h-3.5" /></BaseButton>
                  <BaseButton v-else variant="danger" size="sm" @click="openSubmitConfirm">Submit</BaseButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RESULT phase -->
        <div v-if="phase === 'result' && result" class="ct-card p-8 max-w-lg mx-auto text-center">
          <div v-if="result.has_manual" class="mb-4">
            <div class="ct-empty-icon-wrap mb-2"><Clock class="w-10 h-10 text-amber-400" /></div>
            <h2 class="text-xl font-bold text-slate-800 mb-1">Menunggu Penilaian</h2>
            <p class="text-sm text-slate-500 mb-4">Tes Anda mengandung soal esai/kasus yang perlu dinilai manual. Skor otomatis: {{ result.auto_score }} poin.</p>
          </div>
          <div v-else class="mb-4">
            <CheckCircle2 v-if="result.passed" class="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <AlertTriangle v-else class="w-12 h-12 text-amber-500 mx-auto mb-2" />
            <h2 class="text-xl font-bold text-slate-800 mb-1">{{ result.passed ? 'LULUS' : 'REMEDIAL' }}</h2>
            <p class="text-3xl font-bold" :class="result.passed ? 'text-emerald-600' : 'text-amber-600'">{{ result.final_score }}</p>
            <p class="text-sm text-slate-500 mt-1">Passing grade: {{ currentTest.passGrade }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl mb-5 text-sm">
            <div><p class="ct-label">Skor Otomatis</p><p class="font-bold text-slate-700">{{ result.auto_score }} poin</p></div>
            <div><p class="ct-label">Total Poin</p><p class="font-bold text-slate-700">{{ result.total_points }}</p></div>
          </div>

          <div class="flex gap-2 justify-center">
            <BaseButton variant="secondary" @click="backToList">Kembali ke Daftar</BaseButton>
            <BaseButton variant="primary" @click="router.push('/lms/hasil')">Lihat Hasil <Award class="w-3.5 h-3.5" /></BaseButton>
          </div>
        </div>
      </template>

      <!-- Submit confirmation -->
      <BaseModal v-model="submitConfirmOpen" title="Konfirmasi Submit" size="md">
        <div class="space-y-3">
          <p class="text-sm text-slate-600">Anda akan men-submit tes ini. Pastikan semua jawaban sudah benar.</p>
          <div class="p-3 bg-slate-50 rounded-xl text-sm">
            <p class="text-slate-600">Terjawab: <strong>{{ answeredCount }}</strong> dari {{ questions.length }} soal</p>
            <p v-if="answeredCount < questions.length" class="text-amber-600 text-xs mt-1">{{ questions.length - answeredCount }} soal belum dijawab.</p>
          </div>
          <p class="text-xs text-slate-400">Anda tidak dapat mengubah jawaban setelah submit.</p>
        </div>
        <template #footer>
          <BaseButton variant="secondary" @click="submitConfirmOpen = false">Batal</BaseButton>
          <BaseButton variant="danger" @click="submitTest">Ya, Submit Tes</BaseButton>
        </template>
      </BaseModal>
    </template>
  </div>
</template>
