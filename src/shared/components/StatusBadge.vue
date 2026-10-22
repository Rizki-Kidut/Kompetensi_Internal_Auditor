<script setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * status value — mapped to a color variant
   * or pass variant directly
   */
  status: { type: String, default: '' },
  variant: { type: String, default: '' }, // blue|amber|slate|emerald|red
  bordered: { type: Boolean, default: false },
})

const STATUS_MAP = {
  'Aktif': 'emerald',
  'Approved': 'emerald',
  'Selesai': 'emerald',
  'Terjadwal': 'blue',
  'Disetujui': 'emerald',
  'Tidak Aktif': 'slate',
  'Resign': 'slate',
  'Batal': 'slate',
  'Non-Aktif': 'slate',
  'Pending': 'amber',
  'Menunggu Approval': 'amber',
  'Draft': 'amber',
  'Declined': 'red',
  'Gap': 'red',
  'Expired': 'red',
  'Tinggi': 'red',
  'Sedang': 'amber',
  'Rendah': 'slate',
}

const colorClass = computed(() => {
  const v = props.variant || STATUS_MAP[props.status] || 'slate'
  if (props.bordered) {
    const map = { blue: 'ct-status-ok', amber: 'ct-status-warn', red: 'ct-status-danger', emerald: 'ct-status-ok', slate: 'ct-status-badge bg-slate-100 text-slate-600 border-slate-200' }
    return map[v] ?? 'ct-status-badge bg-slate-100 text-slate-600 border-slate-200'
  }
  const map = { blue: 'ct-badge-blue', amber: 'ct-badge-amber', slate: 'ct-badge-slate', emerald: 'ct-badge-emerald', red: 'ct-badge-red' }
  return map[v] ?? 'ct-badge-slate'
})
</script>

<template>
  <span :class="colorClass">
    <slot>{{ status }}</slot>
  </span>
</template>
