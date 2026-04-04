<script setup lang="ts">
import { ref } from "vue";
import { generatePdf } from "@/lib/pdfGenerator";
import { useAppStore } from "@/stores/app";

const store = useAppStore();
const isGenerating = ref(false);

async function generate() {
  if (!store.pdfBytes || !store.indexedFile) return;
  isGenerating.value = true;
  try {
    const bytes = await generatePdf(
      store.pdfBytes,
      store.selectedModelGroups,
      store.indexedFile.factionCards,
      store.includeFactionCards,
    );
    const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store.indexedFile.faction} - selected cards.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    isGenerating.value = false;
  }
}
</script>

<template>
  <div class="model-selector">
    <div class="toolbar">
      <button @click="store.selectAll()">Select All</button>
      <button @click="store.selectNone()">Select None</button>
    </div>

    <ul class="model-list">
      <li v-for="model in store.indexedFile!.models" :key="model.name">
        <label>
          <input
            type="checkbox"
            :checked="store.selectedModelNames.includes(model.name)"
            @change="store.toggleModel(model.name)"
          />
          {{ model.name }}
        </label>
      </li>
    </ul>

    <label v-if="store.indexedFile!.factionCards.length > 0" class="faction-cards-toggle">
      <input
        type="checkbox"
        :checked="store.includeFactionCards"
        @change="store.setIncludeFactionCards(($event.target as HTMLInputElement).checked)"
      />
      Include faction cards
    </label>

    <button
      class="generate-btn"
      :disabled="store.selectedModelNames.length === 0 || isGenerating"
      @click="generate"
    >
      {{ isGenerating ? "Generating…" : "Generate PDF" }}
    </button>
  </div>
</template>

<style scoped>
.model-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
}

.toolbar button {
  padding: 0.3rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
}

.toolbar button:hover {
  background: #e8e8e8;
}

.model-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 20rem;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.model-list li {
  padding: 0;
}

.model-list li label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.model-list li:not(:last-child) {
  border-bottom: 1px solid #eee;
}

.model-list li label:hover {
  background: #f9f9f9;
}

.faction-cards-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.generate-btn {
  align-self: flex-start;
  padding: 0.5rem 1.25rem;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

.generate-btn:hover:not(:disabled) {
  background: #1565c0;
}

.generate-btn:disabled {
  background: #90caf9;
  cursor: not-allowed;
}
</style>
