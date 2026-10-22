<script setup>
import { computed } from 'vue'

const props = defineProps({
  auditor: { type: Object, required: true },
  areas: { type: Array, required: true },
  compact: { type: Boolean, default: false },
})

const SCOPE_LABELS = { qms: 'QMS', manufakturShift: 'Mfg Shift', produk: 'Produk', supplier: 'Supplier' }
const SCOPE_COLOR  = { qms: 'ct-badge-blue', manufakturShift: 'ct-badge-amber', produk: 'ct-badge-emerald', supplier: 'ct-badge-red' }

const activeScopes = computed(() =>
  Object.entries(props.auditor.scopeAuditor ?? {}).filter(([, v]) => v)
)
</script>

<template>
  <div>
    <!-- Scope badges -->
    <div v-if="!compact" class="mb-4">
      <p class="ct-label mb-2">Scope Audit</p>
      <div class="flex flex-wrap gap-1.5">
        <span v-if="!activeScopes.length" class="text-slate-400 italic text-xs">Tidak ada scope aktif</span>
        <span
          v-for="([key]) in activeScopes"
          :key="key"
          :class="['ct-badge', SCOPE_COLOR[key]]"
        >
          {{ SCOPE_LABELS[key] }}
        </span>
      </div>
    </div>

    <!-- Area O/X grid -->
    <div>
      <p v-if="!compact" class="ct-label mb-2">Penugasan Area Audit</p>
      <div class="overflow-x-auto">
        <table class="text-sm border-collapse w-full">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th
                v-for="area in areas"
                :key="area"
                class="px-3 py-2 text-center text-slate-600 font-semibold whitespace-nowrap"
                :class="compact ? 'text-xs px-2 py-1' : ''"
              >
                {{ area }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                v-for="area in areas"
                :key="area"
                class="px-3 py-2 text-center"
                :class="compact ? 'px-2 py-1' : ''"
              >
                <span
                  :class="auditor.areaAuditPermission?.[area] === 'O'
                    ? 'text-emerald-600 font-black'
                    : 'text-red-400 font-black'"
                  :style="compact ? 'font-size:14px' : 'font-size:16px'"
                >
                  {{ auditor.areaAuditPermission?.[area] ?? 'X' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
