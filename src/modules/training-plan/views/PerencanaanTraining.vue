<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, Plus, Trash2, CheckCircle, ArrowRight, ChevronRight } from '@lucide/vue'
import { useAuditorStore }      from '../../../stores/auditorStore.js'
import { useCompetencyStore }   from '../../../stores/competencyStore.js'
import { useTrainingPlanStore } from '../../../stores/trainingPlanStore.js'
import { useGapAnalysis }       from '../../../shared/composables/useGapAnalysis.js'
import { useToast }             from '../../../shared/composables/useToast.js'
import BaseModal   from '../../../shared/components/BaseModal.vue'
import BaseButton  from '../../../shared/components/BaseButton.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'

const router        = useRouter()
const auditorStore  = useAuditorStore()
const competency    = useCompetencyStore()
const planStore     = useTrainingPlanStore()
const toast         = useToast()

onMounted(() => { auditorStore.load(); competency.load(); planStore.load() })

// ─── Gap analysis ─────────────────────────────────────────
const { gapData } = useGapAnalysis(
  computed(() => auditorStore.auditors),
  computed(() => competency.items),
  computed(() => competency.matrix),
)
const topGaps = computed(() => gapData.value.filter(g => g.gapCount > 0))
const activeCount = computed(() => auditorStore.auditors.filter(a => a.status === 'Aktif').length)

function gapPriority(count) {
  if (count >= 4) return 'Tinggi'
  if (count >= 2) return 'Sedang'
  return 'Rendah'
}
function gapBarColor(count) {
  if (count >= 4) return 'bg-red-500'
  if (count >= 2) return 'bg-amber-400'
  return 'bg-blue-400'
}
function hasPlanForItem(itemId) {
  return planStore.plans.some(p => p.competencyItemId === itemId && p.status !== 'Dibatalkan')
}

// ─── Category badge color ─────────────────────────────────
const CAT_BADGE = {
  'Auditor QMS': 'ct-badge-blue',
  'Audit Manufaktur dan Shift': 'bg-teal-100 text-teal-700',
  'Audit Produk': 'ct-badge-emerald',
  'Audit Supplier': 'ct-badge-amber',
}

// ─── Filter ───────────────────────────────────────────────
const statusFilter = ref('Semua')
const STATUS_OPTS  = ['Semua', 'Draft', 'Disetujui', 'Selesai']

const filteredPlans = computed(() =>
  planStore.plans.filter(p => statusFilter.value === 'Semua' || p.status === statusFilter.value)
)

// ─── Plan form ────────────────────────────────────────────
const modalOpen  = ref(false)
const editingId  = ref(null)
const formErrors = ref({})
const loading    = ref(false)

function emptyForm() {
  return {
    competencyItemId: '',
    targetParticipants: [],
    plannedDate: '',
    priority: 'Sedang',
    reason: 'Gap Kompetensi',
    notes: '',
  }
}
const form = ref(emptyForm())

function openCreate() {
  form.value = emptyForm()
  editingId.value = null
  formErrors.value = {}
  modalOpen.value = true
}

function openCreateFromGap(gap) {
  form.value = {
    ...emptyForm(),
    competencyItemId: gap.item.id,
    targetParticipants: gap.gapAuditors.map(a => a.id),
    priority: gapPriority(gap.gapCount),
    reason: 'Gap Kompetensi',
  }
  editingId.value = null
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(plan) {
  form.value = {
    competencyItemId: plan.competencyItemId,
    targetParticipants: [...(plan.targetParticipants ?? [])],
    plannedDate: plan.plannedDate,
    priority: plan.priority,
    reason: plan.reason,
    notes: plan.notes ?? '',
  }
  editingId.value = plan.id
  formErrors.value = {}
  modalOpen.value = true
}

function validateForm() {
  const e = {}
  if (!form.value.competencyItemId)         e.competencyItemId = 'Item kompetensi wajib dipilih'
  if (!form.value.plannedDate)              e.plannedDate = 'Tanggal rencana wajib diisi'
  if (!form.value.targetParticipants.length) e.targetParticipants = 'Pilih minimal 1 peserta'
  return e
}

function submitPlan() {
  formErrors.value = validateForm()
  if (Object.keys(formErrors.value).length) return

  loading.value = true
  try {
    if (editingId.value) {
      planStore.updatePlan({
        ...planStore.plans.find(p => p.id === editingId.value),
        ...form.value,
      })
      toast.success('Rencana training berhasil diperbarui.')
    } else {
      planStore.addPlan({
        id: `tp-${Date.now()}`,
        targetLevel: '◆',
        status: 'Draft',
        ...form.value,
      })
      toast.success('Rencana training berhasil ditambahkan.')
    }
    modalOpen.value = false
  } finally {
    loading.value = false
  }
}

// ─── Plan actions ─────────────────────────────────────────
function approvePlan(plan) {
  planStore.approvePlan(plan.id)
  toast.success(`Rencana training "${itemName(plan.competencyItemId)}" disetujui.`)
}

function deletePlan(plan) {
  if (!confirm(`Hapus rencana training "${itemName(plan.competencyItemId)}"?`)) return
  planStore.deletePlan(plan.id)
  toast.success('Rencana training dihapus.')
}

function goToSession(plan) {
  router.push({ name: 'PelaksanaanTraining', query: { planId: plan.id } })
}

// ─── Helpers ──────────────────────────────────────────────
function itemName(id) {
  return competency.items.find(i => i.id === id)?.itemName ?? id
}
function itemCategory(id) {
  return competency.items.find(i => i.id === id)?.category ?? ''
}
function auditorName(id) {
  return auditorStore.auditors.find(a => a.id === id)?.name ?? id
}

const activeAuditors = computed(() => auditorStore.auditors.filter(a => a.status === 'Aktif'))

// ─── Stats ────────────────────────────────────────────────
const planStats = computed(() => ({
  Draft:     planStore.plans.filter(p => p.status === 'Draft').length,
  Disetujui: planStore.plans.filter(p => p.status === 'Disetujui').length,
  Selesai:   planStore.plans.filter(p => p.status === 'Selesai').length,
}))
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Perencanaan Training</h1>
        <p class="text-slate-500 text-sm mt-1">Gap analysis & rencana pelatihan internal auditor</p>
      </div>
      <BaseButton variant="primary" @click="openCreate">
        <Plus class="w-4 h-4" /> Buat Rencana Baru
      </BaseButton>
    </div>

    <!-- ── Gap Analysis Panel ── -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-slate-700">Analisis Gap Kompetensi
          <span class="ml-2 text-xs font-normal text-slate-400">(target level ◆ · hanya auditor aktif)</span>
        </h2>
        <span class="ct-badge ct-badge-slate">{{ activeCount }} auditor aktif</span>
      </div>

      <div v-if="topGaps.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div v-for="gap in topGaps" :key="gap.item.id" class="ct-card p-4 flex flex-col gap-3 hover:border-blue-200 transition-colors">
          <!-- Category + item -->
          <div>
            <span :class="['ct-badge text-xs', CAT_BADGE[gap.item.category] ?? 'ct-badge-slate']">
              {{ gap.item.category }}
            </span>
            <p class="font-semibold text-slate-800 mt-1.5 leading-tight">{{ gap.item.itemName }}</p>
          </div>

          <!-- Gap bar -->
          <div>
            <div class="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Gap terhadap target ◆</span>
              <span class="font-bold" :class="gap.gapCount >= 4 ? 'text-red-600' : gap.gapCount >= 2 ? 'text-amber-600' : 'text-blue-600'">
                {{ gap.gapCount }} / {{ activeCount }}
              </span>
            </div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all', gapBarColor(gap.gapCount)]"
                :style="`width: ${Math.round(gap.gapCount / activeCount * 100)}%`"
              />
            </div>
          </div>

          <!-- Auditor chips -->
          <div class="flex flex-wrap gap-1">
            <span
              v-for="a in gap.gapAuditors.slice(0, 4)"
              :key="a.id"
              class="ct-badge ct-badge-slate"
            >
              {{ a.name }}
            </span>
            <span v-if="gap.gapAuditors.length > 4" class="ct-badge ct-badge-slate">
              +{{ gap.gapAuditors.length - 4 }}
            </span>
          </div>

          <!-- Footer: priority + action -->
          <div class="flex items-center justify-between mt-auto pt-1 border-t border-slate-100">
            <StatusBadge :status="gapPriority(gap.gapCount)" />
            <button
              class="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              :class="hasPlanForItem(gap.item.id) ? 'opacity-50 cursor-not-allowed' : ''"
              :disabled="hasPlanForItem(gap.item.id)"
              :title="hasPlanForItem(gap.item.id) ? 'Sudah ada rencana untuk item ini' : 'Buat rencana training'"
              @click="!hasPlanForItem(gap.item.id) && openCreateFromGap(gap)"
            >
              <Plus class="w-3 h-3" />
              {{ hasPlanForItem(gap.item.id) ? 'Sudah ada rencana' : 'Buat Rencana' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="ct-card py-10 text-center">
        <div class="ct-empty-icon-wrap"><CheckCircle class="w-9 h-9 text-emerald-300" /></div>
        <p class="text-slate-500 font-medium">Tidak ada gap kompetensi — semua auditor memenuhi target ◆</p>
      </div>
    </div>

    <!-- ── Plans Table ── -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-slate-700">Daftar Rencana Training</h2>
        <!-- Status filter tabs -->
        <div class="flex gap-1.5">
          <button
            v-for="s in STATUS_OPTS"
            :key="s"
            :class="statusFilter === s ? 'btn-primary' : 'btn-secondary'"
            class="text-xs px-3 py-1.5"
            @click="statusFilter = s"
          >
            {{ s }}
            <span v-if="s !== 'Semua'" class="ml-1 opacity-75">
              ({{ planStats[s] ?? 0 }})
            </span>
          </button>
        </div>
      </div>

      <div class="ct-card overflow-hidden">
        <div v-if="filteredPlans.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Item Kompetensi</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Peserta Target</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Tgl Rencana</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Prioritas</th>
                <th class="px-4 py-3 text-left text-slate-600 font-semibold">Alasan</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Status</th>
                <th class="px-4 py-3 text-center text-slate-600 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="plan in filteredPlans"
                :key="plan.id"
                class="hover:bg-blue-50/20 transition-colors"
              >
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-700">{{ itemName(plan.competencyItemId) }}</p>
                  <p class="text-slate-400 text-xs mt-0.5">{{ itemCategory(plan.competencyItemId) }}</p>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="pid in (plan.targetParticipants ?? []).slice(0, 3)"
                      :key="pid"
                      class="ct-badge ct-badge-slate"
                    >
                      {{ auditorName(pid) }}
                    </span>
                    <span v-if="(plan.targetParticipants ?? []).length > 3" class="ct-badge ct-badge-slate">
                      +{{ plan.targetParticipants.length - 3 }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-600">{{ plan.plannedDate }}</td>
                <td class="px-4 py-3 text-center"><StatusBadge :status="plan.priority" /></td>
                <td class="px-4 py-3">
                  <span class="ct-badge ct-badge-blue">{{ plan.reason }}</span>
                </td>
                <td class="px-4 py-3 text-center"><StatusBadge :status="plan.status" /></td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-1.5">
                    <!-- Draft actions -->
                    <template v-if="plan.status === 'Draft'">
                      <button
                        class="btn-success flex items-center gap-1 px-2 py-1 text-xs"
                        @click="approvePlan(plan)"
                      >
                        <CheckCircle class="w-3 h-3" /> Setujui
                      </button>
                      <button
                        class="ct-action-btn-edit"
                        title="Edit"
                        @click="openEdit(plan)"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button
                        class="ct-action-btn-delete"
                        title="Hapus"
                        @click="deletePlan(plan)"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </template>
                    <!-- Disetujui: buat sesi -->
                    <template v-else-if="plan.status === 'Disetujui'">
                      <button
                        class="btn-primary flex items-center gap-1 px-2 py-1 text-xs"
                        @click="goToSession(plan)"
                      >
                        Buat Sesi <ArrowRight class="w-3 h-3" />
                      </button>
                    </template>
                    <!-- Selesai: no actions -->
                    <template v-else>
                      <span class="text-slate-300 text-xs italic">—</span>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-16 text-center">
          <div class="ct-empty-icon-wrap"><BookOpen class="w-9 h-9 text-slate-300" /></div>
          <p class="text-slate-400 italic text-sm">Belum ada rencana training
            <span v-if="statusFilter !== 'Semua'">dengan status "{{ statusFilter }}"</span>
          </p>
        </div>
      </div>
    </div>

    <!-- ── Create / Edit Plan Modal ── -->
    <BaseModal
      v-model="modalOpen"
      :title="editingId ? 'Edit Rencana Training' : 'Buat Rencana Training Baru'"
      size="lg"
    >
      <div class="space-y-4">

        <!-- Item kompetensi -->
        <div>
          <label class="ct-label">Item Kompetensi <span class="text-red-500">*</span></label>
          <select v-model="form.competencyItemId" class="ct-input" :class="formErrors.competencyItemId ? 'border-red-400' : ''">
            <option value="">-- Pilih item kompetensi --</option>
            <optgroup
              v-for="cat in ['Auditor QMS','Audit Manufaktur dan Shift','Audit Produk','Audit Supplier']"
              :key="cat"
              :label="cat"
            >
              <option
                v-for="item in competency.items.filter(i => i.category === cat)"
                :key="item.id"
                :value="item.id"
              >
                {{ item.itemName }}
              </option>
            </optgroup>
          </select>
          <p v-if="formErrors.competencyItemId" class="text-red-500 text-xs mt-1">{{ formErrors.competencyItemId }}</p>
        </div>

        <!-- Date + Priority row -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="ct-label">Tanggal Rencana <span class="text-red-500">*</span></label>
            <input v-model="form.plannedDate" type="date" class="ct-input" :class="formErrors.plannedDate ? 'border-red-400' : ''" />
            <p v-if="formErrors.plannedDate" class="text-red-500 text-xs mt-1">{{ formErrors.plannedDate }}</p>
          </div>
          <div>
            <label class="ct-label">Prioritas</label>
            <select v-model="form.priority" class="ct-input">
              <option>Tinggi</option>
              <option>Sedang</option>
              <option>Rendah</option>
            </select>
          </div>
        </div>

        <!-- Reason -->
        <div>
          <label class="ct-label">Alasan</label>
          <select v-model="form.reason" class="ct-input">
            <option>Gap Kompetensi</option>
            <option>Peningkatan Level</option>
            <option>Refreshment</option>
            <option>Lainnya</option>
          </select>
        </div>

        <!-- Target participants -->
        <div>
          <label class="ct-label">Peserta Target <span class="text-red-500">*</span></label>
          <div
            class="border rounded-xl overflow-hidden max-h-44 overflow-y-auto"
            :class="formErrors.targetParticipants ? 'border-red-400' : 'border-slate-200'"
          >
            <label
              v-for="a in activeAuditors"
              :key="a.id"
              class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
            >
              <input type="checkbox" :value="a.id" v-model="form.targetParticipants" class="accent-blue-600" />
              <span class="font-medium text-slate-700 text-sm">{{ a.name }}</span>
              <span class="text-slate-400 text-xs ml-auto">{{ a.section }} · {{ a.position }}</span>
            </label>
          </div>
          <p v-if="formErrors.targetParticipants" class="text-red-500 text-xs mt-1">{{ formErrors.targetParticipants }}</p>
          <p class="text-slate-400 text-xs mt-1">{{ form.targetParticipants.length }} peserta dipilih</p>
        </div>

        <!-- Notes -->
        <div>
          <label class="ct-label">Catatan (opsional)</label>
          <textarea v-model="form.notes" class="ct-input resize-none" rows="2" placeholder="Catatan tambahan..." />
        </div>

      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="modalOpen = false">Batal</BaseButton>
        <BaseButton variant="submit" :loading="loading" @click="submitPlan">
          {{ editingId ? 'Simpan Perubahan' : 'Buat Rencana' }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
