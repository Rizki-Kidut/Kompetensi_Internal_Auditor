<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ClipboardCheck, FilePen, Wrench, Save, ChevronRight,
} from '@lucide/vue'
import { useLmsEnrollmentStore }  from '../../../stores/lmsEnrollmentStore.js'
import { useLmsTestStore }        from '../../../stores/lmsTestStore.js'
import { useLmsQuestionStore }    from '../../../stores/lmsQuestionStore.js'
import { useLmsWorkshopStore }    from '../../../stores/lmsWorkshopStore.js'
import { useAuditorStore }        from '../../../stores/auditorStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useLmsRole }             from '../../../shared/composables/useLmsRole.js'
import { useToast }               from '../../../shared/composables/useToast.js'
import BaseButton  from '../../../shared/components/BaseButton.vue'
import BaseModal   from '../../../shared/components/BaseModal.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const enrollmentStore = useLmsEnrollmentStore()
const testStore       = useLmsTestStore()
const questionStore   = useLmsQuestionStore()
const workshopStore   = useLmsWorkshopStore()
const auditorStore    = useAuditorStore()
const sessionStore    = useTrainingSessionStore()
const { auditorId }   = useLmsRole()
const toast           = useToast()

onMounted(() => {
  enrollmentStore.load(); testStore.load(); questionStore.load()
  workshopStore.load(); auditorStore.load(); sessionStore.load()
})

// ── Helpers ───────────────────────────────────────────────
function auditorName(id) { return auditorStore.auditors.find(a => a.id === id)?.name ?? id }
function sessionName(id) { return sessionStore.sessions.find(s => s.id === id)?.trainingName ?? id }
function testTitle(id) { return testStore.tests.find(t => t.id === id)?.title ?? id }
function taskTitle(id) { return workshopStore.tasks.find(t => t.id === id)?.title ?? id }
function questionText(id) { return questionStore.questions.find(q => q.id === id)?.text ?? '—' }
function questionType(id) { return questionStore.questions.find(q => q.id === id)?.type ?? '' }
function questionPoints(id) { return questionStore.questions.find(q => q.id === id)?.points ?? 1 }

// ── Grading queue ─────────────────────────────────────────
const filterType = ref('semua') // semua|tes|workshop

const pendingAttempts = computed(() =>
  enrollmentStore.attempts.filter(a => a.status === 'Menunggu Penilaian')
)

const pendingSubmissions = computed(() =>
  workshopStore.submissions.filter(s => s.status === 'Dikirim')
)

const queueItems = computed(() => {
  const tests = pendingAttempts.value.map(a => ({
    id: a.id, kind: 'tes', auditorName: auditorName(a.auditorId),
    sessionName: sessionName(a.sessionId), testTitle: testTitle(a.testId),
    submittedAt: a.submittedAt, ref: a,
  }))
  const workshops = pendingSubmissions.value.map(s => ({
    id: s.id, kind: 'workshop', auditorName: auditorName(s.auditorId),
    sessionName: sessionName(s.sessionId), testTitle: taskTitle(s.taskId),
    submittedAt: s.submittedAt, ref: s,
  }))
  const all = [...tests, ...workshops]
  if (filterType.value === 'tes') return all.filter(i => i.kind === 'tes')
  if (filterType.value === 'workshop') return all.filter(i => i.kind === 'workshop')
  return all
})

// ── Test grading panel ────────────────────────────────────
const gradeOpen      = ref(false)
const gradingItem    = ref(null)
const gradingKind    = ref('') // 'tes' or 'workshop'
const manualScores   = ref({}) // { questionId: points }
const workshopScores = ref({}) // { criterionIndex: score }
const feedback       = ref('')
const gradeLoading   = ref(false)

const gradingQuestions = computed(() => {
  if (!gradingItem.value || gradingKind.value !== 'tes') return []
  const attempt = gradingItem.value
  const tqIds = testStore.questionsByTest(attempt.testId).map(tq => tq.questionId)
  return tqIds.map(qid => questionStore.questions.find(q => q.id === qid)).filter(Boolean)
})

const manualQuestions = computed(() =>
  gradingQuestions.value.filter(q => q.type === 'Esai' || q.type === 'Kasus')
)

const gradingTask = computed(() => {
  if (!gradingItem.value || gradingKind.value !== 'workshop') return null
  return workshopStore.tasks.find(t => t.id === gradingItem.value.taskId) ?? null
})

function openGradeTes(item) {
  gradingKind.value = 'tes'
  gradingItem.value = item.ref
  manualScores.value = {}
  // Pre-fill existing manual scores if any
  if (item.ref.manualScore != null) {
    // Can't recover individual scores; start fresh
  }
  gradeOpen.value = true
}

function openGradeWorkshop(item) {
  gradingKind.value = 'workshop'
  gradingItem.value = item.ref
  workshopScores.value = {}
  feedback.value = item.ref.feedback || ''
  gradeOpen.value = true
}

const computedWorkshopScore = computed(() => {
  if (!gradingTask.value) return 0
  const rubric = gradingTask.value.rubric || []
  let total = 0
  rubric.forEach((r, i) => {
    const score = Number(workshopScores.value[i]) || 0
    const max = Number(r.maxScore) || 100
    const weight = Number(r.weight) || 0
    total += (score / max) * weight
  })
  return Math.round(total * gradingTask.value.maxScore / 100)
})

async function submitTestGrade() {
  if (!gradingItem.value) return
  gradeLoading.value = true
  try {
    const result = await enrollmentStore.gradeAttempt(gradingItem.value.id, manualScores.value)
    if (result) {
      toast.success(`Tes dinilai. Nilai akhir: ${result.final_score} — ${result.passed ? 'LULUS' : 'TIDAK LULUS'}`)
      gradeOpen.value = false
    } else {
      toast.error('Gagal menyimpan nilai.')
    }
  } finally { gradeLoading.value = false }
}

async function submitWorkshopGrade() {
  if (!gradingItem.value || !gradingTask.value) return
  gradeLoading.value = true
  try {
    const score = computedWorkshopScore.value
    const rubricScores = {}
    Object.entries(workshopScores.value).forEach(([k, v]) => { rubricScores[k] = Number(v) || 0 })
    const updated = {
      ...gradingItem.value,
      rubricScores,
      score,
      feedback: feedback.value,
      assessor: auditorId.value || 'Admin',
      status: 'Dinilai',
    }
    await workshopStore.updateSubmission(updated)
    toast.success(`Workshop dinilai. Skor: ${score}/${gradingTask.value.maxScore}`)
    gradeOpen.value = false
  } finally { gradeLoading.value = false }
}
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Penilaian</h1>
        <p class="text-slate-500 text-sm mt-1">Antrean penilaian soal Esai/Kasus dan pengumpulan workshop</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="flex flex-wrap gap-3 mb-4">
      <div
        class="ct-card px-4 py-2 flex items-center gap-2 cursor-pointer"
        :class="filterType === 'semua' ? 'border-blue-400 bg-blue-50/60' : ''"
        @click="filterType = 'semua'"
      >
        <ClipboardCheck class="w-4 h-4 text-slate-400" />
        <span class="text-xs text-slate-600">Total: <strong>{{ queueItems.length }}</strong></span>
      </div>
      <div
        class="ct-card px-4 py-2 flex items-center gap-2 cursor-pointer"
        :class="filterType === 'tes' ? 'border-blue-400 bg-blue-50/60' : ''"
        @click="filterType = 'tes'"
      >
        <FilePen class="w-4 h-4 text-blue-400" />
        <span class="text-xs text-slate-600">Tes: <strong>{{ pendingAttempts.length }}</strong></span>
      </div>
      <div
        class="ct-card px-4 py-2 flex items-center gap-2 cursor-pointer"
        :class="filterType === 'workshop' ? 'border-blue-400 bg-blue-50/60' : ''"
        @click="filterType = 'workshop'"
      >
        <Wrench class="w-4 h-4 text-amber-400" />
        <span class="text-xs text-slate-600">Workshop: <strong>{{ pendingSubmissions.length }}</strong></span>
      </div>
    </div>

    <!-- Queue -->
    <div class="ct-card overflow-hidden">
      <div v-if="queueItems.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Tipe</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Auditor</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Sesi</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tes / Tugas</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Disubmit</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in queueItems" :key="item.id" class="hover:bg-blue-50/20">
              <td class="px-4 py-3 text-center">
                <StatusBadge
                  :status="item.kind === 'tes' ? 'Tes' : 'Workshop'"
                  :variant="item.kind === 'tes' ? 'blue' : 'amber'"
                />
              </td>
              <td class="px-4 py-3 font-medium text-slate-700">{{ item.auditorName }}</td>
              <td class="px-4 py-3 text-slate-600 text-xs max-w-[160px] truncate">{{ item.sessionName }}</td>
              <td class="px-4 py-3 text-slate-600 text-sm">{{ item.testTitle }}</td>
              <td class="px-4 py-3 text-center text-xs text-slate-400">{{ item.submittedAt?.slice(0, 10) ?? '—' }}</td>
              <td class="px-4 py-3 text-center">
                <BaseButton
                  :variant="item.kind === 'tes' ? 'primary' : 'submit'"
                  size="sm"
                  @click="item.kind === 'tes' ? openGradeTes(item) : openGradeWorkshop(item)"
                >
                  Nilai <ChevronRight class="w-3 h-3" />
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center">
        <div class="ct-empty-icon-wrap"><ClipboardCheck class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Tidak ada yang perlu dinilai saat ini.</p>
      </div>
    </div>

    <!-- ── Test Grading Modal ── -->
    <BaseModal v-model="gradeOpen" :title="gradingKind === 'tes' ? 'Penilaian Tes' : 'Penilaian Workshop'" size="xl">
      <!-- Test grading -->
      <div v-if="gradingKind === 'tes' && gradingItem" class="space-y-4">
        <div class="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-sm">
          <div><p class="ct-label">Auditor</p><p class="font-medium">{{ auditorName(gradingItem.auditorId) }}</p></div>
          <div><p class="ct-label">Tes</p><p class="font-medium">{{ testTitle(gradingItem.testId) }}</p></div>
          <div><p class="ct-label">Auto Score</p><p class="font-medium">{{ gradingItem.autoScore ?? 0 }} poin (otomatis)</p></div>
        </div>

        <!-- Auto-graded answers (read only) -->
        <div v-if="gradingQuestions.filter(q => q.type !== 'Esai' && q.type !== 'Kasus').length">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Soal Otomatis (sudah dinilai)</h3>
          <div class="space-y-2">
            <div
              v-for="q in gradingQuestions.filter(q => q.type !== 'Esai' && q.type !== 'Kasus')"
              :key="q.id"
              class="ct-card p-3"
            >
              <div class="flex items-start gap-2">
                <StatusBadge :status="q.type" variant="blue" />
                <p class="text-sm text-slate-700 flex-1">{{ q.text }}</p>
              </div>
              <p class="text-xs text-slate-500 mt-1 pl-1">Jawaban: <span class="font-medium">{{ gradingItem.answers?.[q.id] ?? 'Tidak dijawab' }}</span></p>
            </div>
          </div>
        </div>

        <!-- Manual grading -->
        <div v-if="manualQuestions.length">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Soal Manual (perlu dinilai)</h3>
          <div class="space-y-3">
            <div v-for="q in manualQuestions" :key="q.id" class="ct-card p-4 border-amber-200 bg-amber-50/20">
              <div class="flex items-start gap-2 mb-2">
                <StatusBadge :status="q.type" variant="amber" />
                <span class="text-xs text-slate-400">{{ q.points }} poin</span>
                <p class="text-sm text-slate-700 flex-1">{{ q.text }}</p>
              </div>
              <div class="bg-white rounded-lg p-3 border border-slate-100 mb-2">
                <p class="text-xs text-slate-400 mb-1">Jawaban Auditor:</p>
                <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ gradingItem.answers?.[q.id] ?? 'Tidak dijawab' }}</p>
              </div>
              <div class="flex items-center gap-2">
                <label class="ct-label shrink-0">Nilai (0–{{ q.points }})</label>
                <input
                  v-model.number="manualScores[q.id]"
                  type="number" :min="0" :max="q.points"
                  class="ct-input w-24 text-center font-bold"
                  placeholder="0"
                />
                <span class="text-xs text-slate-400">/ {{ q.points }} poin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Workshop grading -->
      <div v-if="gradingKind === 'workshop' && gradingItem && gradingTask" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-sm">
          <div><p class="ct-label">Auditor</p><p class="font-medium">{{ auditorName(gradingItem.auditorId) }}</p></div>
          <div><p class="ct-label">Tugas</p><p class="font-medium">{{ gradingTask.title }}</p></div>
        </div>

        <!-- Submission content -->
        <div class="ct-card p-4">
          <p class="ct-label mb-1">Catatan / Link Pengumpulan</p>
          <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ gradingItem.note || '—' }}</p>
          <a v-if="gradingItem.fileUrl" :href="gradingItem.fileUrl" target="_blank" class="text-blue-600 text-sm hover:underline mt-2 inline-block">
            Buka file pengumpulan →
          </a>
        </div>

        <!-- Rubric scoring -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nilai per Kriteria Rubrik</h3>
          <div class="space-y-3">
            <div v-for="(r, i) in gradingTask.rubric" :key="i" class="ct-card p-3">
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <p class="text-sm font-medium text-slate-700">{{ r.criterion }}</p>
                  <p class="text-xs text-slate-400">Bobot {{ r.weight }}% · Skor maks {{ r.maxScore }}</p>
                </div>
                <input
                  v-model.number="workshopScores[i]"
                  type="number" :min="0" :max="r.maxScore"
                  class="ct-input w-24 text-center font-bold"
                  placeholder="0"
                />
                <span class="text-xs text-slate-400">/ {{ r.maxScore }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback -->
        <div>
          <label class="ct-label">Feedback untuk Auditor</label>
          <textarea v-model="feedback" class="ct-input resize-none" rows="3" placeholder="Catatan dan saran perbaikan..." />
        </div>

        <!-- Score preview -->
        <div class="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-4 text-sm">
          <div>
            <p class="ct-label">Skor Akhir</p>
            <p class="text-2xl font-bold text-blue-600">{{ computedWorkshopScore }}</p>
          </div>
          <span class="text-slate-400">/ {{ gradingTask.maxScore }}</span>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="gradeOpen = false">Batal</BaseButton>
        <BaseButton
          v-if="gradingKind === 'tes'"
          variant="primary" :loading="gradeLoading"
          @click="submitTestGrade"
        ><Save class="w-3.5 h-3.5" /> Simpan Nilai</BaseButton>
        <BaseButton
          v-else
          variant="submit" :loading="gradeLoading"
          @click="submitWorkshopGrade"
        ><Save class="w-3.5 h-3.5" /> Simpan Nilai</BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
