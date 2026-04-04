import { describe, expect, it } from "vitest";
import { buildIndexedFile, processPageItems, type PageResult } from "../cardIndexer";

// Page dimensions matching letter-landscape PDFs used in the app
const DIMS = { width: 792, height: 612 };

// Helpers to build text items in label zones
const LEFT_X = DIMS.width * 0.4; // inside [30%, 50%]
const RIGHT_X = DIMS.width * 0.85; // inside (80%, ...]
const FAR_LEFT_X = DIMS.width * 0.1; // below LEFT_ZONE_MIN — date code area

// y values: bottom strip threshold = 612 * 0.3 = 183.6
const IN_STRIP_Y = 50; // below threshold → in strip
const ABOVE_STRIP_Y = 200; // above threshold → ignored

describe("processPageItems", () => {
  it("ignores items above the bottom strip", () => {
    const result = processPageItems(1, [{ str: "WARRIOR", x: LEFT_X, y: ABOVE_STRIP_Y }], DIMS);
    expect(result.modelCards).toHaveLength(0);
    expect(result.ruleSummaryCards).toHaveLength(0);
  });

  it("ignores items in the far-left zone (date codes)", () => {
    const result = processPageItems(1, [{ str: "APR22", x: FAR_LEFT_X, y: IN_STRIP_Y }], DIMS);
    expect(result.modelCards).toHaveLength(0);
    expect(result.ruleSummaryCards).toHaveLength(0);
  });

  it("classifies a left-zone item as a left-side model card", () => {
    const result = processPageItems(1, [{ str: "WARRIOR", x: LEFT_X, y: IN_STRIP_Y }], DIMS);
    expect(result.modelCards).toEqual([{ name: "Warrior", page: 1, side: "left" }]);
    expect(result.ruleSummaryCards).toHaveLength(0);
  });

  it("classifies a right-zone item as a right-side model card", () => {
    const result = processPageItems(1, [{ str: "HUNTER", x: RIGHT_X, y: IN_STRIP_Y }], DIMS);
    expect(result.modelCards).toEqual([{ name: "Hunter", page: 1, side: "right" }]);
  });

  it("title-cases the model name", () => {
    const result = processPageItems(1, [{ str: "BATTLE SISTER", x: LEFT_X, y: IN_STRIP_Y }], DIMS);
    expect(result.modelCards[0]!.name).toBe("Battle Sister");
  });

  it("concatenates multi-word names emitted as separate items, sorted by x", () => {
    const items = [
      { str: "ASSASSIN", x: LEFT_X + 30, y: IN_STRIP_Y },
      { str: "MANSLAYER", x: LEFT_X, y: IN_STRIP_Y },
    ];
    const result = processPageItems(1, items, DIMS);
    expect(result.modelCards).toEqual([{ name: "Manslayer Assassin", page: 1, side: "left" }]);
  });

  it("groups items within Y_GROUPING_TOLERANCE into one label", () => {
    // tolerance = 3; items at y=50 and y=52 should be grouped
    const items = [
      { str: "SHADOW", x: LEFT_X, y: 50 },
      { str: "DANCER", x: LEFT_X + 20, y: 52 },
    ];
    const result = processPageItems(1, items, DIMS);
    expect(result.modelCards).toHaveLength(1);
    expect(result.modelCards[0]!.name).toBe("Shadow Dancer");
  });

  it("does not group items beyond Y_GROUPING_TOLERANCE", () => {
    // tolerance = 3; items at y=50 and y=60 should be separate labels
    const items = [
      { str: "ALPHA", x: LEFT_X, y: 50 },
      { str: "BETA", x: LEFT_X + 5, y: 60 },
    ];
    const result = processPageItems(1, items, DIMS);
    expect(result.modelCards).toHaveLength(2);
  });

  it("detects a RULES REFERENCE label as a rule summary card", () => {
    const items = [
      { str: "ECLIPSE", x: LEFT_X, y: IN_STRIP_Y },
      { str: "RULES REFERENCE", x: LEFT_X + 40, y: IN_STRIP_Y },
    ];
    const result = processPageItems(1, items, DIMS);
    expect(result.ruleSummaryCards).toHaveLength(1);
    expect(result.ruleSummaryCards[0]!.location).toEqual({ page: 1, side: "left" });
    expect(result.ruleSummaryCards[0]!.factionName).toBe("Eclipse");
    expect(result.modelCards).toHaveLength(0);
  });

  it("handles a RULES REFERENCE label with no preceding rule summary name text", () => {
    const result = processPageItems(
      1,
      [{ str: "RULES REFERENCE", x: LEFT_X, y: IN_STRIP_Y }],
      DIMS,
    );
    expect(result.ruleSummaryCards).toHaveLength(1);
    expect(result.ruleSummaryCards[0]!.factionName).toBe("");
  });

  it("returns a model card and a rule summary card from the same page", () => {
    const items = [
      { str: "WARRIOR", x: LEFT_X, y: IN_STRIP_Y },
      { str: "ECLIPSE", x: RIGHT_X, y: IN_STRIP_Y },
      { str: "RULES REFERENCE", x: RIGHT_X + 40, y: IN_STRIP_Y },
    ];
    const result = processPageItems(1, items, DIMS);
    expect(result.modelCards).toHaveLength(1);
    expect(result.ruleSummaryCards).toHaveLength(1);
  });

  it("returns empty results for a page with no qualifying items", () => {
    const result = processPageItems(1, [], DIMS);
    expect(result.modelCards).toHaveLength(0);
    expect(result.ruleSummaryCards).toHaveLength(0);
  });

  it("passes the correct page number through to output", () => {
    const result = processPageItems(7, [{ str: "WARDEN", x: LEFT_X, y: IN_STRIP_Y }], DIMS);
    expect(result.modelCards[0]!.page).toBe(7);
  });
});

describe("buildIndexedFile", () => {
  it("returns an empty IndexedFile for empty input", () => {
    expect(buildIndexedFile([])).toEqual({ faction: "", models: [], ruleSummaryCards: [] });
  });

  it("builds a single model with one card location", () => {
    const pageResults: PageResult[] = [
      { modelCards: [{ name: "Warrior", page: 1, side: "left" }], ruleSummaryCards: [] },
    ];
    const result = buildIndexedFile(pageResults);
    expect(result.models).toEqual([{ name: "Warrior", cards: [{ page: 1, side: "left" }] }]);
  });

  it("merges the same model name from two pages into one ModelEntry", () => {
    const pageResults: PageResult[] = [
      { modelCards: [{ name: "Suneater", page: 1, side: "left" }], ruleSummaryCards: [] },
      { modelCards: [{ name: "Suneater", page: 2, side: "right" }], ruleSummaryCards: [] },
    ];
    const result = buildIndexedFile(pageResults);
    expect(result.models).toHaveLength(1);
    expect(result.models[0]!.cards).toEqual([
      { page: 1, side: "left" },
      { page: 2, side: "right" },
    ]);
  });

  it("puts rule summary cards in ruleSummaryCards, not models", () => {
    const pageResults: PageResult[] = [
      {
        modelCards: [],
        ruleSummaryCards: [{ location: { page: 3, side: "right" }, factionName: "Eclipse" }],
      },
    ];
    const result = buildIndexedFile(pageResults);
    expect(result.models).toHaveLength(0);
    expect(result.ruleSummaryCards).toEqual([{ page: 3, side: "right" }]);
  });

  it("collects multiple rule summary cards across pages", () => {
    const pageResults: PageResult[] = [
      {
        modelCards: [],
        ruleSummaryCards: [{ location: { page: 1, side: "left" }, factionName: "Eclipse" }],
      },
      {
        modelCards: [],
        ruleSummaryCards: [{ location: { page: 2, side: "right" }, factionName: "Eclipse" }],
      },
    ];
    const result = buildIndexedFile(pageResults);
    expect(result.ruleSummaryCards).toHaveLength(2);
  });

  it("extracts the faction name from the first faction card", () => {
    const pageResults: PageResult[] = [
      {
        modelCards: [],
        ruleSummaryCards: [{ location: { page: 1, side: "left" }, factionName: "Eclipse" }],
      },
    ];
    expect(buildIndexedFile(pageResults).faction).toBe("Eclipse");
  });

  it("uses only the first non-empty faction name", () => {
    const pageResults: PageResult[] = [
      {
        modelCards: [],
        ruleSummaryCards: [{ location: { page: 1, side: "left" }, factionName: "" }],
      },
      {
        modelCards: [],
        ruleSummaryCards: [{ location: { page: 2, side: "right" }, factionName: "Eclipse" }],
      },
      {
        modelCards: [],
        ruleSummaryCards: [{ location: { page: 3, side: "left" }, factionName: "Other" }],
      },
    ];
    expect(buildIndexedFile(pageResults).faction).toBe("Eclipse");
  });

  it("preserves model insertion order", () => {
    const pageResults: PageResult[] = [
      {
        modelCards: [
          { name: "Alpha", page: 1, side: "left" },
          { name: "Beta", page: 1, side: "right" },
        ],
        ruleSummaryCards: [],
      },
    ];
    const result = buildIndexedFile(pageResults);
    expect(result.models.map((m) => m.name)).toEqual(["Alpha", "Beta"]);
  });
});
