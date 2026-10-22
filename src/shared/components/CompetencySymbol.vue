<script setup>
import { computed } from 'vue'

const props = defineProps({
  level: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm|md|lg
})

const LEVEL_STYLE = {
  '★': { symbol: '★', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-300', title: 'Sangat Kompeten' },
  '◆': { symbol: '◆', bg: 'bg-blue-100',  text: 'text-blue-600',  border: 'border-blue-300',  title: 'Kompeten' },
  '●': { symbol: '●', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-300', title: 'Cukup Kompeten' },
  '':  { symbol: '—', bg: 'bg-white',       text: 'text-slate-300',  border: 'border-slate-200',  title: 'Belum Dinilai' },
}

const sizeClass = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
}

const style = computed(() => LEVEL_STYLE[props.level] ?? LEVEL_STYLE[''])
const sz    = computed(() => sizeClass[props.size] ?? sizeClass.md)
</script>

<template>
  <span
    :class="[style.bg, style.text, 'border', style.border, sz, 'rounded flex items-center justify-center font-bold cursor-default select-none transition-all']"
    :title="style.title"
  >
    {{ style.symbol }}
  </span>
</template>
