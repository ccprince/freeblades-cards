<script setup lang="ts">
import { ref } from "vue";
import { useAppStore } from "@/stores/app";

const store = useAppStore();
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) store.loadFile(file);
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) store.loadFile(file);
}

function activateInput() {
  fileInputRef.value?.click();
}
</script>

<template>
  <div class="file-upload">
    <label
      class="upload-area"
      :class="{ dragging: isDragging }"
      tabindex="0"
      role="button"
      aria-label="Choose a faction stat card PDF"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @keydown.enter.prevent="activateInput"
      @keydown.space.prevent="activateInput"
    >
      <input ref="fileInputRef" type="file" accept=".pdf" @change="onFileChange" />
      <span v-if="!store.pdfFile">Choose a faction stat card PDF&hellip;</span>
      <span v-else>{{ store.pdfFile.name }}</span>
    </label>

    <div v-if="store.isLoading" class="status loading">
      <span class="spinner" aria-hidden="true"></span>
      Indexing file&hellip;
    </div>

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
  border: 2px dashed var(--color-border-hover);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text);
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.upload-area:hover,
.upload-area:focus-visible {
  border-color: #1976d2;
  outline: none;
}

.upload-area.dragging {
  border-color: #1976d2;
  background-color: var(--color-background-soft);
}

.upload-area input[type="file"] {
  display: none;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.status.loading {
  background: var(--color-status-loading-bg);
  color: var(--color-status-loading-text);
}

.status.success {
  background: var(--color-status-success-bg);
  color: var(--color-status-success-text);
}

.status.error {
  background: var(--color-status-error-bg);
  color: var(--color-status-error-text);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  display: inline-block;
  width: 0.9em;
  height: 0.9em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
</style>
