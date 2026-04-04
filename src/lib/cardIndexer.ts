import type { CardLocation } from "./pdfGenerator";
import type { IndexedFile, ModelEntry } from "./types";

const BOTTOM_STRIP_FRACTION = 0.3;
const LEFT_ZONE_MIN = 0.3;
const LEFT_ZONE_MAX = 0.5;
const RIGHT_ZONE_MIN = 0.8;
const Y_GROUPING_TOLERANCE = 3;
const RULE_SUMMARY_CARD_MARKER = "RULES REFERENCE";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface RawTextItem {
  str: string;
  x: number;
  y: number;
}

interface PageDimensions {
  width: number;
  height: number;
}

interface ModelCard {
  name: string;
  page: number;
  side: "left" | "right";
}

interface RuleSummaryCardResult {
  location: CardLocation;
  factionName: string;
}

export interface PageResult {
  modelCards: ModelCard[];
  ruleSummaryCards: RuleSummaryCardResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Groups items by approximate y position using a nearest-neighbor sweep.
 * Uses the first item's y in each group as the cluster representative to
 * avoid unbounded chain merging.
 */
function groupByY(items: RawTextItem[]): RawTextItem[][] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const groups: RawTextItem[][] = [[sorted[0]!]];

  for (let i = 1; i < sorted.length; i++) {
    const lastGroup = groups[groups.length - 1]!;
    const representativeY = lastGroup[0]!.y;
    if (Math.abs(sorted[i]!.y - representativeY) <= Y_GROUPING_TOLERANCE) {
      lastGroup.push(sorted[i]!);
    } else {
      groups.push([sorted[i]!]);
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Pure algorithm (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Processes raw text items from a single PDF page and classifies them as
 * model cards or rule summary cards based on position and content.
 */
export function processPageItems(
  pageNumber: number,
  items: RawTextItem[],
  dims: PageDimensions,
): PageResult {
  // Filter to bottom strip
  const bottomItems = items.filter((item) => item.y < dims.height * BOTTOM_STRIP_FRACTION);

  // Assign zones, discarding items that don't fall in a label zone
  const leftItems: RawTextItem[] = [];
  const rightItems: RawTextItem[] = [];
  for (const item of bottomItems) {
    if (item.x > dims.width * LEFT_ZONE_MIN && item.x < dims.width * LEFT_ZONE_MAX) {
      leftItems.push(item);
    } else if (item.x > dims.width * RIGHT_ZONE_MIN) {
      rightItems.push(item);
    }
  }

  const modelCards: ModelCard[] = [];
  const ruleSummaryCards: RuleSummaryCardResult[] = [];

  const processGroup = (group: RawTextItem[], side: "left" | "right") => {
    const sorted = [...group].sort((a, b) => a.x - b.x);
    const text = sorted
      .map((i) => i.str)
      .join(" ")
      .trim();
    if (!text) return;

    const rulesRefIdx = text.indexOf(RULE_SUMMARY_CARD_MARKER);
    if (rulesRefIdx !== -1) {
      const rawFactionName = text.slice(0, rulesRefIdx).trim();
      ruleSummaryCards.push({
        location: { page: pageNumber, side },
        factionName: rawFactionName ? toTitleCase(rawFactionName) : "",
      });
    } else {
      modelCards.push({ name: toTitleCase(text), page: pageNumber, side });
    }
  };

  groupByY(leftItems).forEach((group) => processGroup(group, "left"));
  groupByY(rightItems).forEach((group) => processGroup(group, "right"));

  return { modelCards, ruleSummaryCards };
}

/**
 * Assembles per-page results into a complete IndexedFile.
 */
export function buildIndexedFile(pageResults: PageResult[]): IndexedFile {
  let faction = "";
  const allRuleSummaryCards: CardLocation[] = [];
  const modelMap = new Map<string, CardLocation[]>();

  for (const result of pageResults) {
    for (const fc of result.ruleSummaryCards) {
      allRuleSummaryCards.push(fc.location);
      if (!faction && fc.factionName) {
        faction = fc.factionName;
      }
    }
    for (const mc of result.modelCards) {
      const loc: CardLocation = { page: mc.page, side: mc.side };
      const existing = modelMap.get(mc.name);
      if (existing) {
        existing.push(loc);
      } else {
        modelMap.set(mc.name, [loc]);
      }
    }
  }

  const models: ModelEntry[] = Array.from(modelMap.entries()).map(([name, cards]) => ({
    name,
    cards,
  }));

  return { faction, models, ruleSummaryCards: allRuleSummaryCards };
}

// ---------------------------------------------------------------------------
// I/O entry point (not unit-tested; uses pdfjs-dist)
// ---------------------------------------------------------------------------

/**
 * Builds a card index by extracting model name labels from the PDF's text
 * layer. Runs on every uploaded file; no SHA-256 matching required.
 */
export async function indexFile(pdfBytes: Uint8Array): Promise<IndexedFile> {
  const pdfjsLib = await import("pdfjs-dist");

  // Configure the worker. Vite resolves the ?url import to the correct asset
  // path for both dev and production builds.
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  // Pass a copy so pdfjs doesn't neuter the caller's ArrayBuffer via transfer.
  const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;
  const pageResults: PageResult[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    const rawItems: RawTextItem[] = content.items
      .filter(
        (item): item is (typeof content.items)[number] & { str: string } =>
          "str" in item && (item as { str: string }).str.trim() !== "",
      )
      .map((item) => {
        const ti = item as unknown as {
          str: string;
          transform: [number, number, number, number, number, number];
        };
        return { str: ti.str, x: ti.transform[4], y: ti.transform[5] };
      });

    pageResults.push(
      processPageItems(pageNumber, rawItems, {
        width: viewport.width,
        height: viewport.height,
      }),
    );
  }

  return buildIndexedFile(pageResults);
}
