<script setup lang="ts">
import FileUpload from "@/components/FileUpload.vue";
import ModelSelector from "@/components/ModelSelector.vue";
import { useAppStore } from "@/stores/app";

const store = useAppStore();
</script>

<template>
  <main>
    <FileUpload />
    <ModelSelector v-if="store.indexedFile !== null" />
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
</style>
