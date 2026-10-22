<script setup>
import CompetencySymbol from '../../../shared/components/CompetencySymbol.vue'

defineProps({
  level:  { type: String,  default: '' },
  isGap:  { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<template>
  <button
    class="flex items-center justify-center w-full rounded py-0.5 transition-all duration-150 relative"
    :class="isGap ? 'hover:bg-red-100/70' : 'hover:bg-blue-100/50'"
    @click="$emit('click')"
  >
    <CompetencySymbol :level="level" size="sm" />
    <!-- gap dot indicator -->
    <span
      v-if="isGap && level !== ''"
      class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-400"
    />
  </button>
</template>
