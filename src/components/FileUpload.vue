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
      <template v-if="!store.pdfFile">
        <svg
          class="upload-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>Choose a faction stat card PDF&hellip;</span>
      </template>
      <template v-else>
        <svg
          class="upload-icon file-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>{{ store.pdfFile.name }}</span>
      </template>
    </label>

    <div v-if="store.isLoading" class="status loading">
      <span class="spinner" aria-hidden="true"></span>
      Indexing file&hellip;
    </div>

    <div v-else-if="store.indexError" class="status error">
      {{ store.indexError }}
    </div>

    <div v-else-if="store.indexedFile" class="status success">
      <svg
        class="status-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 2.5rem 1.5rem;
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
  background-color: rgba(25, 118, 210, 0.04);
  outline: none;
}

.upload-area.dragging {
  border-color: #1976d2;
  background-color: rgba(25, 118, 210, 0.08);
}

.upload-icon {
  width: 2rem;
  height: 2rem;
  opacity: 0.5;
}

.file-icon {
  opacity: 0.6;
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

.status-icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
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
