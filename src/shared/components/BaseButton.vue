<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  size: { type: String, default: 'md' }, // sm | md
})

const variantClass = {
  primary:        'btn-primary',
  secondary:      'btn-secondary',
  success:        'btn-success',
  danger:         'btn-danger',
  'danger-outline': 'btn-danger-outline',
  submit:         'btn-submit',
}
const sizeClass = {
  sm: 'px-3 py-1.5 text-xs',
  md: '',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[variantClass[variant], size === 'sm' ? sizeClass.sm : '', 'inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed']"
  >
    <svg v-if="loading" class="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
    <slot />
  </button>
</template>
