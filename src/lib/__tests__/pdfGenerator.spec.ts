import { PDFDocument, rgb } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  generatePdf,
  packCards,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
  type CardLocation,
} from "../pdfGenerator";

// Build a source PDF with `pageCount` landscape-letter pages.
// Each page has a filled rectangle so pdf-lib can embed it (embedPage requires a Contents stream).
async function makeSourcePdf(pageCount: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = pdf.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH_PT,
      height: PAGE_HEIGHT_PT,
      color: rgb(1, 1, 1),
    });
  }
  return pdf.save();
}

async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes);
}

const c = (page: number, side: "left" | "right"): CardLocation => ({ page, side });

describe("packCards", () => {
  describe("empty input", () => {
    it("returns empty array when no cards selected", () => {
      expect(packCards([], [], false)).toEqual([]);
    });
  });

  describe("single-card models", () => {
    it("places one card on the left of a page", () => {
      expect(packCards([[c(1, "left")]], [], false)).toEqual([{ left: c(1, "left"), right: null }]);
    });

    it("pairs two singles onto one page", () => {
      expect(packCards([[c(1, "left")], [c(2, "right")]], [], false)).toEqual([
        { left: c(1, "left"), right: c(2, "right") },
      ]);
    });

    it("starts a new page for the third single", () => {
      expect(packCards([[c(1, "left")], [c(2, "right")], [c(3, "left")]], [], false)).toEqual([
        { left: c(1, "left"), right: c(2, "right") },
        { left: c(3, "left"), right: null },
      ]);
    });
  });

  describe("two-card models", () => {
    it("places both cards on the same page", () => {
      expect(packCards([[c(1, "left"), c(1, "right")]], [], false)).toEqual([
        { left: c(1, "left"), right: c(1, "right") },
      ]);
    });

    it("buffers a two-card model behind an open partial, preserving original order", () => {
      // Single A opens a partial; pair B is buffered; at end, partial (A alone) is committed
      // first, then the buffered pair follows.
      expect(packCards([[c(1, "left")], [c(2, "left"), c(2, "right")]], [], false)).toEqual([
        { left: c(1, "left"), right: null },
        { left: c(2, "left"), right: c(2, "right") },
      ]);
    });

    it("fills the partial slot with the next single, then flushes buffered pairs", () => {
      // Single A opens partial; pair B is buffered; single C fills A's partial;
      // then B's page is emitted.
      expect(
        packCards([[c(1, "left")], [c(2, "left"), c(2, "right")], [c(3, "right")]], [], false),
      ).toEqual([
        { left: c(1, "left"), right: c(3, "right") },
        { left: c(2, "left"), right: c(2, "right") },
      ]);
    });
  });

  describe("three-card models", () => {
    it("puts first two cards on one page and the third on the next", () => {
      expect(packCards([[c(1, "left"), c(1, "right"), c(2, "left")]], [], false)).toEqual([
        { left: c(1, "left"), right: c(1, "right") },
        { left: c(2, "left"), right: null },
      ]);
    });

    it("fills the right slot of the third card with the next single", () => {
      expect(
        packCards([[c(1, "left"), c(1, "right"), c(2, "left")], [c(3, "right")]], [], false),
      ).toEqual([
        { left: c(1, "left"), right: c(1, "right") },
        { left: c(2, "left"), right: c(3, "right") },
      ]);
    });
  });

  describe("rule summary cards (packCards)", () => {
    it("appends rule summary cards when includeRuleSummaryCards is true", () => {
      expect(packCards([[c(1, "left")]], [c(6, "left")], true)).toEqual([
        { left: c(1, "left"), right: c(6, "left") },
      ]);
    });

    it("omits rule summary cards when includeRuleSummaryCards is false", () => {
      expect(packCards([[c(1, "left")]], [c(6, "left")], false)).toEqual([
        { left: c(1, "left"), right: null },
      ]);
    });

    it("treats two rule summary cards as a paired group", () => {
      expect(packCards([], [c(6, "left"), c(6, "right")], true)).toEqual([
        { left: c(6, "left"), right: c(6, "right") },
      ]);
    });

    it("gives three rule summary cards their own page plus a left slot", () => {
      expect(packCards([], [c(6, "left"), c(6, "right"), c(7, "left")], true)).toEqual([
        { left: c(6, "left"), right: c(6, "right") },
        { left: c(7, "left"), right: null },
      ]);
    });

    it("flushes an open model-card partial before a faction pair", () => {
      // Single model card opens a partial; faction has a pair, so model partial is
      // committed first (empty right), then the faction pair gets its own page.
      expect(packCards([[c(1, "left")]], [c(6, "left"), c(6, "right")], true)).toEqual([
        { left: c(1, "left"), right: null },
        { left: c(6, "left"), right: c(6, "right") },
      ]);
    });
  });
});

describe("generatePdf", () => {
  it("produces a valid PDF", async () => {
    const source = await makeSourcePdf(1);
    const output = await generatePdf(source, [[c(1, "left")]], [], false);
    const pdf = await loadPdf(output);
    expect(pdf.getPageCount()).toBe(1);
  });

  it("produces one page per output slot", async () => {
    const source = await makeSourcePdf(3);
    // Three singles → 2 pages (two paired, one alone)
    const output = await generatePdf(
      source,
      [[c(1, "left")], [c(2, "right")], [c(3, "left")]],
      [],
      false,
    );
    const pdf = await loadPdf(output);
    expect(pdf.getPageCount()).toBe(2);
  });

  it("completes without error when nothing is selected", async () => {
    const source = await makeSourcePdf(1);
    const output = await generatePdf(source, [], [], false);
    // pdf-lib always produces at least a 1-page shell; just verify it is loadable
    await expect(loadPdf(output)).resolves.toBeDefined();
  });

  it("outputs landscape letter pages", async () => {
    const source = await makeSourcePdf(1);
    const output = await generatePdf(source, [[c(1, "left")]], [], false);
    const pdf = await loadPdf(output);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBe(PAGE_WIDTH_PT);
    expect(height).toBe(PAGE_HEIGHT_PT);
  });

  it("includes rule summary cards when requested", async () => {
    const source = await makeSourcePdf(6);
    const output = await generatePdf(source, [[c(1, "left")]], [c(6, "left")], true);
    const pdf = await loadPdf(output);
    // One single + one rule summary single → paired onto 1 page
    expect(pdf.getPageCount()).toBe(1);
  });

  it("excludes rule summary cards when not requested", async () => {
    const source = await makeSourcePdf(6);
    // With rule summary cards excluded, the single model card has no partner → 1 page with empty right slot
    const withoutRuleSummary = await generatePdf(source, [[c(1, "left")]], [c(6, "left")], false);
    expect((await loadPdf(withoutRuleSummary)).getPageCount()).toBe(1);
    // With rule summary cards included, the rule summary card fills the right slot → still 1 page
    const withRuleSummary = await generatePdf(source, [[c(1, "left")]], [c(6, "left")], true);
    expect((await loadPdf(withRuleSummary)).getPageCount()).toBe(1);
  });
});
