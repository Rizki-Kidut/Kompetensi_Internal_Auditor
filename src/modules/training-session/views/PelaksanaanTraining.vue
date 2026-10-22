<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlayCircle, CheckSquare, Users, Eye, ArrowRight } from '@lucide/vue'
import { useAuditorStore }         from '../../../stores/auditorStore.js'
import { useTrainingSessionStore } from '../../../stores/trainingSessionStore.js'
import { useTrainingPlanStore }    from '../../../stores/trainingPlanStore.js'
import { useCompetencyStore }      from '../../../stores/competencyStore.js'
import { useToast }                from '../../../shared/composables/useToast.js'
import BaseModal  from '../../../shared/components/BaseModal.vue'
import BaseButton from '../../../shared/components/BaseButton.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const route   = useRoute()
const router  = useRouter()
const auditorStore  = useAuditorStore()
const sessionStore  = useTrainingSessionStore()
const planStore     = useTrainingPlanStore()
const competency    = useCompetencyStore()
const toast   = useToast()

onMounted(() => {
  auditorStore.load()
  sessionStore.load()
  planStore.load()
  competency.load()
  // If navigated from PerencanaanTraining with planId, open create modal
  if (route.query.planId) {
    const plan = planStore.plans.find(p => p.id === route.query.planId)
    if (plan) openCreateFromPlan(plan)
  }
})

// ─── Helpers ──────────────────────────────────────────────
function auditorName(id)  { return auditorStore.auditors.find(a => a.id === id)?.name ?? id }
function auditorSection(id) { return auditorStore.auditors.find(a => a.id === id)?.section ?? '' }
function planItemName(planId) {
  const plan = planStore.plans.find(p => p.id === planId)
  if (!plan) return ''
  return competency.items.find(i => i.id === plan.competencyItemId)?.itemName ?? ''
}

const activeAuditors = computed(() => auditorStore.auditors.filter(a => a.status === 'Aktif'))
const approvedPlans  = computed(() => planStore.plans.filter(p => p.status === 'Disetujui'))

// ─── Filter ───────────────────────────────────────────────
const statusFilter = ref('Semua')
const STATUS_OPTS  = ['Semua', 'Terjadwal', 'Berlangsung', 'Selesai', 'Dibatalkan']

const filteredSessions = computed(() =>
  sessionStore.sessions.filter(s =>
    statusFilter.value === 'Semua' || s.status === statusFilter.value
  )
)

const sessionStats = computed(() => ({
  Terjadwal:   sessionStore.sessions.filter(s => s.status === 'Terjadwal').length,
  Berlangsung: sessionStore.sessions.filter(s => s.status === 'Berlangsung').length,
  Selesai:     sessionStore.sessions.filter(s => s.status === 'Selesai').length,
  Dibatalkan:  sessionStore.sessions.filter(s => s.status === 'Dibatalkan').length,
}))

// ─── Create Session Modal ─────────────────────────────────
const createOpen  = ref(false)
const createError = ref({})
const createLoad  = ref(false)

function emptyCreateForm() {
  return {
    planId: '', trainingName: '', date: '',
    organizer: '', trainer: '', materials: '',
    participants: [],
  }
}
const createForm = ref(emptyCreateForm())

function openCreate() {
  createForm.value = emptyCreateForm()
  createError.value = {}
  createOpen.value = true
}

function openCreateFromPlan(plan) {
  createForm.value = {
    ...emptyCreateForm(),
    planId: plan.id,
    trainingName: planItemName(plan.id),
    participants: [...(plan.targetParticipants ?? [])],
  }
  createError.value = {}
  createOpen.value = true
}

// Auto-fill participants when planId changes
watch(() => createForm.value.planId, (newId) => {
  if (!newId) return
  const plan = planStore.plans.find(p => p.id === newId)
  if (plan) {
    createForm.value.participants = [...(plan.targetParticipants ?? [])]
    if (!createForm.value.trainingName) {
      createForm.value.trainingName = planItemName(newId)
    }
  }
})

function validateCreate() {
  const e = {}
  if (!createForm.value.trainingName.trim()) e.trainingName = 'Nama training wajib diisi'
  if (!createForm.value.date)               e.date = 'Tanggal wajib diisi'
  if (!createForm.value.trainer.trim())     e.trainer = 'Trainer wajib diisi'
  if (!createForm.value.participants.length) e.participants = 'Pilih minimal 1 peserta'
  return e
}

function submitCreate() {
  createError.value = validateCreate()
  if (Object.keys(createError.value).length) return

  createLoad.value = true
  try {
    const session = {
      id: `ts-${Date.now()}`,
      planId: createForm.value.planId || null,
      trainingName: createForm.value.trainingName.trim(),
      date: createForm.value.date,
      organizer: createForm.value.organizer.trim(),
      trainer: createForm.value.trainer.trim(),
      materials: createForm.value.materials.trim(),
      participants: [...createForm.value.participants],
      attendees: [...createForm.value.participants], // default all present
      status: 'Terjadwal',
    }
    sessionStore.addSession(session)
    toast.success(`Sesi training "${session.trainingName}" berhasil dibuat.`)
    createOpen.value = false
  } finally {
    createLoad.value = false
  }
}

// ─── Detail + Attendance Modal ────────────────────────────
const detailOpen    = ref(false)
const detailSession = ref(null)
const localAttendees = ref([])

function openDetail(session) {
  detailSession.value = session
  localAttendees.value = [...(session.attendees ?? session.participants ?? [])]
  detailOpen.value = true
}

function toggleAttendee(auditorId) {
  const idx = localAttendees.value.indexOf(auditorId)
  if (idx === -1) localAttendees.value.push(auditorId)
  else            localAttendees.value.splice(idx, 1)
}

function saveAttendance() {
  sessionStore.updateAttendees(detailSession.value.id, localAttendees.value)
  detailSession.value = { ...detailSession.value, attendees: [...localAttendees.value] }
  toast.success('Kehadiran peserta disimpan.')
}

function startSession(session) {
  sessionStore.updateStatus(session.id, 'Berlangsung')
  detailSession.value = { ...session, status: 'Berlangsung' }
  toast.success(`Sesi "${session.trainingName}" dimulai.`)
}

function completeSession(session) {
  sessionStore.updateAttendees(session.id, localAttendees.value)
  sessionStore.updateStatus(session.id, 'Selesai')
  // Mark linked plan as Selesai
  if (session.planId) planStore.completePlan(session.planId)
  detailSession.value = { ...session, status: 'Selesai', attendees: [...localAttendees.value] }
  toast.success(`Sesi "${session.trainingName}" selesai. Buat evaluasi di halaman Evaluasi Training.`)
}

function cancelSession(session) {
  if (!confirm(`Batalkan sesi "${session.trainingName}"?`)) return
  sessionStore.updateStatus(session.id, 'Dibatalkan')
  detailSession.value = { ...session, status: 'Dibatalkan' }
  toast.error(`Sesi "${session.trainingName}" dibatalkan.`)
}

function goToEvaluation(session) {
  router.push({ name: 'EvaluasiTraining', query: { sessionId: session.id } })
}

// Attendance counts for display
function attendedCount(session) {
  return (session.attendees ?? session.participants ?? []).length
}
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Pelaksanaan Training</h1>
        <p class="text-slate-500 text-sm mt-1">Sesi training, absensi peserta & link ke evaluasi</p>
      </div>
      <BaseButton variant="primary" @click="openCreate">
        <PlayCircle class="w-4 h-4" /> Buat Sesi Training
      </BaseButton>
    </div>

    <!-- Stats chips -->
    <div class="flex flex-wrap gap-3 mb-4">
      <div
        v-for="s in ['Terjadwal','Berlangsung','Selesai','Dibatalkan']"
        :key="s"
        class="ct-card px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-colors"
        :class="statusFilter === s ? 'border-blue-400 bg-blue-50/60' : ''"
        @click="statusFilter = statusFilter === s ? 'Semua' : s"
      >
        <span class="w-2 h-2 rounded-full"
          :class="{
            'bg-blue-400': s === 'Terjadwal',
            'bg-amber-400': s === 'Berlangsung',
            'bg-emerald-400': s === 'Selesai',
            'bg-red-300': s === 'Dibatalkan',
          }"
        />
        <span class="text-xs text-slate-600 font-medium">{{ s }}: <strong>{{ sessionStats[s] }}</strong></span>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex flex-wrap gap-1.5 mb-4">
      <button
        v-for="s in STATUS_OPTS"
        :key="s"
        :class="statusFilter === s ? 'btn-primary' : 'btn-secondary'"
        class="text-xs px-3 py-1.5"
        @click="statusFilter = s"
      >
        {{ s }}
      </button>
    </div>

    <!-- Sessions table -->
    <div class="ct-card overflow-hidden">
      <div v-if="filteredSessions.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Nama Training</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tanggal</th>
              <th class="px-4 py-3 text-left text-slate-600 font-semibold">Trainer</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Peserta</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Hadir</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
              <th class="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="s in filteredSessions"
              :key="s.id"
              class="hover:bg-blue-50/20 transition-colors"
            >
              <td class="px-4 py-3">
                <p class="font-medium text-slate-700">{{ s.trainingName }}</p>
                <p v-if="s.planId" class="text-slate-400 text-xs mt-0.5">
                  Dari rencana: {{ planItemName(s.planId) || s.planId }}
                </p>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ s.date }}</td>
              <td class="px-4 py-3 text-slate-600">{{ s.trainer }}</td>
              <td class="px-4 py-3 text-center">
                <span class="font-medium text-slate-700">{{ (s.participants ?? []).length }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="font-medium"
                  :class="attendedCount(s) === (s.participants ?? []).length ? 'text-emerald-600' : 'text-amber-600'"
                >
                  {{ attendedCount(s) }}/{{ (s.participants ?? []).length }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <StatusBadge :status="s.status" />
              </td>
              <td class="px-4 py-3 text-center">
                <button class="ct-action-btn-view" title="Lihat Detail" @click="openDetail(s)">
                  <Eye class="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center">
        <div class="ct-empty-icon-wrap"><PlayCircle class="w-9 h-9 text-slate-300" /></div>
        <p class="text-slate-400 italic text-sm">Belum ada sesi training
          <span v-if="statusFilter !== 'Semua'">dengan status "{{ statusFilter }}"</span>
        </p>
      </div>
    </div>

    <!-- ── Create Session Modal ── -->
    <BaseModal v-model="createOpen" title="Buat Sesi Training" size="lg">
      <div class="space-y-4">

        <!-- Link to plan (optional) -->
        <div>
          <label class="ct-label">Dari Rencana Training (opsional)</label>
          <select v-model="createForm.planId" class="ct-input">
            <option value="">-- Sesi tanpa rencana --</option>
            <option v-for="p in approvedPlans" :key="p.id" :value="p.id">
              {{ planItemName(p.id) }} — {{ p.plannedDate }}
            </option>
          </select>
        </div>

        <!-- Training name -->
        <div>
          <label class="ct-label">Nama Training <span class="text-red-500">*</span></label>
          <input
            v-model="createForm.trainingName"
            type="text"
            class="ct-input"
            :class="createError.trainingName ? 'border-red-400' : ''"
            placeholder="Contoh: Audit Proses Produksi — Workshop"
          />
          <p v-if="createError.trainingName" class="text-red-500 text-xs mt-1">{{ createError.trainingName }}</p>
        </div>

        <!-- Date + Trainer -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="ct-label">Tanggal <span class="text-red-500">*</span></label>
            <input v-model="createForm.date" type="date" class="ct-input" :class="createError.date ? 'border-red-400' : ''" />
            <p v-if="createError.date" class="text-red-500 text-xs mt-1">{{ createError.date }}</p>
          </div>
          <div>
            <label class="ct-label">Trainer <span class="text-red-500">*</span></label>
            <input v-model="createForm.trainer" type="text" class="ct-input" :class="createError.trainer ? 'border-red-400' : ''" placeholder="Nama trainer / fasilitator" />
            <p v-if="createError.trainer" class="text-red-500 text-xs mt-1">{{ createError.trainer }}</p>
          </div>
        </div>

        <!-- Organizer + Materials -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="ct-label">Penyelenggara</label>
            <input v-model="createForm.organizer" type="text" class="ct-input" placeholder="Contoh: Dept. QA" />
          </div>
          <div>
            <label class="ct-label">Materi / Modul</label>
            <input v-model="createForm.materials" type="text" class="ct-input" placeholder="Nama modul atau referensi" />
          </div>
        </div>

        <!-- Participants -->
        <div>
          <label class="ct-label">Peserta <span class="text-red-500">*</span></label>
          <div
            class="border rounded-xl overflow-hidden max-h-44 overflow-y-auto"
            :class="createError.participants ? 'border-red-400' : 'border-slate-200'"
          >
            <label
              v-for="a in activeAuditors"
              :key="a.id"
              class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
            >
              <input type="checkbox" :value="a.id" v-model="createForm.participants" class="accent-blue-600" />
              <span class="font-medium text-slate-700 text-sm">{{ a.name }}</span>
              <span class="text-slate-400 text-xs ml-auto">{{ a.section }}</span>
            </label>
          </div>
          <p v-if="createError.participants" class="text-red-500 text-xs mt-1">{{ createError.participants }}</p>
          <p class="text-slate-400 text-xs mt-1">{{ createForm.participants.length }} peserta dipilih</p>
        </div>

      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="createOpen = false">Batal</BaseButton>
        <BaseButton variant="submit" :loading="createLoad" @click="submitCreate">
          Buat Sesi
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── Detail + Attendance Modal ── -->
    <BaseModal v-model="detailOpen" :title="`Detail Sesi — ${detailSession?.trainingName ?? ''}`" size="lg">
      <template v-if="detailSession">

        <!-- Session info card -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5 p-4 bg-slate-50 rounded-xl text-sm">
          <div><p class="ct-label">Tanggal</p><p class="font-medium text-slate-700">{{ detailSession.date }}</p></div>
          <div><p class="ct-label">Trainer</p><p class="font-medium text-slate-700">{{ detailSession.trainer }}</p></div>
          <div><p class="ct-label">Penyelenggara</p><p class="font-medium text-slate-700">{{ detailSession.organizer || '—' }}</p></div>
          <div class="col-span-full">
            <p class="ct-label">Materi</p>
            <p class="font-medium text-slate-700">{{ detailSession.materials || '—' }}</p>
          </div>
          <div v-if="detailSession.planId">
            <p class="ct-label">Rencana Training</p>
            <p class="font-medium text-slate-700">{{ planItemName(detailSession.planId) }}</p>
          </div>
          <div>
            <p class="ct-label">Status</p>
            <StatusBadge :status="detailSession.status" />
          </div>
        </div>

        <!-- Attendance list -->
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <p class="ct-label">Daftar Hadir Peserta</p>
            <span class="text-xs text-slate-500">
              {{ localAttendees.length }} / {{ (detailSession.participants ?? []).length }} hadir
            </span>
          </div>
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div
              v-for="(pid, idx) in (detailSession.participants ?? [])"
              :key="pid"
              :class="['flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0', idx % 2 === 0 ? '' : 'bg-slate-50/40']"
            >
              <input
                type="checkbox"
                :checked="localAttendees.includes(pid)"
                class="accent-emerald-600"
                :disabled="detailSession.status === 'Dibatalkan'"
                @change="toggleAttendee(pid)"
              />
              <div class="flex-1">
                <p class="font-medium text-slate-700 text-sm">{{ auditorName(pid) }}</p>
                <p class="text-slate-400 text-xs">{{ auditorSection(pid) }}</p>
              </div>
              <span
                class="ct-badge text-xs"
                :class="localAttendees.includes(pid) ? 'ct-badge-emerald' : 'ct-badge-slate'"
              >
                {{ localAttendees.includes(pid) ? 'Hadir' : 'Absen' }}
              </span>
            </div>
          </div>
          <!-- Save attendance button (for non-completed sessions) -->
          <div v-if="detailSession.status !== 'Selesai' && detailSession.status !== 'Dibatalkan'" class="mt-2 flex justify-end">
            <button class="btn-secondary text-xs flex items-center gap-1" @click="saveAttendance">
              <CheckSquare class="w-3.5 h-3.5" /> Simpan Kehadiran
            </button>
          </div>
        </div>

        <!-- Status action buttons -->
        <div class="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          <template v-if="detailSession.status === 'Terjadwal'">
            <BaseButton variant="success" @click="startSession(detailSession)">
              <PlayCircle class="w-4 h-4" /> Mulai Training
            </BaseButton>
            <BaseButton variant="danger" size="sm" @click="cancelSession(detailSession)">
              Batalkan
            </BaseButton>
          </template>

          <template v-else-if="detailSession.status === 'Berlangsung'">
            <BaseButton variant="submit" @click="completeSession(detailSession)">
              <CheckSquare class="w-4 h-4" /> Selesaikan Training
            </BaseButton>
            <BaseButton variant="danger" size="sm" @click="cancelSession(detailSession)">
              Batalkan
            </BaseButton>
          </template>

          <template v-else-if="detailSession.status === 'Selesai'">
            <div class="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
              <CheckSquare class="w-4 h-4 shrink-0" /> Training selesai
            </div>
            <button
              class="btn-primary flex items-center gap-2 ml-auto"
              @click="goToEvaluation(detailSession)"
            >
              Buat Evaluasi Peserta <ArrowRight class="w-4 h-4" />
            </button>
          </template>

          <template v-else-if="detailSession.status === 'Dibatalkan'">
            <span class="text-sm text-red-500 italic">Sesi ini dibatalkan</span>
          </template>
        </div>

      </template>

      <template #footer>
        <BaseButton variant="secondary" @click="detailOpen = false">Tutup</BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
