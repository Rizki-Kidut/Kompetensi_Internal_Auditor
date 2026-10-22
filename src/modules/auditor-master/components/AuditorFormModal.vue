<script setup>
import { computed } from 'vue'
import { User, Calendar, Building2, Briefcase } from '@lucide/vue'
import BaseModal from '../../../shared/components/BaseModal.vue'
import StatusBadge from '../../../shared/components/StatusBadge.vue'
import CompetencySymbol from '../../../shared/components/CompetencySymbol.vue'
import AreaAssignmentMatrix from './AreaAssignmentMatrix.vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  auditor: { type: Object, default: null },
  areas: { type: Array, default: () => ['Area Produksi A', 'Area Produksi B', 'Gudang RM', 'Gudang FG', 'Maintenance'] },
  competencySummary: { type: Array, default: () => [] }, // [{ category, levels[] }]
})
const emit = defineEmits(['update:modelValue'])

const SCOPE_LABELS = { qms: 'QMS', manufakturShift: 'Mfg Shift', produk: 'Produk', supplier: 'Supplier' }
const SCOPE_COLOR  = { qms: 'ct-badge-blue', manufakturShift: 'ct-badge-amber', produk: 'ct-badge-emerald', supplier: 'ct-badge-red' }

const activeScopes = computed(() =>
  props.auditor ? Object.entries(props.auditor.scopeAuditor ?? {}).filter(([, v]) => v) : []
)
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="auditor ? `Detail Auditor — ${auditor.name}` : 'Detail Auditor'"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-if="auditor">
      <!-- Profile row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 p-4 bg-slate-50 rounded-xl">
        <div class="flex flex-col gap-1">
          <span class="ct-label">NIK</span>
          <span class="font-semibold text-slate-700">{{ auditor.nik }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="ct-label">Nama</span>
          <span class="font-semibold text-slate-700">{{ auditor.name }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="ct-label">Seksi</span>
          <span class="font-medium text-slate-600">{{ auditor.section }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="ct-label">Jabatan</span>
          <span class="font-medium text-slate-600">{{ auditor.position }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="ct-label">Status</span>
          <StatusBadge :status="auditor.status" />
        </div>
        <div class="flex flex-col gap-1">
          <span class="ct-label">Bergabung sebagai Auditor</span>
          <span class="font-medium text-slate-600">{{ auditor.joinAsAuditorDate }}</span>
        </div>
      </div>

      <!-- Scope badges -->
      <div class="mb-5">
        <p class="ct-label mb-2">Scope Audit</p>
        <div class="flex flex-wrap gap-1.5">
          <span v-if="!activeScopes.length" class="text-slate-400 italic text-sm">Tidak ada scope aktif</span>
          <span
            v-for="([key]) in activeScopes"
            :key="key"
            :class="['ct-badge', SCOPE_COLOR[key]]"
          >
            {{ SCOPE_LABELS[key] }}
          </span>
        </div>
      </div>

      <!-- Area assignment -->
      <div class="mb-5">
        <p class="ct-label mb-2">Penugasan Area Audit <span class="font-normal text-slate-400 ml-1">(O = Boleh · X = Tidak — perubahan hanya melalui approval)</span></p>
        <AreaAssignmentMatrix :auditor="auditor" :areas="areas" />
      </div>

      <!-- Competency summary (if provided) -->
      <div v-if="competencySummary.length">
        <p class="ct-label mb-3">Ringkasan Kompetensi Terakhir</p>
        <div class="space-y-3">
          <div v-for="cat in competencySummary" :key="cat.category">
            <p class="text-xs font-bold text-slate-500 mb-1.5">{{ cat.category }}</p>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="cell in cat.cells"
                :key="cell.itemId"
                class="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100"
              >
                <CompetencySymbol :level="cell.level" size="sm" />
                <span class="text-xs text-slate-600 max-w-[120px] truncate" :title="cell.itemName">{{ cell.itemName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <button class="btn-secondary" @click="$emit('update:modelValue', false)">Tutup</button>
    </template>
  </BaseModal>
</template>
