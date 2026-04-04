<script setup lang="ts">
import { useAppStore } from "@/stores/app";

const store = useAppStore();

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    store.loadFile(file);
  }
}
</script>

<template>
  <div class="file-upload">
    <label class="upload-area">
      <input type="file" accept=".pdf" @change="onFileChange" />
      <span v-if="!store.pdfFile">Choose a faction stat card PDF&hellip;</span>
      <span v-else>{{ store.pdfFile.name }}</span>
    </label>

    <div v-if="store.isLoading" class="status loading">Indexing file&hellip;</div>

    <div v-else-if="store.indexError" class="status error">
      {{ store.indexError }}
    </div>

    <div v-else-if="store.indexedFile" class="status success">
      {{ store.indexedFile.faction || "Unknown faction" }} &mdash;
      {{ store.indexedFile.models.length }} models found
    </div>
  </div>
</template>

<style scoped>
.file-upload {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  border: 2px dashed #ccc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  color: #555;
  transition: border-color 0.2s;
}

.upload-area:hover {
  border-color: #888;
}

.upload-area input[type="file"] {
  display: none;
}

.status {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.status.loading {
  background: #f0f0f0;
  color: #555;
}

.status.success {
  background: #e6f4ea;
  color: #2e7d32;
}

.status.error {
  background: #fdecea;
  color: #c62828;
}
</style>
