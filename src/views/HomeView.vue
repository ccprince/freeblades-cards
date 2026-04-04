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
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
}
</style>
