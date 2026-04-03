import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { allCatalogs } from "@/data/catalogs";
import { hashFile, identifyFile } from "@/lib/fileIdentification";
import type { CardLocation } from "@/lib/pdfGenerator";
import type { Catalog, FileStatus } from "@/lib/types";

export const useAppStore = defineStore("app", () => {
  const pdfFile = ref<File | null>(null);
  const pdfBytes = ref<Uint8Array | null>(null);
  const catalog = ref<Catalog | null>(null);
  const fileStatus = ref<FileStatus | null>(null);
  const selectedModelNames = ref<string[]>([]);
  const includeFactionCards = ref(false);
  const isLoading = ref(false);

  const selectedModelGroups = computed<CardLocation[][]>(() => {
    if (!catalog.value) return [];
    return catalog.value.models
      .filter((m) => selectedModelNames.value.includes(m.name))
      .map((m) => m.cards);
  });

  async function loadFile(file: File) {
    isLoading.value = true;
    pdfFile.value = file;
    catalog.value = null;
    fileStatus.value = null;
    selectedModelNames.value = [];
    includeFactionCards.value = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfBytes.value = new Uint8Array(arrayBuffer);
      const hash = await hashFile(file);
      const result = identifyFile(hash, allCatalogs);
      catalog.value = result.catalog;
      fileStatus.value = result.status;
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
    if (!catalog.value) return;
    selectedModelNames.value = catalog.value.models.map((m) => m.name);
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
    catalog,
    fileStatus,
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
