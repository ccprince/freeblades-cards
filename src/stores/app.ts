import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { indexFile } from "@/lib/cardIndexer";
import type { CardLocation } from "@/lib/pdfGenerator";
import type { IndexedFile } from "@/lib/types";

export const useAppStore = defineStore("app", () => {
  const pdfFile = ref<File | null>(null);
  const pdfBytes = ref<Uint8Array | null>(null);
  const indexedFile = ref<IndexedFile | null>(null);
  const indexError = ref<string | null>(null);
  const selectedModelNames = ref<string[]>([]);
  const includeFactionCards = ref(false);
  const isLoading = ref(false);

  const selectedModelGroups = computed<CardLocation[][]>(() => {
    if (!indexedFile.value) return [];
    return indexedFile.value.models
      .filter((m) => selectedModelNames.value.includes(m.name))
      .map((m) => m.cards);
  });

  async function loadFile(file: File) {
    isLoading.value = true;
    pdfFile.value = file;
    indexedFile.value = null;
    indexError.value = null;
    selectedModelNames.value = [];
    includeFactionCards.value = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfBytes.value = new Uint8Array(arrayBuffer);
      const result = await indexFile(pdfBytes.value);
      if (result.models.length === 0 && result.factionCards.length === 0) {
        indexError.value = "No stat cards were found in this PDF.";
      } else {
        indexedFile.value = result;
      }
    } catch {
      indexError.value = "Could not read this file as a Freeblades stat card PDF.";
    } finally {
      isLoading.value = false;
    }
  }

  function toggleModel(name: string) {
    const idx = selectedModelNames.value.indexOf(name);
    if (idx === -1) {
      selectedModelNames.value.push(name);
    } else {
      selectedModelNames.value.splice(idx, 1);
    }
  }

  function selectAll() {
    if (!indexedFile.value) return;
    selectedModelNames.value = indexedFile.value.models.map((m) => m.name);
  }

  function selectNone() {
    selectedModelNames.value = [];
  }

  function setIncludeFactionCards(val: boolean) {
    includeFactionCards.value = val;
  }

  return {
    pdfFile,
    pdfBytes,
    indexedFile,
    indexError,
    selectedModelNames,
    includeFactionCards,
    isLoading,
    selectedModelGroups,
    loadFile,
    toggleModel,
    selectAll,
    selectNone,
    setIncludeFactionCards,
  };
});
