<script setup>
import { ref, computed, onMounted } from 'vue'
import { UserMinus, Eye } from '@lucide/vue'
import { useApprovalStore } from '../../../stores/approvalStore.js'
import { useAuditorStore } from '../../../stores/auditorStore.js'
import { buildApprovalChain } from '../../../services/calculationService.js'
import { useToast } from '../../../shared/composables/useToast.js'
import BaseTable from '../../../shared/components/BaseTable.vue'
import BaseModal from '../../../shared/components/BaseModal.vue'
import BaseButton from '../../../shared/components/BaseButton.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'
import ApprovalChainStepper from '../../../shared/components/ApprovalChainStepper.vue'
import AuditorRequestForm from '../components/AuditorRequestForm.vue'

const approvalStore = useApprovalStore()
const auditorStore  = useAuditorStore()
const toast = useToast()

onMounted(() => { approvalStore.load(); auditorStore.load() })

const activeAuditors = computed(() => auditorStore.auditors.filter(a => a.status === 'Aktif'))

// ─── Form state ───────────────────────────────────────────
const modalOpen  = ref(false)
const detailOpen = ref(false)
const detailItem = ref(null)
const loading    = ref(false)
const errors     = ref({})

function emptyForm() {
  return {
    selectedAuditorId: '', nik: '', name: '', section: '', position: '',
    reason: '', reasonDetail: '', submittedBy: '',
    initialScope: null,
  }
}
const form = ref(emptyForm())

function openModal() { form.value = emptyForm(); errors.value = {}; modalOpen.value = true }

function validate() {
  const e = {}
  if (!form.value.selectedAuditorId) e.selectedAuditorId = 'Pilih auditor yang akan di-non-aktifkan'
  if (!form.value.reason)            e.reason = 'Alasan wajib dipilih'
  if (!form.value.submittedBy.trim()) e.submittedBy = 'Nama pengaju wajib diisi'
  // Check no duplicate pending
  if (form.value.nik && approvalStore.requests.some(
    r => r.nik === form.value.nik && r.requestType === 'Non-Aktif Auditor' && r.finalStatus === 'Pending'
  )) {
    e.selectedAuditorId = 'Sudah ada pengajuan non-aktif pending untuk auditor ini'
  }
  return e
}

function submit() {
  errors.value = validate()
  if (Object.keys(errors.value).length) return

  loading.value = true
  try {
    const chain = buildApprovalChain(form.value.position)
    const req = {
      id: `req-${Date.now()}`,
      requestType: 'Non-Aktif Auditor',
      nik: form.value.nik,
      name: form.value.name,
      section: form.value.section,
      position: form.value.position,
      initialScope: null,
      reason: form.value.reason,
      reasonDetail: form.value.reasonDetail.trim(),
      submittedBy: form.value.submittedBy.trim(),
      submittedDate: new Date().toISOString().slice(0, 10),
      approvalChain: chain,
      finalStatus: 'Pending',
    }
    approvalStore.addRequest(req)
    toast.success(`Pengajuan non-aktif "${req.name}" berhasil disubmit.`)
    modalOpen.value = false
  } finally {
    loading.value = false
  }
}

function openDetail(item) { detailItem.value = item; detailOpen.value = true }

// ─── Table ────────────────────────────────────────────────
const requests = computed(() => approvalStore.requests.filter(r => r.requestType === 'Non-Aktif Auditor'))

const columns = [
  { key: 'nik',          label: 'NIK',           width: '80px' },
  { key: 'name',         label: 'Nama Auditor',  width: '160px' },
  { key: 'section',      label: 'Seksi',         width: '130px' },
  { key: 'reason',       label: 'Alasan',        width: '100px' },
  { key: 'submittedBy',  label: 'Diajukan Oleh', width: '130px' },
  { key: 'submittedDate',label: 'Tanggal',       width: '90px' },
  { key: 'chain',        label: 'Approval Chain',width: '260px' },
  { key: 'finalStatus',  label: 'Status',        width: '90px', align: 'center' },
  { key: 'actions',      label: '',              width: '46px', align: 'center' },
]

const REASON_COLOR = { Resign: 'ct-badge-red', Mutasi: 'ct-badge-amber', 'Tidak Aktif': 'ct-badge-slate', Lainnya: 'ct-badge-slate' }
</script>

<template>
  <div class="p-6 fade-in">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Pengajuan Non-Aktif Auditor</h1>
        <p class="text-slate-500 text-sm mt-1">Proses non-aktif / resign auditor melalui alur approval</p>
      </div>
      <BaseButton variant="danger" @click="openModal">
        <UserMinus class="w-4 h-4" />
        Buat Pengajuan
      </BaseButton>
    </div>

    <!-- Summary badges -->
    <div class="flex flex-wrap gap-3 mb-4">
      <div class="ct-card px-4 py-2.5 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        <span class="text-xs text-slate-600 font-medium">Pending: <strong>{{ requests.filter(r => r.finalStatus === 'Pending').length }}</strong></span>
      </div>
      <div class="ct-card px-4 py-2.5 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="text-xs text-slate-600 font-medium">Approved: <strong>{{ requests.filter(r => r.finalStatus === 'Approved').length }}</strong></span>
      </div>
    </div>

    <div class="ct-card overflow-hidden">
      <BaseTable :columns="columns" :rows="requests" empty-message="Belum ada pengajuan non-aktif">
        <template #chain="{ row }">
          <ApprovalChainStepper :chain="row.approvalChain" :compact="true" />
        </template>
        <template #reason="{ row }">
          <span :class="['ct-badge', REASON_COLOR[row.reason] ?? 'ct-badge-slate']">{{ row.reason }}</span>
        </template>
        <template #finalStatus="{ row }">
          <StatusBadge :status="row.finalStatus" />
        </template>
        <template #actions="{ row }">
          <button class="ct-action-btn-view" title="Lihat detail" @click="openDetail(row)">
            <Eye class="w-3.5 h-3.5" />
          </button>
        </template>
      </BaseTable>
    </div>

    <!-- Create form modal -->
    <BaseModal v-model="modalOpen" title="Pengajuan Non-Aktif Auditor" size="lg">
      <AuditorRequestForm
        v-model:form-data="form"
        request-type="Non-Aktif Auditor"
        :active-auditors="activeAuditors"
        :errors="errors"
      />
      <template #footer>
        <BaseButton variant="secondary" @click="modalOpen = false">Batal</BaseButton>
        <BaseButton variant="danger" :loading="loading" @click="submit">
          Kirim Pengajuan
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Detail modal -->
    <BaseModal v-model="detailOpen" :title="`Detail Pengajuan Non-Aktif — ${detailItem?.name ?? ''}`" size="lg">
      <template v-if="detailItem">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5 p-4 bg-slate-50 rounded-xl">
          <div><p class="ct-label">NIK</p><p class="font-semibold text-slate-700">{{ detailItem.nik }}</p></div>
          <div><p class="ct-label">Nama</p><p class="font-semibold text-slate-700">{{ detailItem.name }}</p></div>
          <div><p class="ct-label">Seksi</p><p class="font-medium text-slate-600">{{ detailItem.section }}</p></div>
          <div>
            <p class="ct-label">Alasan</p>
            <span :class="['ct-badge', REASON_COLOR[detailItem.reason] ?? 'ct-badge-slate']">{{ detailItem.reason }}</span>
          </div>
          <div><p class="ct-label">Diajukan Oleh</p><p class="font-medium text-slate-600">{{ detailItem.submittedBy }}</p></div>
          <div><p class="ct-label">Tanggal</p><p class="font-medium text-slate-600">{{ detailItem.submittedDate }}</p></div>
          <div class="col-span-full">
            <p class="ct-label">Keterangan</p>
            <p class="text-slate-600">{{ detailItem.reasonDetail || '—' }}</p>
          </div>
        </div>
        <div class="mb-4">
          <p class="ct-label mb-3">Approval Chain</p>
          <ApprovalChainStepper :chain="detailItem.approvalChain" />
        </div>
        <div class="flex items-center gap-3">
          <p class="ct-label mb-0">Status Akhir</p>
          <StatusBadge :status="detailItem.finalStatus" />
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" @click="detailOpen = false">Tutup</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
