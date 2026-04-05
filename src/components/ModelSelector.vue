<script setup lang="ts">
import { generatePdf, packCards } from "@/lib/pdfGenerator";
import { useAppStore } from "@/stores/app";
import { computed, ref } from "vue";

const store = useAppStore();
const isGenerating = ref(false);

const outputStats = computed(() => {
  const groups = store.selectedModelGroups;
  if (groups.length === 0) return null;
  const modelCount = groups.length;
  const cardCount =
    groups.reduce((sum, g) => sum + g.length, 0) +
    (store.includeRuleSummaryCards ? store.indexedFile!.ruleSummaryCards.length : 0);
  const pageCount = packCards(
    groups,
    store.indexedFile!.ruleSummaryCards,
    store.includeRuleSummaryCards,
  ).length;
  return { modelCount, cardCount, pageCount };
});

async function generate() {
  if (!store.pdfBytes || !store.indexedFile) return;
  isGenerating.value = true;
  try {
    const bytes = await generatePdf(
      store.pdfBytes,
      store.selectedModelGroups,
      store.indexedFile.ruleSummaryCards,
      store.includeRuleSummaryCards,
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
    <div class="section-header">
      <span class="section-label">Select models</span>
      <div class="toolbar">
        <button @click="store.selectAll()">Select All</button>
        <button @click="store.selectNone()">Select None</button>
      </div>
    </div>

    <ul class="model-list">
      <li v-for="model in store.indexedFile!.models" :key="model.name">
        <label>
          <input
            type="checkbox"
            :checked="store.selectedModelNames.includes(model.name)"
            @change="store.toggleModel(model.name)"
          />
          <span class="model-name">{{ model.name }}</span>
          <span v-if="model.cards.length > 1" class="card-count-badge"
            >{{ model.cards.length }} cards</span
          >
        </label>
      </li>
    </ul>

    <label v-if="store.indexedFile!.ruleSummaryCards.length > 0" class="rule-summary-cards-toggle">
      <input
        type="checkbox"
        :checked="store.includeRuleSummaryCards"
        @change="store.setIncludeRuleSummaryCards(($event.target as HTMLInputElement).checked)"
      />
      Include rule summary cards{{
        store.indexedFile!.ruleSummaryCards.length > 1
          ? ` (${store.indexedFile!.ruleSummaryCards.length} cards)`
          : ""
      }}
    </label>

    <div class="generate-footer">
      <p v-if="outputStats" class="output-summary">
        {{ outputStats.modelCount }}
        {{ outputStats.modelCount === 1 ? "model" : "models" }} &middot;
        {{ outputStats.cardCount }}
        {{ outputStats.cardCount === 1 ? "card" : "cards" }} &middot; ~{{ outputStats.pageCount }}
        {{ outputStats.pageCount === 1 ? "page" : "pages" }}
      </p>
      <button
        class="generate-btn"
        :disabled="store.selectedModelNames.length === 0 || isGenerating"
        @click="generate"
      >
        <span v-if="isGenerating" class="spinner" aria-hidden="true"></span>
        {{ isGenerating ? "Generating…" : "Generate PDF" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.model-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
  flex: 1;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
}

.toolbar button {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 4px;
  background: var(--color-background-mute);
  color: var(--color-text);
  cursor: pointer;
}

.toolbar button:hover {
  filter: brightness(0.95);
}

.model-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--color-border-hover);
  border-radius: 6px;
}

.model-list li {
  padding: 0;
}

.model-list li label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  color: var(--color-text);
  border-left: 2px solid transparent;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}

.model-list li:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.model-list li label:hover {
  background: var(--color-background-soft);
  border-left-color: #1976d2;
}

.model-name {
  flex: 1;
}

.card-count-badge {
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.7;
  border: 1px solid var(--color-border-hover);
  border-radius: 10px;
  padding: 0.1em 0.5em;
  line-height: 1.4;
}

.rule-summary-cards-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--color-text);
}

.generate-footer {
  background: var(--color-background);
  padding: 0.75rem 0 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.output-summary {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.65rem 1.25rem;
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
  opacity: 0.45;
  cursor: not-allowed;
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
