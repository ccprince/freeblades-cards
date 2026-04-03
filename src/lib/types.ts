import type { CardLocation } from "./pdfGenerator";

export interface ModelEntry {
  name: string;
  cards: CardLocation[];
}

export interface Catalog {
  sha256: string;
  faction: string;
  releaseDate: string; // "YYYY-MM" format
  models: ModelEntry[];
  factionCards: CardLocation[];
}

export type FileStatus = "current" | "outdated" | "unknown";
