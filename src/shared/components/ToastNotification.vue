<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { CheckCircle, AlertCircle, Info } from '@lucide/vue'

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' }, // success|error|info
  duration: { type: Number, default: 3000 },
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const ICON_MAP = { success: CheckCircle, error: AlertCircle, info: Info }
const ICON_COLOR = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-blue-400' }
const ICON_BG   = { success: 'bg-emerald-500/20', error: 'bg-red-500/20', info: 'bg-blue-500/20' }

let timer = null
onMounted(() => {
  if (props.duration > 0) timer = setTimeout(() => emit('close'), props.duration)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300"
      leave-active-class="transition-all duration-200"
      enter-from-class="translate-y-20 opacity-0"
      leave-to-class="translate-y-20 opacity-0"
    >
      <div
        v-if="visible"
        class="fixed bottom-5 right-5 bg-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl z-[200] flex items-center gap-3 border border-slate-700 min-w-60 max-w-xs"
      >
        <div :class="['w-8 h-8 rounded-full flex items-center justify-center shrink-0', ICON_BG[type]]">
          <component :is="ICON_MAP[type]" :class="['w-4 h-4', ICON_COLOR[type]]" />
        </div>
        <span class="text-sm leading-snug">{{ message }}</span>
        <button class="ml-auto text-slate-400 hover:text-white" @click="$emit('close')">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
