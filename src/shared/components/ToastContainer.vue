<script setup>
import { useToast } from '../composables/useToast.js'
import ToastNotification from './ToastNotification.vue'

const { toasts, remove } = useToast()
</script>

<template>
  <div class="fixed bottom-5 right-5 z-[200] flex flex-col gap-2">
    <ToastNotification
      v-for="t in toasts"
      :key="t.id"
      :message="t.message"
      :type="t.type"
      :duration="t.duration"
      :visible="true"
      @close="remove(t.id)"
    />
  </div>
</template>
