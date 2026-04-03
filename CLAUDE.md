# Freeblades Card PDF Extractor

## Project Overview

This is a browser-based utility to take the PDF version of a set of cards for the Freeblades miniatures wargame,
and extract a subset of the cards into a new PDF file. The full design is in `docs/design-doc.md`.

## Tech Stack

- **Language:** Typescript
- **Framework:** Vue 3 (Composition API)
- **Test Framwork:** Vitest
- **Bundler:** Vite
- **PDF handling:** [pdf-lib](https://github.com/Hopding/pdf-lib)

## Git Commit Guidelines

When creating commits:

- Keep the first line under 50 characters.
- Do not include AI attribution in commit messages.
- Run the project's lint and test commands before finalizing the commit.

## Commands

- `npm run test:unit` - Run the test suite.
- `npm run lint` - Run the linter, and fix issues automatically.
- `npm run dev` - Run the dev server
