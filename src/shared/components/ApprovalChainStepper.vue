<script setup>
/**
 * Horizontal approval chain step indicator.
 * Used in both AuditorRequest and TrainingEvaluation flows.
 */
defineProps({
  chain: { type: Array, required: true }, // ApprovalStep[]
  compact: { type: Boolean, default: false },
})

function stepColor(step) {
  if (step.status === 'Approved') return { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'bg-emerald-100 text-emerald-700' }
  if (step.status === 'Declined') return { dot: 'bg-red-500',     text: 'text-red-600',     label: 'bg-red-100 text-red-700' }
  return                                  { dot: 'bg-amber-400',  text: 'text-amber-600',   label: 'bg-amber-100 text-amber-700' }
}

function stepIcon(status) {
  if (status === 'Approved') return '✓'
  if (status === 'Declined') return '✕'
  return '…'
}
</script>

<template>
  <div :class="['flex items-start gap-0', compact ? 'text-xs' : 'text-sm']">
    <template v-for="(step, idx) in chain" :key="idx">
      <!-- Step node -->
      <div class="flex flex-col items-center" :class="compact ? 'min-w-[72px]' : 'min-w-[90px]'">
        <!-- Dot with icon -->
        <div
          :class="[stepColor(step).dot, compact ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-xs', 'rounded-full flex items-center justify-center text-white font-bold shadow-sm']"
          :title="step.status"
        >
          {{ stepIcon(step.status) }}
        </div>
        <!-- Role label -->
        <p :class="[stepColor(step).text, 'font-semibold mt-1 text-center leading-tight', compact ? 'text-[9px]' : 'text-[10px]']">
          {{ step.role }}
        </p>
        <!-- Approver name if set -->
        <p v-if="step.name" class="text-slate-400 text-center leading-tight mt-0.5" :class="compact ? 'text-[8px]' : 'text-[9px]'">
          {{ step.name }}
        </p>
        <!-- Date if set -->
        <p v-if="step.date" class="text-slate-400 text-center leading-tight" :class="compact ? 'text-[8px]' : 'text-[9px]'">
          {{ step.date }}
        </p>
        <!-- Status badge -->
        <span :class="[stepColor(step).label, 'rounded px-1 py-0.5 font-bold uppercase mt-1']" style="font-size: 8px;">
          {{ step.status }}
        </span>
      </div>

      <!-- Connector line (not after last) -->
      <div
        v-if="idx < chain.length - 1"
        class="flex-1 mt-3 border-t-2 border-dashed self-start"
        :class="step.status === 'Approved' ? 'border-emerald-300' : 'border-slate-200'"
      />
    </template>
  </div>
</template>
