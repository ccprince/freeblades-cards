import { PDFDocument, type PDFEmbeddedPage, type PDFPage } from "pdf-lib";

// Letter landscape: 11" × 8.5" at 72 pt/in
export const PAGE_WIDTH_PT = 792;
export const PAGE_HEIGHT_PT = 612;

// Card boundaries within the source PDF (points from left edge)
export const LEFT_CARD_LEFT_PT = 26.8;
export const LEFT_CARD_RIGHT_PT = 386.8;
export const RIGHT_CARD_LEFT_PT = 396;
export const RIGHT_CARD_RIGHT_PT = 756;

export const LEFT_CARD_WIDTH_PT = LEFT_CARD_RIGHT_PT - LEFT_CARD_LEFT_PT; // 360
export const RIGHT_CARD_WIDTH_PT = RIGHT_CARD_RIGHT_PT - RIGHT_CARD_LEFT_PT; // 360

export interface CardLocation {
  page: number; // 1-indexed page in source PDF
  side: "left" | "right";
}

export interface OutputSlot {
  left: CardLocation | null;
  right: CardLocation | null;
}

/**
 * Pack card groups into output page slots.
 *
 * Rules:
 * - 2-card groups always share one output page.
 * - 3+ card groups: first two share a page, remaining cards are treated as singles.
 * - Singles fill the next open slot: right side of a partial page, or left of a new page.
 * - Faction cards are treated as a single group, appended after model cards.
 */
export function packCards(
  modelCardGroups: CardLocation[][],
  factionCards: CardLocation[],
  includeFactionCards: boolean,
): OutputSlot[] {
  const pages: OutputSlot[] = [];
  let partial: OutputSlot | null = null;

  function commitPartial() {
    if (partial !== null) {
      pages.push(partial);
      partial = null;
    }
  }

  function addSingle(card: CardLocation) {
    if (partial !== null) {
      partial.right = card;
      commitPartial();
    } else {
      partial = { left: card, right: null };
    }
  }

  function addGroup(cards: CardLocation[]) {
    const [first, second, ...rest] = cards;
    if (first === undefined) return;

    if (second === undefined) {
      addSingle(first);
    } else {
      // First two always get their own page; don't flush partial — a later single can fill it
      pages.push({ left: first, right: second });
      for (const card of rest) {
        addSingle(card);
      }
    }
  }

  for (const group of modelCardGroups) {
    addGroup(group);
  }

  if (includeFactionCards) {
    addGroup(factionCards);
  }

  commitPartial();
  return pages;
}

export async function generatePdf(
  sourcePdfBytes: Uint8Array,
  modelCardGroups: CardLocation[][],
  factionCards: CardLocation[],
  includeFactionCards: boolean,
): Promise<Uint8Array> {
  const sourcePdf = await PDFDocument.load(sourcePdfBytes);
  const outputPdf = await PDFDocument.create();
  const embedCache = new Map<string, PDFEmbeddedPage>();

  const layout = packCards(modelCardGroups, factionCards, includeFactionCards);

  for (const slot of layout) {
    const page = outputPdf.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    if (slot.left !== null) {
      await placeCard(outputPdf, page, sourcePdf, slot.left, "left", embedCache);
    }
    if (slot.right !== null) {
      await placeCard(outputPdf, page, sourcePdf, slot.right, "right", embedCache);
    }
  }

  return outputPdf.save();
}

async function placeCard(
  outputPdf: PDFDocument,
  outputPage: PDFPage,
  sourcePdf: PDFDocument,
  card: CardLocation,
  slot: "left" | "right",
  embedCache: Map<string, PDFEmbeddedPage>,
): Promise<void> {
  const sourcePage = sourcePdf.getPage(card.page - 1);

  const srcLeft = card.side === "left" ? LEFT_CARD_LEFT_PT : RIGHT_CARD_LEFT_PT;
  const srcRight = card.side === "left" ? LEFT_CARD_RIGHT_PT : RIGHT_CARD_RIGHT_PT;
  const cardWidth = srcRight - srcLeft;

  const cacheKey = `${card.page}:${card.side}`;
  let embedded = embedCache.get(cacheKey);
  if (embedded === undefined) {
    embedded = await outputPdf.embedPage(sourcePage, {
      left: srcLeft,
      bottom: 0,
      right: srcRight,
      top: PAGE_HEIGHT_PT,
    });
    embedCache.set(cacheKey, embedded);
  }

  const destX = slot === "left" ? LEFT_CARD_LEFT_PT : RIGHT_CARD_LEFT_PT;
  outputPage.drawPage(embedded, { x: destX, y: 0, width: cardWidth, height: PAGE_HEIGHT_PT });
}
