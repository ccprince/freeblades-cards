<script setup lang="ts">
import FileUpload from "@/components/FileUpload.vue";
import ModelSelector from "@/components/ModelSelector.vue";
import { useAppStore } from "@/stores/app";

const store = useAppStore();
</script>

<template>
  <main>
    <FileUpload />
    <Transition name="fade-up">
      <ModelSelector v-if="store.indexedFile !== null" />
    </Transition>
  </main>
</template>

<style scoped>
main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.fade-up-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
</style>
