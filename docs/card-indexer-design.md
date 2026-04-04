# Card Indexer Module — Design Document

## Purpose

Replace the manual card index with an automatic one by extracting model name labels from the source PDF. This is a
drop-in module that produces the same data structure the rest of the app already consumes.

---

## Dependencies

- **`pdfjs-dist`** — PDF text extraction with position data

No other new dependencies required.

---

## Output

An array of objects mapping model name to page locations — same shape as the existing `model` field in the data catalog:

```js
[
  {
    name: "Bladedaughter",
    cards: [{ page: 1, side: "left" }],
  },
  {
    name: "Nemesis",
    cards: [{ page: 1, side: "right" }],
  },
  {
    name: "Suneater",
    cards: [
      { page: 2, side: "left " },
      { page: 2, side: "right" },
    ],
  },
  // ...
];
```

Note that the names in the PDF are in all caps, and the values in this index are in title case.

---

## API

```js
// indexer.js
export async function buildCardIndex(pdfPath: string): Promise<CardIndex>
```

---

## Algorithm

1. Open the PDF with `pdfjs-dist`.
2. For each page, call `page.getTextContent()` to get all text items. Each item exposes:
   - `item.str` — the text string
   - `item.transform[4]` — x position (origin: bottom-left)
   - `item.transform[5]` — y position (origin: bottom-left)
3. Filter for items in the **bottom strip**: `y < pageHeight * 0.12`.
4. Within that strip, classify by x into label zones:
   - **Left card:** `pageWidth * 0.30 < x < pageWidth * 0.50`
   - **Right card:** `x > pageWidth * 0.80`
   - Discard anything else (e.g. the date codes in the lower-left of each card).
5. Group surviving items by approximate y (within ±3 units) and by zone. Sort each group by x, then concatenate — this
   handles multi-word names that pdfjs emits as separate items (e.g. `"MANSLAYER"` + `"ASSASSIN"` →
   `"MANSLAYER ASSASSIN"`).
6. Store each resolved name in the index with its page number and side.

---

## Threshold Tuning

The zone percentages above are good starting values but may need adjustment for different print versions of the cards.
To make tuning easy, expose them as named constants at the top of the module:

```js
const BOTTOM_STRIP_FRACTION = 0.12;
const LEFT_ZONE_MIN = 0.3;
const LEFT_ZONE_MAX = 0.5;
const RIGHT_ZONE_MIN = 0.8;
const Y_GROUPING_TOLERANCE = 3; // PDF units
```
