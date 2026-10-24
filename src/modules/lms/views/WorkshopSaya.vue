<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Wrench, Upload, Save, Eye, CheckCircle2, Clock, Link as LinkIcon,
} from '@lucide/vue'
import { useLmsWorkshopStore }    from '../../../stores/lmsWorkshopStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useLmsEnrollmentStore }  from '../../../stores/lmsEnrollmentStore.js'
import { useLmsRole }             from '../../../shared/composables/useLmsRole.js'
import { supabase }               from '../../../services/supabaseClient.js'
import { useToast }               from '../../../shared/composables/useToast.js'
import BaseButton  from '../../../shared/components/BaseButton.vue'
import BaseModal   from '../../../shared/components/BaseModal.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const workshopStore = useLmsWorkshopStore()
const sessionStore  = useTrainingSessionStore()
const enrollmentStore = useLmsEnrollmentStore()
const { auditorId, isAuditor } = useLmsRole()
const toast = useToast()

const selectedAuditorId = ref('')
const activeAuditorId = computed(() => isAuditor.value && auditorId.value ? auditorId.value : selectedAuditorId.value)

onMounted(() => { workshopStore.load(); sessionStore.load(); enrollmentStore.load() })

function sessionName(id) { return sessionStore.sessions.find(s => s.id === id)?.trainingName ?? id }

// Get session IDs the auditor is enrolled in
const mySessionIds = computed(() =>
  activeAuditorId.value
    ? enrollmentStore.enrollmentsByAuditor(activeAuditorId.value).map(e => e.sessionId)
    : []
)

const myTasks = computed(() => {
  if (!activeAuditorId.value) return []
  return workshopStore.tasks.filter(t => mySessionIds.value.includes(t.sessionId))
})

function mySubmission(taskId) {
  return workshopStore.submissions.find(s => s.taskId === taskId && s.auditorId === activeAuditorId.value)
}

// ── Submit modal ──────────────────────────────────────────
const submitOpen = ref(false)
const submitTask = ref(null)
const submitForm = ref({ fileUrl: '', note: '' })
const uploadFile = ref(null)
const uploading = ref(false)
const submitting = ref(false)

function openSubmit(task) {
  submitTask.value = task
  const existing = mySubmission(task.id)
  submitForm.value = {
    fileUrl: existing?.fileUrl ?? '',
    note: existing?.note ?? '',
  }
  uploadFile.value = null
  submitOpen.value = true
}

async function handleUpload() {
  if (!uploadFile.value || !submitTask.value) return
  uploading.value = true
  try {
    const file = uploadFile.value
    const ext = file.name.split('.').pop()
    const path = `${activeAuditorId.value}/${submitTask.value.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('lms-submissions').upload(path, file)
    if (error) {
      toast.error('Gagal upload file. Gunakan URL sebagai alternatif.')
    } else {
      const { data: urlData } = supabase.storage.from('lms-submissions').getPublicUrl(path)
      submitForm.value.fileUrl = urlData.publicUrl
      toast.success('File terunggah.')
    }
  } finally { uploading.value = false }
}

async function saveSubmission() {
  if (!submitTask.value || !activeAuditorId.value) return
  submitting.value = true
  try {
    const existing = mySubmission(submitTask.value.id)
    const sub = {
      id: existing?.id || `sub-${Date.now()}`,
      taskId: submitTask.value.id,
      sessionId: submitTask.value.sessionId,
      auditorId: activeAuditorId.value,
      fileUrl: submitForm.value.fileUrl,
      note: submitForm.value.note,
      submittedAt: new Date().toISOString(),
      rubricScores: existing?.rubricScores ?? {},
      score: existing?.score ?? null,
      feedback: existing?.feedback ?? '',
      assessor: existing?.assessor ?? '',
      status: 'Dikirim',
    }
    if (existing) {
      await workshopStore.updateSubmission(sub)
      toast.success('Pengumpulan diperbarui.')
    } else {
      await workshopStore.addSubmission(sub)
      toast.success('Tugas dikumpulkan.')
    }
    submitOpen.value = false
  } finally { submitting.value = false }
}

function isOverdue(task) {
  if (!task.dueDate) return false
  return new Date(task.dueDate) < new Date()
}
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Workshop Saya</h1>
        <p class="text-slate-500 text-sm mt-1">Tugas workshop dan pengumpulan hasil kerja</p>
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
      <div class="ct-empty-icon-wrap"><Wrench class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Pilih auditor untuk melihat tugas workshop.</p>
    </div>

    <div v-else-if="myTasks.length" class="space-y-4">
      <div v-for="task in myTasks" :key="task.id" class="ct-card overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-slate-100">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-slate-800 text-sm">{{ task.title }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ sessionName(task.sessionId) }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs text-slate-400">Batas Kumpul</p>
              <p class="text-sm font-medium" :class="isOverdue(task) ? 'text-red-600' : 'text-slate-600'">{{ task.dueDate || '—' }}</p>
            </div>
          </div>
        </div>

        <!-- Brief -->
        <div class="px-5 py-3 border-b border-slate-100">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Brief</p>
          <p class="text-sm text-slate-600">{{ task.brief || 'Tidak ada brief' }}</p>
        </div>

        <!-- Rubric -->
        <div class="px-5 py-3 border-b border-slate-100">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Rubrik Penilaian</p>
          <div class="flex flex-wrap gap-2">
            <div v-for="(r, i) in task.rubric" :key="i" class="ct-card px-3 py-1.5 text-xs">
              <span class="font-medium text-slate-700">{{ r.criterion }}</span>
              <span class="text-slate-400 ml-2">· {{ r.weight }}% · max {{ r.maxScore }}</span>
            </div>
          </div>
        </div>

        <!-- Submission status -->
        <div class="px-5 py-3">
          <template v-if="mySubmission(task.id)">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <CheckCircle2 v-if="mySubmission(task.id).status === 'Dinilai'" class="w-5 h-5 text-emerald-500" />
                <Clock v-else class="w-5 h-5 text-amber-400" />
                <div>
                  <p class="text-sm font-medium text-slate-700">
                    {{ mySubmission(task.id).status === 'Dinilai' ? `Dinilai: ${mySubmission(task.id).score}/${task.maxScore}` : 'Menunggu Penilaian' }}
                  </p>
                  <p class="text-xs text-slate-400">Dikumpulkan: {{ mySubmission(task.id).submittedAt?.slice(0, 10) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <a v-if="mySubmission(task.id).fileUrl" :href="mySubmission(task.id).fileUrl" target="_blank" class="ct-action-btn-view" title="Lihat file">
                  <Eye class="w-3.5 h-3.5" />
                </a>
                <BaseButton v-if="mySubmission(task.id).status !== 'Dinilai'" variant="secondary" size="sm" @click="openSubmit(task)">
                  Edit Pengumpulan
                </BaseButton>
              </div>
            </div>
            <!-- Feedback -->
            <div v-if="mySubmission(task.id).feedback" class="mt-3 ct-card p-3 bg-blue-50/40 border-blue-200">
              <p class="text-xs font-bold text-blue-600 mb-1">Feedback Asessor</p>
              <p class="text-sm text-slate-700">{{ mySubmission(task.id).feedback }}</p>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center justify-between">
              <p class="text-sm text-slate-400" :class="isOverdue(task) ? 'text-red-500' : ''">
                {{ isOverdue(task) ? 'Batas waktu terlewati' : 'Belum dikumpulkan' }}
              </p>
              <BaseButton variant="primary" size="sm" @click="openSubmit(task)">
                <Upload class="w-3.5 h-3.5" /> Kumpulkan Tugas
              </BaseButton>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-else class="ct-card py-16 text-center">
      <div class="ct-empty-icon-wrap"><Wrench class="w-9 h-9 text-slate-300" /></div>
      <p class="text-slate-400 italic text-sm">Belum ada tugas workshop untuk Anda.</p>
    </div>

    <!-- Submit modal -->
    <BaseModal v-model="submitOpen" :title="`Kumpulkan: ${submitTask?.title || ''}`" size="lg">
      <div class="space-y-4">
        <!-- File upload -->
        <div>
          <label class="ct-label">Upload File</label>
          <div class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
            <Upload class="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <input type="file" class="text-xs mb-2" @change="e => uploadFile = e.target.files?.[0] ?? null" />
            <BaseButton v-if="uploadFile" variant="secondary" size="sm" :loading="uploading" @click="handleUpload">
              <Save class="w-3 h-3" /> Upload
            </BaseButton>
          </div>
        </div>

        <!-- Or URL -->
        <div>
          <label class="ct-label">Atau URL File</label>
          <input v-model="submitForm.fileUrl" class="ct-input" placeholder="https://..." />
        </div>

        <!-- Note -->
        <div>
          <label class="ct-label">Catatan untuk Asessor</label>
          <textarea v-model="submitForm.note" class="ct-input resize-none" rows="3" placeholder="Catatan atau penjelasan singkat..." />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="submitOpen = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="submitting" @click="saveSubmission">
          <Save class="w-3.5 h-3.5" /> Kumpulkan
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
