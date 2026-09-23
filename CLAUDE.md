# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AP Statistics course website for Thomas Abraham's high school class. Static HTML/CSS/JS site with a Firebase backend (Auth + Firestore). No build system — files are served directly via Firebase Hosting.

## Deployment

```bash
# Deploy frontend
firebase deploy --only hosting

# Deploy Cloud Functions
cd functions && npm run deploy
# or: firebase deploy --only functions

# Run Firebase emulators locally
firebase emulators:start

# Lint Cloud Functions
cd functions && npm run lint
```

There is no local dev server built in. Open HTML files directly in a browser or use `firebase serve` / `firebase emulators:start` for a hosted local environment.

## Architecture

### Frontend (static)
- **`js/script.js`** — loaded as an ES module on every page. Handles Firebase Auth (login/logout/session), the animated D3 logo, and exports `buildLogo()`. Also extends `jStat` with additional distributions (bernoulli, geometric, binomialDiscrete, negbin, poisson) and adds D3 selection helpers (`moveToFront`, `moveToBack`).
- **`js/home.js`** — loaded alongside `script.js`. Adds scroll-shrink nav behavior and jStat custom CDFs.
- **`js/firebase-config.js`** — Firebase project config (not a secret; Firebase keys are public identifiers). Import via ES module.
- **`js/admin.js`** — Teacher dashboard logic; checks for the `admin` custom claim on the Firebase ID token.

All pages import `script.js` and `home.js` as `type="module"`. Non-module scripts (jQuery, jStat, D3) are loaded as regular `<script>` tags before the modules.

### Sections
- **`home/unit{1-9}/`** — Lesson slides generated with Quarto/RevealJS (`.html` + `_files/` asset dirs). Do not hand-edit the generated `_files/` subdirectories.
- **`apps/`** — Self-contained interactive simulations, one per subdirectory. Each app's logic lives inline in its `index.html` using D3 + jStat. The Galton Board and Normal Distribution apps are representative examples.
- **`mcq/unit{1-9}/`** — Multiple-choice question sets. Questions are stored in and graded via Firestore (`student_answers` collection). MathJax is used for LaTeX rendering.
- **`frq/`** — Free-response question pages.
- **`admin/`** — Teacher-only dashboard; access is gated by an `admin` Firebase custom claim. Reads from the `unit_completion` and `student_answers` Firestore collections.
- **`collegeboard/`** and **`prep/`** — Static PDF resources only.
- **`functions/`** — Firebase Cloud Functions (Node 20). Currently minimal; the main `index.js` is a placeholder.

### Auth flow
- Every protected page checks `onAuthStateChanged` at load and redirects to `index.html` (the login page) if unauthenticated, saving the original URL in `localStorage` (`redirectAfterLogin`).
- Allowed email domains: `thsrocks.us`, `bishopmcdevitt.org`, `hbgdiocese.org`, `gmail.com`.
- Admin-only pages additionally verify `token.claims.admin === true` from the Firebase ID token.

### Firestore collections
- `student_answers` — MCQ submissions with `userId`, `questionId`, `correct`, `difficulty`.
- `unit_completion` — Per-user unit progress records.

### Shared libraries (all vendored in `js/`)
- **D3 v7** (`d3.v7.min.js`, `d3.v7.hexbin.min.js`)
- **jStat** (`jStat.js`, `jstat.min.js`)
- **jQuery / jQuery UI**
- **MathJax v3** (loaded from CDN in MCQ pages only)
- **LaTeXMathML** (`LaTeXMathML.js`) — used in some older pages
