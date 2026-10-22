<script setup>
import { FileX } from '@lucide/vue'

defineProps({
  columns: { type: Array, required: true }, // [{ key, label, width?, align? }]
  rows: { type: Array, default: () => [] },
  emptyMessage: { type: String, default: 'Tidak ada data' },
  stickyHeader: { type: Boolean, default: true },
})
</script>

<template>
  <div class="overflow-auto w-full">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="ct-table-header">
          <th
            v-for="col in columns"
            :key="col.key"
            :class="['px-4 py-3 font-semibold text-left whitespace-nowrap', col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left', stickyHeader ? 'sticky top-0 z-10 bg-slate-50' : '', col.class ?? '']"
            :style="col.width ? { width: col.width } : {}"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <template v-if="rows.length">
          <tr
            v-for="(row, i) in rows"
            :key="row.id ?? i"
            class="hover:bg-blue-50/50 transition-colors"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="['px-4 py-2.5 text-slate-700', col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : '']"
            >
              <slot :name="col.key" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </template>
        <tr v-else>
          <td :colspan="columns.length" class="py-16 text-center">
            <div class="ct-empty-icon-wrap">
              <FileX class="w-10 h-10 text-slate-300" />
            </div>
            <p class="text-slate-500 italic text-sm">{{ emptyMessage }}</p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
