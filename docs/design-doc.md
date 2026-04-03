# Freeblades Card PDF Extractor - Design Document

Freeblades is a miniatures wargame, published by DGS Games. Each player has a freeband, made up of several models. Each
model has one or more stat cards. DGS provides free PDF copies of the stat cards, but since there are two cards on each
sheet, the player frequently has sheets with cards that are not in their freeband.

This app will take a faction's stat card PDF, and pull out just the cards needed for their freeband into a new PDF file.

## PDF structure

Each page is a landscape-oriented letter-sized sheet, with one or two cards on it. One card (front and back) is on the
left side of the page, and one is on the right side of the page. They are not centered on the page -- splitting the page
at 5-1/16" from the left edge separates the two cards.

## Requirements

- **Page efficiency:** Minimize the number of half-empty pages in the generated PDF.
- **Keep multiple cards together:** When there are two cards which go to the same model, and they are on the samem page
  in the source PDF, keep them on the same page in the generated PDF. The same goes for models which have three cards;
  the first two cards go on the same page in the generated PDF, and the third card goes on the left side of the
  following page.
- **App knows where to find each card:** The app knows where each model's card(s) can be found in the PDF, so the user
  can select by model, and not by page.
- **Faction cards:** The PDFs include cards that describe the faction itself (faction rules, special abilities) rather
  than individual model stat cards. The user can opt-in to include these in the output via a checkbox.
- **Provide a manual method:** For the cases where an unknown file is submitted, provide the user a UI that lets them
  choose pages or half-pages directly. _(Deferred to a future enhancement.)_
- **Easy way to notify of unsupported files:** In the inevitable case where the user has a file that isn't supported,
  there needs to be an easy way to let the dev know that an update is needed. _(Notification mechanism TBD.)_
- **Old versions of PDFs are supported:** The app should not only support the latest versions of the files, where
  reasonable. By the same token, if the user submits a known-to-be-old file, the app should let them know.

## Anti-requirements

- **No automatic download:** The app is for letting a user process the PDF they have already downloaded, not for caching
  the latest versions of the files. I don't want to cause undue traffic to their site, nor do I really want to worry
  that much about tracking the structure of their site. That said, I probably _will_ need to keep track of when the
  cards are updated, somehow.

## Card catalog

The app ships with a set of bundled catalog files in `src/data/catalogs/`, one per known faction PDF. Each catalog file
is a JSON document containing the SHA-256 hash of the PDF it describes, metadata about the faction, and a list of model
entries that map each model's name to the page number(s) and side(s) where its cards appear.

```json
{
  "sha256": "abc123...",
  "faction": "Urdaggar Tribes of Valor",
  "releaseDate": "2024-01",
  "models": [
    {
      "name": "Boar Rider",
      "cards": [
        { "page": 0, "side": "left" },
        { "page": 0, "side": "right" }
      ]
    }
  ],
  "factionCards": [{ "page": 5, "side": "left" }]
}
```

When DGS releases an updated PDF, a new catalog entry is added with the new hash. Old entries are retained so that older
versions of PDFs continue to work.

## File identification

When the user opens a PDF, the app computes its SHA-256 hash (using the Web Crypto API) and checks it against all
bundled catalogs. There are three outcomes:

- **Known, current:** The file matches the most recent catalog for its faction. Proceed normally.
- **Known, outdated:** The file matches an older catalog entry. Show a notice that a newer version of the file exists,
  but allow the user to proceed.
- **Unknown:** No catalog matches. Show a message that the file isn't supported.

## Output PDF layout

Output pages are full letter landscape (same dimensions as the source), with one card on the left and one on the right.
The split point is 5-1/16" from the left edge. The packing algorithm:

1. **Two-card models:** The two cards always occupy both slots of one output page together. If a single-card slot is
   open when a two-card model is encountered, that slot stays open — a later single-card item will fill it.
2. **Three-card models:** The first two cards share one output page; the third is treated as a single-card item.
3. **Single-card models** (and the third card of a three-card model): Fill the next open slot. If a right slot is open,
   fill it; otherwise, place the card in the left slot of a new page.
4. **Faction cards:** Appended after all model cards, using the same algorithm as model cards, based on the number of
   faction cards. (For instance, a faction with three cards packs those cards in the same manner as a model with three
   cards.)
5. **Empty right slots:** Left blank (white) when no card is available to fill them.

## Implementation notes

The ideal user flow looks like:

- The user opens a stat-card PDF in the app
- The app calculates a SHA-256 hash of the file, and uses that to determine which file and version it is
- The app presents a checklist of the models in that file, along with an "include faction card(s)" checkbox
- The user selects the desired subset
- The app creates a new PDF, pulling cards from the opened PDF, and lets the user save it.
