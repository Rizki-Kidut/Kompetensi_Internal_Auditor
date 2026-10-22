<script setup>
import { ref, computed, onMounted } from 'vue'
import { UserPlus, Eye } from '@lucide/vue'
import { useApprovalStore } from '../../../stores/approvalStore.js'
import { buildApprovalChain } from '../../../services/calculationService.js'
import { useToast } from '../../../shared/composables/useToast.js'
import BaseTable from '../../../shared/components/BaseTable.vue'
import BaseModal from '../../../shared/components/BaseModal.vue'
import BaseButton from '../../../shared/components/BaseButton.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'
import ApprovalChainStepper from '../../../shared/components/ApprovalChainStepper.vue'
import AuditorRequestForm from '../components/AuditorRequestForm.vue'

const store = useApprovalStore()
const toast = useToast()
onMounted(() => store.load())

// ─── Form state ───────────────────────────────────────────
const modalOpen   = ref(false)
const detailOpen  = ref(false)
const detailItem  = ref(null)
const loading     = ref(false)
const errors      = ref({})

function emptyForm() {
  return {
    nik: '', name: '', section: '', position: '',
    initialScope: { qms: false, manufakturShift: false, produk: false, supplier: false },
    reason: '', reasonDetail: '', submittedBy: '',
  }
}
const form = ref(emptyForm())

function openModal() { form.value = emptyForm(); errors.value = {}; modalOpen.value = true }

function validate() {
  const e = {}
  if (!form.value.nik.trim())      e.nik      = 'NIK wajib diisi'
  if (!form.value.name.trim())     e.name     = 'Nama wajib diisi'
  if (!form.value.section.trim())  e.section  = 'Seksi wajib diisi'
  if (!form.value.position)        e.position = 'Jabatan wajib dipilih'
  if (!form.value.reason)          e.reason   = 'Alasan wajib dipilih'
  if (!form.value.submittedBy.trim()) e.submittedBy = 'Nama pengaju wajib diisi'
  // Check duplicate NIK
  if (form.value.nik && store.requests.some(r => r.nik === form.value.nik && r.finalStatus !== 'Declined'))
    e.nik = 'Sudah ada pengajuan aktif dengan NIK ini'
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
      requestType: 'Tambah Auditor',
      nik: form.value.nik.trim(),
      name: form.value.name.trim(),
      section: form.value.section.trim(),
      position: form.value.position,
      initialScope: { ...form.value.initialScope },
      reason: form.value.reason,
      reasonDetail: form.value.reasonDetail.trim(),
      submittedBy: form.value.submittedBy.trim(),
      submittedDate: new Date().toISOString().slice(0, 10),
      approvalChain: chain,
      finalStatus: 'Pending',
    }
    store.addRequest(req)
    toast.success(`Pengajuan auditor baru "${req.name}" berhasil disubmit.`)
    modalOpen.value = false
  } finally {
    loading.value = false
  }
}

function openDetail(item) { detailItem.value = item; detailOpen.value = true }

// ─── Table ────────────────────────────────────────────────
const requests = computed(() => store.requests.filter(r => r.requestType === 'Tambah Auditor'))

const columns = [
  { key: 'nik',         label: 'NIK',            width: '80px' },
  { key: 'name',        label: 'Nama',           width: '170px' },
  { key: 'section',     label: 'Seksi',          width: '140px' },
  { key: 'position',    label: 'Jabatan',        width: '130px' },
  { key: 'reason',      label: 'Alasan',         width: '120px' },
  { key: 'submittedBy', label: 'Diajukan Oleh',  width: '140px' },
  { key: 'submittedDate',label: 'Tanggal',       width: '95px' },
  { key: 'chain',       label: 'Approval Chain', width: '280px' },
  { key: 'finalStatus', label: 'Status',         width: '90px', align: 'center' },
  { key: 'actions',     label: '',               width: '46px', align: 'center' },
]
</script>

<template>
  <div class="p-6 fade-in">
    <!-- Header -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Pengajuan Auditor Baru</h1>
        <p class="text-slate-500 text-sm mt-1">Proses penambahan internal auditor melalui alur approval</p>
      </div>
      <BaseButton variant="primary" @click="openModal">
        <UserPlus class="w-4 h-4" />
        Buat Pengajuan Baru
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
      <div class="ct-card px-4 py-2.5 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-red-400"></span>
        <span class="text-xs text-slate-600 font-medium">Declined: <strong>{{ requests.filter(r => r.finalStatus === 'Declined').length }}</strong></span>
      </div>
    </div>

    <!-- Table -->
    <div class="ct-card overflow-hidden">
      <BaseTable :columns="columns" :rows="requests" empty-message="Belum ada pengajuan auditor baru">
        <template #chain="{ row }">
          <ApprovalChainStepper :chain="row.approvalChain" :compact="true" />
        </template>
        <template #finalStatus="{ row }">
          <StatusBadge :status="row.finalStatus" />
        </template>
        <template #reason="{ row }">
          <span class="ct-badge ct-badge-blue">{{ row.reason }}</span>
        </template>
        <template #actions="{ row }">
          <button class="ct-action-btn-view" title="Lihat detail" @click="openDetail(row)">
            <Eye class="w-3.5 h-3.5" />
          </button>
        </template>
      </BaseTable>
    </div>

    <!-- Create form modal -->
    <BaseModal v-model="modalOpen" title="Pengajuan Auditor Baru" size="lg">
      <AuditorRequestForm
        v-model:form-data="form"
        request-type="Tambah Auditor"
        :errors="errors"
      />
      <template #footer>
        <BaseButton variant="secondary" @click="modalOpen = false">Batal</BaseButton>
        <BaseButton variant="submit" :loading="loading" @click="submit">
          Kirim Pengajuan
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Detail / view modal -->
    <BaseModal v-model="detailOpen" :title="`Detail Pengajuan — ${detailItem?.name ?? ''}`" size="lg">
      <template v-if="detailItem">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5 p-4 bg-slate-50 rounded-xl">
          <div><p class="ct-label">NIK</p><p class="font-semibold text-slate-700">{{ detailItem.nik }}</p></div>
          <div><p class="ct-label">Nama</p><p class="font-semibold text-slate-700">{{ detailItem.name }}</p></div>
          <div><p class="ct-label">Seksi</p><p class="font-medium text-slate-600">{{ detailItem.section }}</p></div>
          <div><p class="ct-label">Jabatan</p><p class="font-medium text-slate-600">{{ detailItem.position }}</p></div>
          <div><p class="ct-label">Alasan</p><p class="font-medium text-slate-600">{{ detailItem.reason }}</p></div>
          <div><p class="ct-label">Diajukan Oleh</p><p class="font-medium text-slate-600">{{ detailItem.submittedBy }}</p></div>
          <div class="col-span-full"><p class="ct-label">Keterangan</p><p class="text-slate-600">{{ detailItem.reasonDetail || '—' }}</p></div>
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
