<script setup lang="ts">
import { RouterView } from 'vue-router'
import SidebarLayout from './shared/components/SidebarLayout.vue'
import ToastContainer from './shared/components/ToastContainer.vue'
</script>

<template>
  <SidebarLayout>
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </SidebarLayout>
  <ToastContainer />
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
