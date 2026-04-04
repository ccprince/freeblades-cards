import type { CardLocation } from "./pdfGenerator";

export interface ModelEntry {
  name: string;
  cards: CardLocation[];
}

export interface IndexedFile {
  faction: string;
  models: ModelEntry[];
  ruleSummaryCards: CardLocation[];
}
