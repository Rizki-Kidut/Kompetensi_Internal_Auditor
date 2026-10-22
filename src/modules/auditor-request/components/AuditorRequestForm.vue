<script setup>
/**
 * Shared form for both 'Tambah Auditor' and 'Non-Aktif Auditor' requests.
 * Parent passes v-model:formData and handles submit.
 */
import { computed } from 'vue'

const props = defineProps({
  formData: { type: Object, required: true },
  requestType: { type: String, required: true }, // 'Tambah Auditor' | 'Non-Aktif Auditor'
  activeAuditors: { type: Array, default: () => [] }, // for Non-Aktif dropdown
  errors: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:formData'])

function update(field, value) {
  emit('update:formData', { ...props.formData, [field]: value })
}

function updateScope(key, value) {
  emit('update:formData', {
    ...props.formData,
    initialScope: { ...props.formData.initialScope, [key]: value },
  })
}

const isTambah = computed(() => props.requestType === 'Tambah Auditor')

const POSITIONS = ['Staff', 'Group Leader', 'Section Manager', 'DDM/Dept Manager', 'Division Head']
const REASONS_TAMBAH   = ['Penambahan Baru', 'Lainnya']
const REASONS_NONAKTIF = ['Resign', 'Mutasi', 'Tidak Aktif', 'Lainnya']
const SCOPE_KEYS = ['qms', 'manufakturShift', 'produk', 'supplier']
const SCOPE_LABELS = { qms: 'QMS', manufakturShift: 'Mfg Shift', produk: 'Produk', supplier: 'Supplier' }

function onSelectAuditor(e) {
  const auditor = props.activeAuditors.find(a => a.id === e.target.value)
  if (auditor) {
    emit('update:formData', {
      ...props.formData,
      selectedAuditorId: auditor.id,
      nik: auditor.nik,
      name: auditor.name,
      section: auditor.section,
      position: auditor.position,
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Non-Aktif: auditor selector -->
    <div v-if="!isTambah">
      <label class="ct-label">Pilih Auditor <span class="text-red-500">*</span></label>
      <select
        :value="formData.selectedAuditorId"
        class="ct-input"
        :class="errors.selectedAuditorId ? 'border-red-400' : ''"
        @change="onSelectAuditor"
      >
        <option value="">-- Pilih auditor aktif --</option>
        <option v-for="a in activeAuditors" :key="a.id" :value="a.id">
          {{ a.name }} ({{ a.nik }}) · {{ a.section }}
        </option>
      </select>
      <p v-if="errors.selectedAuditorId" class="text-red-500 text-xs mt-1">{{ errors.selectedAuditorId }}</p>
    </div>

    <!-- Identity fields (editable only for Tambah) -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="ct-label">NIK <span class="text-red-500">*</span></label>
        <input
          :value="formData.nik"
          type="text"
          class="ct-input"
          :class="[errors.nik ? 'border-red-400' : '', !isTambah ? 'bg-slate-50 cursor-not-allowed' : '']"
          :readonly="!isTambah"
          placeholder="Contoh: 10009"
          @input="isTambah && update('nik', $event.target.value)"
        />
        <p v-if="errors.nik" class="text-red-500 text-xs mt-1">{{ errors.nik }}</p>
      </div>
      <div>
        <label class="ct-label">Nama Lengkap <span class="text-red-500">*</span></label>
        <input
          :value="formData.name"
          type="text"
          class="ct-input"
          :class="[errors.name ? 'border-red-400' : '', !isTambah ? 'bg-slate-50 cursor-not-allowed' : '']"
          :readonly="!isTambah"
          placeholder="Nama lengkap auditor"
          @input="isTambah && update('name', $event.target.value)"
        />
        <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
      </div>
      <div>
        <label class="ct-label">Seksi / Departemen <span class="text-red-500">*</span></label>
        <input
          :value="formData.section"
          type="text"
          class="ct-input"
          :class="[errors.section ? 'border-red-400' : '', !isTambah ? 'bg-slate-50 cursor-not-allowed' : '']"
          :readonly="!isTambah"
          placeholder="Contoh: Quality Assurance"
          @input="isTambah && update('section', $event.target.value)"
        />
        <p v-if="errors.section" class="text-red-500 text-xs mt-1">{{ errors.section }}</p>
      </div>
      <div>
        <label class="ct-label">Jabatan <span class="text-red-500">*</span></label>
        <select
          :value="formData.position"
          class="ct-input"
          :class="[errors.position ? 'border-red-400' : '', !isTambah ? 'bg-slate-50 cursor-not-allowed' : '']"
          :disabled="!isTambah"
          @change="isTambah && update('position', $event.target.value)"
        >
          <option value="">-- Pilih jabatan --</option>
          <option v-for="p in POSITIONS" :key="p" :value="p">{{ p }}</option>
        </select>
        <p v-if="errors.position" class="text-red-500 text-xs mt-1">{{ errors.position }}</p>
      </div>
    </div>

    <!-- Scope (Tambah only) -->
    <div v-if="isTambah">
      <label class="ct-label">Scope Audit Awal</label>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
        <label
          v-for="key in SCOPE_KEYS"
          :key="key"
          class="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors"
          :class="formData.initialScope?.[key] ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'"
        >
          <input
            type="checkbox"
            :checked="formData.initialScope?.[key]"
            class="accent-blue-600"
            @change="updateScope(key, $event.target.checked)"
          />
          <span class="text-sm font-medium text-slate-700">{{ SCOPE_LABELS[key] }}</span>
        </label>
      </div>
    </div>

    <!-- Reason -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="ct-label">Alasan <span class="text-red-500">*</span></label>
        <select
          :value="formData.reason"
          class="ct-input"
          :class="errors.reason ? 'border-red-400' : ''"
          @change="update('reason', $event.target.value)"
        >
          <option value="">-- Pilih alasan --</option>
          <option v-for="r in (isTambah ? REASONS_TAMBAH : REASONS_NONAKTIF)" :key="r" :value="r">{{ r }}</option>
        </select>
        <p v-if="errors.reason" class="text-red-500 text-xs mt-1">{{ errors.reason }}</p>
      </div>
      <div>
        <label class="ct-label">Diajukan Oleh <span class="text-red-500">*</span></label>
        <input
          :value="formData.submittedBy"
          type="text"
          class="ct-input"
          :class="errors.submittedBy ? 'border-red-400' : ''"
          placeholder="Nama pengaju"
          @input="update('submittedBy', $event.target.value)"
        />
        <p v-if="errors.submittedBy" class="text-red-500 text-xs mt-1">{{ errors.submittedBy }}</p>
      </div>
    </div>

    <!-- Detail reason -->
    <div>
      <label class="ct-label">Keterangan / Detail Alasan</label>
      <textarea
        :value="formData.reasonDetail"
        class="ct-input resize-none"
        rows="3"
        placeholder="Jelaskan alasan pengajuan secara singkat..."
        @input="update('reasonDetail', $event.target.value)"
      />
    </div>
  </div>
</template>
