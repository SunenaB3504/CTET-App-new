# CTET Prep App — Single Source of Truth

Version: 1.24
LastUpdated: 2025-10-28

Purpose
-------
This document is the canonical reference for the CTET Prep application. All new development, design, QA, and deployment work must consult and conform to this document. It describes purpose, design, structure, features, integrations, data formats, and the development workflow including the mandatory step to update this document after any functional change.

Primary objective
-----------------
- Build a teacher-focused CTET preparation app that provides study materials, a question bank (from past papers), and realistic mock tests.
- Monetize by selling access per paper (Paper 1 and Paper 2) with optional bundle pricing.
- Ensure high quality, offline-capable content stored as local JSON files (no external DB) and no external AI APIs.

Scope
-----
This document covers:
- Product goals and success metrics
- UX / visual design guidelines (mustard & gray theme)
- Feature list (with implementation status)
- Data formats and example JSON schema
- High-level architecture and file structure
- Integration points (payments, hosting, offline storage)
- Development workflow and enforcement mechanism
- Acceptance criteria, testing checklist, and release notes

Design & Visual Guidelines
--------------------------
Theme: Modern Professional Mustard & Gray

Core palette
- Primary Accent (Mustard): #eab308
- Primary Accent Hover: #ca8a04
- Background (Light Gray): #f3f4f6
- Card & Surface (White): #ffffff
- Navigation & Footer (Dark Gray): #374151
- Primary Text (Dark Gray): #1f2937
- Secondary Text (Medium Gray): #4b5563
- Tertiary/Hint Text (Light Gray): #6b7281
- Text on Accent (Dark Gray): #11182c
- Text on Dark BG (Off-White): #e5e7eb

Typography
- Headings (h1,h2,h3): Bold sans-serif, clear hierarchy. Color: #1f2937
- Body: Regular weight sans-serif. Color: #4b5563
- Buttons: Semi-bold or bold weight

Component rules (summary)
- Primary Button: background #eab308, text #11182c, padding 12x24, border-radius 8px, hover #ca8a04 with subtle scale transform.
- Cards: white background, border-radius 12px, soft shadow, padding 24px, lift on hover.
- Navigation: dark gray background, text/icons #e5e7eb.
- Inputs: white background, 2px border #d1d5db, radius 8px, focus border #eab308.
- Modal overlay: rgba(0,0,0,0.5) with content styled as card.

Structure & File Locations (project conventions)
---------------------------------------------
Top-level folders (current workspace)
- `Docs/` — canonical documents (this file and other documentation)
- `wireframes/` — HTML/CSS clickable prototypes (review and export)
- `jsonData/` — source question files (paper JSON uploads) — provided by content owner
- `scripts/` — utility scripts such as schema validators and reference checks

- `src/` — application source (frontend and backend)
- `app/` — Vite + React + TypeScript scaffold (experimental): a minimal scaffold was added to begin migrating the wireframe prototype into a single-page app. See `app/README.md` (if present) or `app/src/` for the starting point.
- `data/` — runtime JSON data folder when deployed
- `.githooks/` — example git hooks for repo (enforcement)

High-level Architecture (MVP)
----------------------------
- Frontend: React (Vite) or simple PWA consuming local JSON/IndexedDB for offline-capable experience.
- Backend: Minimal Node.js/Express server to handle secure payment sessions, optional file-based persisting (not a DB). Alternatively, a fully client-side PWA for single-user mode.
- Storage: JSON files under `data/papers/` and client-side IndexedDB/localForage.
- Payments: Stripe or Razorpay server endpoints to create/verify payments, but no DB required — purchases stored in per-user JSON files or local storage.

Data formats & JSON sample
--------------------------
All question files uploaded by admin must follow this JSON structure. Use JSON schema validation (AJV) on upload.

Example structure
```json
{
  "paper": "Paper 2",
  "term": "December",
  "year": 2024,
  "subject": "Mathematics & Science",
  "language": "English",
  "questions": [
    {
      "id": "Q001",
      "question": "Question text here...",
      "options": ["A","B","C","D"],
      "correct_answer": "B",
      "explanation": "Detailed explanation...",
      "topic": "Algebra",
      "difficulty": "Medium",
      "attachments": []
    }
  ]
}
```

JSON fields (required)
- `paper` (Paper 1 | Paper 2)
- `term` (string)
- `year` (number)
- `subject` (string)
- `language` (string)
- `questions[]` where each question has: `id`, `question`, `options[]`, `correct_answer`, `explanation`, `topic`, `difficulty`

Canonical data model & storage plan
----------------------------------
We maintain a focused canonical data model and storage plan in `Docs/data-model.md`. That document describes the canonical `data/` layout, manifest shapes, checksum/versioning policy, ingest/validation flow, and chunking rules for question and study artifacts. Use it as the authoritative reference when adding new ingestion scripts, updating manifests, or changing the on-disk layout.

Feature list and status
-----------------------
This table is the living inventory of features and their current status. Update this table in this document whenever you change feature implementation or status.

| ID | Feature | Description | Current Status | Notes |
|---:|---|---|---|---|
| F-001 | Paper separation | Separate content and flows for Paper 1 and Paper 2 | In Progress (migrated to app; core behaviors implemented) | Paper selector implemented in prototype and migrated into `app/` Dashboard with persistence via `localStorage`. Converter script `scripts/convert-add-paper-metadata.js` implemented and run on `Docs/jsonData/Paper2-Dec24/`. Converted outputs stored in `data/converted/` and manifest in `data/index/`. JSON schema updated (`scripts/question-schema.json`) with examples and `paper` requirement. Validator `scripts/validate-json.js` enhanced to support `--paper` filtering and `--json` machine output. App additions: accessible Modal (`app/src/components/Modal.tsx`), hamburger runtime hook (`app/src/lib/ui.ts`), and manifest-backed `getQuestionById` in `app/src/lib/ctetDataLoader.ts`. |
| F-002 | Admin login & upload | Admin must upload JSON files; CRUD questions | Prototype (UI) | Admin upload page exists as prototype; server-side import/validation not yet implemented. |
| F-003 | User signup/login | Attractive onboarding, sample content access | Prototype (UI) | Login page present; no real auth backend. |
| F-004 | Monetization (per-paper) | Payments and access gating per paper | Not Started | Payment gateway integration required (Stripe/Razorpay). |
| F-005 | Question bank | Store questions with explanations and search/filter | Prototype (UI) | Static sample pages; dynamic search/filter not implemented. |
| F-006 | Study materials | Syllabus-based study content with chapters | In Progress (plan created) | Plan drafted; schema + validator prioritized. See `Docs/StudyData/Dec24` for inputs. |
| F-007 | Mock test engine | Configurable mock tests with analytics | Prototype (UI) | Runner and result pages exist as demos; no real test data or persistence. |
| F-008 | Detailed analytics | Topic-level feedback and history | Not Started | Basic result demo exists; analytics engine not implemented. |
| F-009 | Offline & export | Offline access (PWA), export user data as JSON/CSV | In Progress | Implementing IndexedDB caching and export tools; split-and-index pipeline will improve offline packaging. |
| F-015 | Split & Index pipeline | Chunk large JSON files into manageable chunks and create index/manifest for fast lookup | In Progress | Implementing `scripts/split-and-index.js` to convert extracted files into chunked layout, with checksums and atomic writes. |
| F-010 | No-AI guarantee | No external AI APIs used | Complete (policy) | Ensure no AI API keys are checked into repo. |
| F-011 | Accessibility | Keyboard nav, screen-reader support, themes | In Progress | Basic focus styles added to wireframes; needs full audit. |
| F-012 | Gamification | Badges, streaks, leaderboards | Backlog | Nice-to-have for later. |
| F-013 | Multi-language | English & Hindi support with toggles | In Progress | UI has language toggles in planned pages; content translations needed. |
| F-014 | Data export/import | Allow users to download and restore their data | Not Started | Export wireframe included; implementation pending. |

F-001 — Pre-Implementation Plan (Paper separation)
-----------------------------------------------
Implementation summary
- Goal: Ensure content and UI correctly separate Paper 1 and Paper 2 flows by normalizing input JSON, adding `paper` metadata, validating inputs, and wiring UI filters to the selected paper.
- Scope for this pre-implementation step: add a documented plan, acceptance criteria, and required file lists in this reference doc before any code changes for F-001 begin. This is a mandatory checklist item that must be completed prior to coding.

Acceptance criteria (pre-implementation)
- The `Docs/CTET-App-Reference.md` file contains a short implementation plan for F-001 describing the converter, schema changes, validator updates, frontend UI changes, and tests.
- The Feature table row for F-001 is updated to `In Progress (pre-impl)`.
- A placeholder Changelog entry referencing this pre-implementation step exists.

Files to change (planned)
- `scripts/convert-add-paper-metadata.js` (new): converter to normalize existing top-level-array JSON files into the wrapped schema.
- `scripts/question-schema.json` (update): require `paper` at top-level.
- `scripts/validate-json.js` (update): ensure validator enforces `paper` and supports a `--paper` flag.
- `data/converted/` (output): target for non-destructive converted files.
- `wireframes/*` and `src/*` (frontend): Paper selector persistence and data filtering wiring.
- `tests/f001/*` (new): unit tests for converter + validator + data loader.

Risk & rollback notes
- Risk: automated conversion may infer incorrect `paper` metadata from inconsistent filenames. Mitigation: require a small manifest or prompt (manual mapping) if metadata cannot be safely inferred; converted files are written to `data/converted/` and original `Docs/jsonData/` files are preserved (non-destructive).
- Rollback: because conversion is non-destructive and produces outputs under `data/converted/`, rollback is a matter of deleting the converted artifacts. The original inputs remain untouched.

Next steps (implementation order)
1. Implement this pre-implementation plan in this document (done).
2. Implement the converter script (non-destructive) and validate converted outputs with AJV.
3. Update the schema and validator to require and enforce `paper` metadata.
4. Wire frontend to load data by `paper` and persist selection.
5. Add tests and update this document with changelog entries and `Version`/`LastUpdated` if required.

F-001 Deliverables (status)
---------------------------
- Deliverable 1 — Pre-implementation plan: COMPLETED
  - Files updated: `Docs/CTET-App-Reference.md` (this document)
  - Notes: Feature table row F-001 set to `In Progress (pre-impl)`. Pre-implementation plan, acceptance criteria, files-to-change list, and risk/rollback notes added.
  - Acceptance: `scripts/check_reference.ps1` verifies `Version` and `LastUpdated` are present.

- Deliverable 2 — Normalize data files (converter): COMPLETED
  - Script added: `scripts/convert-add-paper-metadata.js`
  - Behavior: normalizes top-level-array extracted JSON files into the canonical wrapped schema (adds `paper`, `term`, `year`, `subject`, `language`, and normalizes question fields), writes outputs to `data/converted/<paperNormalized>/`, computes SHA256 checksums, and writes a manifest to `data/index/manifest-<timestamp>.json`.
  - Run: Converter executed on `Docs/jsonData/Paper2-Dec24/` during implementation; converted files are in `data/converted/Paper_2/` and validator passes for each converted file.
  - Acceptance: converted outputs validate with AJV via `scripts/validate-json.js`; duplicate-id checks passed for the converted artifacts.

- Deliverable 3 — Update JSON schema: COMPLETED
  - Files updated: `scripts/question-schema.json`
  - Behavior: schema now requires top-level `paper`, `term`, `year`, `subject`, and `language`; question-level required fields (`id`, `question`, `options`, `correct_answer`) are enforced. Examples and descriptions were added to the schema to aid content authors and the validator.
  - Acceptance: `node ./scripts/validate-json.js <converted-file>` passes schema validation for converted files and reports clear, actionable errors for missing or malformed fields.

- Deliverable 4 — Validator CLI enhancements: COMPLETED
  - Files updated: `scripts/validate-json.js`
  - Behavior: validator now auto-discovers JSON files under `data/converted` and `Docs/jsonData`, normalizes array payloads for validation, supports `--paper "Paper 1|Paper 2"` filtering, and emits machine-readable JSON when `--json` is provided (for CI consumption). Duplicate-ID checks and per-file checksum reporting were added to the manifest generation flow.
  - Acceptance: `node ./scripts/validate-json.js --paper "Paper 2" --json` returns JSON summarizing results and exits non-zero when any file fails validation (suitable for CI gating).

- Deliverable 5 — Paper Selector UI: COMPLETED
  - Files updated: `wireframes/script.js`, `wireframes/dashboard.html`
  - Behavior: modal-based Paper Selector persists user choice via `localStorage`, dispatches `paperChanged` CustomEvent, and demo content is filtered client-side using `data-show-for-paper` attributes. The modal has basic ARIA attributes, a focus trap, and closes on Escape for improved accessibility.
  - Acceptance: Selecting Paper 1 or Paper 2 updates the UI (`data-current-paper`), persists across reloads, and other components can respond to `paperChanged` events to filter content.

- Deliverable 6 — Frontend data loader & filtering: COMPLETED
  - Files added: `wireframes/dataLoader.js`
  - Files updated: `wireframes/dashboard.html`, `wireframes/script.js`
  - Behavior: the wireframe now loads a pointer manifest (`data/index/manifest-latest.json`), lists per-paper converted files and question counts, and allows previewing sample questions from converted files. The loader exposes `CTETDataLoader` with `loadManifest()`, `listQuestions(paper)`, `loadFile(filePath)`, and `getQuestionById(id)` for use by other UI components.
  - Acceptance: dashboard shows total question counts for the selected paper, renders subject-level cards, and clicking "Preview" loads and displays example questions from the converted files.

- Deliverable 6b — E2E smoke test (Playwright): COMPLETED
  - Files added: `tests/f001/paper-selector.spec.js`, `tests/f001/dev-server.js`, `playwright.config.js`
  - Behavior: a Playwright end-to-end test validates the Paper Selector modal flow, persistence across reloads, and the Preview dialog loading sample questions. The test runs a lightweight static server for the repo and asserts the prototype flows work as expected.
  - How to run (dev machine):
```powershell
npm ci
npx playwright install --with-deps
npm run test:e2e
```
  - Acceptance: `npm run test:e2e` runs the Playwright suite and the added smoke test passes locally (observed run: 1 passed).

UI polish updates (site-wide)
-----------------------------
- Navigation and header: per recent UX feedback the previously-added centered dashboard icon was removed and the Dashboard link was moved into the site hamburger menu. An explicit `<button class="hamburger">` was added to page headers that previously lacked it so the menu is reliably visible in small/mobile viewports (e.g., iPhone SE emulation). The runtime injector in `wireframes/script.js` was updated to avoid duplicate inserts and to ensure the nav contains a Dashboard link on pages without a server-rendered nav.
- Accessibility improvements: the hamburger was enhanced with accessible behavior — `aria-expanded` toggling, an internal focus-trap (Tab / Shift+Tab), Escape to close, and restoration of keyboard focus to the toggle when the menu closes. These behaviors are implemented in `wireframes/script.js` (see `initHamburgers()`), and basic ARIA labels were added to the injected controls.
- Teacher emoji favicon & generator script: The source SVG favicon (`wireframes/favicon.svg`) was added and linked from page heads. A local generator script `scripts/generate-favicons.js` is included to produce PNG (16/32/48) and ICO artifacts for legacy support. The generator requires native image libs and must be run locally (see instructions below).

Teacher emoji favicon & generator script: The source SVG favicon (`wireframes/favicon.svg`) was added and linked from page heads. A local generator script `scripts/generate-favicons.js` is included to produce PNG (16/32/48) and ICO artifacts for legacy support. Because ICO generation can fail in some environments (native binary / package mismatches), a convenience helper `scripts/copy-favicons-to-app.js` was added to copy generated outputs into `app/public/` after local generation. The repository provides an npm helper `generate-and-copy:favicons` (run from repo root) which runs generation and then copies outputs into `app/public/` so the app can serve them. Note: PNG generation typically succeeds; ICO generation may require an alternative generator or manual conversion if `png-to-ico` fails in your environment.

Verification: the hamburger is visible and operable in mobile emulation (including narrow viewports). The nav contains a Dashboard link, and keyboard/escape behavior was manually tested. The app now contains `app/public/favicon.svg` and the generated PNG files were copied into `app/public/` during local generation; if ICO is not produced by the generator on your machine, add `favicon.ico` to `app/public/` manually or use an alternative ICO generator. See the "Local test steps" section for commands.

Mobile-first / PWA basics
------------------------
- Service worker: A minimal service worker was added at `wireframes/sw.js` to cache the app shell and provide basic runtime caching for offline navigation and quick reloads.
- Web App Manifest: `wireframes/manifest.webmanifest` was added to enable installability (start_url -> `dashboard.html`) and reference the favicon.
- Mobile UI improvements: Increased tap targets and touch-friendly button sizes, injected a runtime hamburger toggle for small screens (so headers don't need manual edits) and added `body.nav-open` overlay styles for mobile navigation.
- Files updated/added: `wireframes/sw.js`, `wireframes/manifest.webmanifest`, `wireframes/styles.css` (mobile rules + hamburger), `wireframes/script.js` (SW registration + injected hamburger).

App migration additions: The React scaffold now contains a minimal service worker and manifest under `app/public/` (`app/public/sw.js`, `app/public/manifest.webmanifest`) and the SVG favicon was copied into `app/public/favicon.svg`. The app registers the SW at runtime in `app/src/main.tsx` during load. These assets provide a basic PWA shell for local testing. Review `app/public/sw.js` before using in production; caching rules are intentionally conservative for the dev scaffold.

Verification: Serve the wireframes locally and open DevTools → Application to confirm Service Worker registration and the manifest. In a mobile viewport the hamburger toggles the nav overlay and buttons have larger tap targets. See local testing steps below.

Local test steps (PowerShell)
```powershell
# from repo root
npx http-server . -p 8080
# Open http://localhost:8080/wireframes/index.html in a modern browser and check DevTools → Application
```


Non-functional requirements
-------------------------
- Performance: fast cold load under reasonable network (use lazy loading, compressed JSON). Target 3-5s for content loads on medium connections.
- Privacy: user data exported/stored locally by default. If server-side storage is used, encrypt sensitive fields at rest.
- Security: payments and admin actions must be performed over HTTPS. No secrets in repo. Store keys in environment variables.
- Maintainability: keep JSON schema stable; incremental migration patterns recommended.

Integration points
------------------
- Payment provider: Stripe or Razorpay (server-side endpoints to create/verify sessions; no DB required)
- Hosting: Frontend on Vercel/Netlify; backend on a small VPS or serverless functions with persistent file storage (or object storage like S3) if needed.
- Analytics: Optional third-party (e.g., Google Analytics) for usage metrics; respect privacy and opt-out.

Storage decision: Hybrid (split-and-index now; MongoDB pilot later)
------------------------------------------------------------------
Decision summary
- We will implement a hybrid approach: first, a robust file-based split-and-index pipeline to normalize, chunk and index existing JSON files. This addresses immediate risks (corruption, maintainability) while preserving file-based portability.
- In parallel, prepare a MongoDB pilot (migration scripts and small backend) so we can migrate to a DB-backed canonical store later if desired. The pilot will not be activated until after split-and-index proves stable.

Immediate objectives for split-and-index
- Add `scripts/split-and-index.js` to validate, split, checksum and write chunk files into `data/converted/...`.
- Produce manifests in `data/index/` mapping questionId -> chunkFilePath, including checksums and import metadata.
- Ensure atomic writes (write temp then rename) and keep original files untouched.

Why hybrid
- Short-term: chunking reduces file corruption risk, improves Git diffs, and speeds client-side loads.
- Long-term: migrating to MongoDB provides richer querying and easier scaling; the split-and-index pipeline will facilitate migration by producing clean, normalized artifacts.


Development workflow and enforcement
----------------------------------
1. Read this document before starting any new development task.
2. Update the Feature table entry for any feature you will change or add. Include a short implementation plan and acceptance criteria.
3. After implementation, update this document: change `Version` if the change affects public behavior and set `LastUpdated` to today. Add a `Changelog` entry (see section below).

Automated helper (mechanism)
- A simple check script is included at `scripts/check_reference.ps1`. It verifies that this file exists and contains the `Version:` and `LastUpdated:` fields. It is lightweight and intended to be used manually or integrated into CI. It cannot fully enforce behavior but provides an explicit checkpoint.
- A sample git pre-commit hook example is provided at `.githooks/pre-commit.sample` which runs the check script. Projects may opt-in to copy it to `.git/hooks/pre-commit`.

scripts/check_reference.ps1 (usage)
```powershell
# Run from repo root:
.\scripts\check_reference.ps1
```
The script exits with code 0 if the reference doc contains `Version:` and `LastUpdated:`; non-zero otherwise.

Changelog and release notes
---------------------------
Maintain a `Changelog` section at the bottom of this document. Every implementation that changes behavior must add one entry with date, author, summary, and related feature IDs.

Acceptance criteria & QA checklist
---------------------------------
- JSON upload validation (AJV) must reject malformed files with detailed error messages.
- Mock tests must auto-save every 30 seconds and resume correctly.
- Payments must be verified via webhook before granting access.
- Exports must be downloadable and re-importable without schema errors.
- Accessibility: run automated axe-core checks and fix critical issues.

How to update this document (required steps)
-------------------------------------------
1. Edit this file under `Docs/CTET-App-Reference.md`.
2. Update `Version:` if the change affects API/data format or user-visible behavior. If it's a small tweak, increment patch version.
3. Set `LastUpdated:` to today (YYYY-MM-DD).
4. Add a Changelog entry with the change summary and referencing feature IDs.
5. Commit the changes with a message referencing the feature ID(s).

Validator usage & CLI quick commands
-----------------------------------
To validate a JSON file locally (from repo root):

```powershell
npm install
node .\scripts\validate-json.js .\Docs\jsonData\Paper2-Dec24\ENG-Dec24-Extracted-Verified.json
```

Or via the npm script:

```powershell
npm run validate-json -- .\Docs\jsonData\Paper2-Dec24\ENG-Dec24-Extracted-Verified.json
```

CI workflow (GitHub Actions)
---------------------------
A sample GitHub Actions workflow can be used to validate JSON in PRs. The workflow file lives at `.github/workflows/validate-json.yml` and runs `npm ci` then executes the validator against any `Docs/jsonData/**/*.json` files. The workflow fails the run if any file does not pass validation.

Enabling the pre-commit hook locally
-----------------------------------
To enable the sample pre-commit hook (optional, local-only):

```powershell
copy .\.githooks\pre-commit.sample .git\hooks\pre-commit
# On Windows you may need to ensure the hook is executable or run via Git Bash.
```

Validation run results (automated run)
-------------------------------------
I executed the validator against the files in `Docs/jsonData/Paper2-Dec24/`. Summary of results (raw output):

--- Validating: Docs/jsonData/Paper2-Dec24/CDP-Dec24-Extracted-Verified.json
Schema validation failed: must be object
No questions array to check duplicates

--- Validating: Docs/jsonData/Paper2-Dec24/ENG-Dec24-Extracted-Verified.json
Schema validation failed: must be object
No questions array to check duplicates

--- Validating: Docs/jsonData/Paper2-Dec24/Hindi-Dec24-Extracted-Verified.json
Schema validation failed: must be object
No questions array to check duplicates

--- Validating: Docs/jsonData/Paper2-Dec24/Maths-Dec24-Extracted-Verified.json
Schema validation failed: must be object
No questions array to check duplicates

--- Validating: Docs/jsonData/Paper2-Dec24/SST-Dec24-Extracted-Verified.json
Schema validation failed: must be object
No questions array to check duplicates

Interpretation & recommended action
-----------------------------------
The provided JSON files are in an "extracted" format: each file is a top-level JSON array of question objects (no wrapper object with `paper`, `term`, `year`, `subject`, `language`, `questions`). Our current schema expects a top-level object with those metadata fields and a `questions` array. There are two sensible next steps:

1. Convert existing files to the wrapped schema format (recommended):
  - Add a conversion script that reads each array file and wraps it with metadata (paper, term, year, subject, language). The metadata can be provided via a small manifest or derived from the filename.
  - After conversion the validator will accept them and perform duplicate ID checks.

2. Relax the schema to accept either a top-level array OR an object wrapper:
  - Update `scripts/question-schema.json` to allow either format and extend `scripts/validate-json.js` to normalize the input before duplicate checks.

If you want I can implement either approach; tell me whether you prefer an automatic converter that infers metadata from filenames or a schema change that accepts both formats.

Changelog
---------
- 2025-10-26 — v1.0 — Initial consolidated reference document created. (Author: Automated assistant)
- 2025-10-26 — v1.1 — Added AJV JSON schema and validator script under `scripts/` and `package.json` with devDependencies. (Author: Automated assistant)
 - 2025-10-26 — v1.3 — Chosen hybrid storage approach: implement split-and-index pipeline now and prepare MongoDB pilot later; updated feature table and added pipeline details. (Author: Automated assistant)
 - 2025-10-26 — v1.3-pre — Added pre-implementation plan for F-001 (Paper separation). This is an internal planning entry; implementation tasks will follow. (Author: Automated assistant)
 - 2025-10-26 — v1.4 — Implemented `scripts/convert-add-paper-metadata.js` and converted sample files from `Docs/jsonData/Paper2-Dec24/` into `data/converted/`. Manifest written to `data/index/`. (Author: Automated assistant) [Feature: F-001]
 - 2025-10-26 — v1.5 — Updated JSON schema (`scripts/question-schema.json`) to include examples and stronger documentation for the `paper` field. Validator continues to accept converted sample files. (Author: Automated assistant) [Feature: F-001]
 - 2025-10-26 — v1.6 — Implemented Deliverable #5: Paper Selector UI improvements in `wireframes/` (accessibility enhancements, persistent selection via localStorage, and demo content filtering by paper). (Author: Automated assistant) [Feature: F-001]
 - 2025-10-26 — v1.7 — Deliverable 3 & 4 completed: JSON schema (`scripts/question-schema.json`) updated to require `paper` and other metadata; validator CLI (`scripts/validate-json.js`) enhanced with discovery, `--paper` filter and `--json` output for CI. Converted artifacts validate successfully. (Author: Automated assistant) [Feature: F-001]
 - 2025-10-26 — v1.8 — Finalized Deliverable 5: Paper Selector UI improvements applied to wireframes (accessibility, persistence, and demo content filtering). (Author: Automated assistant) [Feature: F-001]
 - 2025-10-26 — v1.9 — Deliverable 6 implemented: front-end data loader (`wireframes/dataLoader.js`) wired to `dashboard.html` and `script.js` to show per-paper question counts and previews. (Author: Automated assistant) [Feature: F-001]
 - 2025-10-26 — v1.10 — Added Playwright E2E smoke test for Paper Selector and Preview flows (`tests/f001/paper-selector.spec.js`) and dev test server (`tests/f001/dev-server.js`). Added `npm run test:e2e` to run the test. Local run: 1 passed. (Author: Automated assistant) [Feature: F-001]
 - 2025-10-26 — v1.11 — Added centered dashboard icon across wireframes and a teacher emoji favicon. Updated headers in `wireframes/*.html` and stylesheet `wireframes/styles.css`; added `wireframes/favicon.svg`. (Author: Automated assistant) [UI polish]
 - 2025-10-26 — v1.12 — Mobile-first and PWA basics: added service worker (`wireframes/sw.js`), web app manifest (`wireframes/manifest.webmanifest`), mobile/touch UI improvements in `wireframes/styles.css`, and SW registration + hamburger injection in `wireframes/script.js`. (Author: Automated assistant) [PWA/UI]
 - 2025-10-26 — v1.12 — Mobile-first and PWA basics: added service worker (`wireframes/sw.js`), web app manifest (`wireframes/manifest.webmanifest`), mobile/touch UI improvements in `wireframes/styles.css`, and SW registration + hamburger injection in `wireframes/script.js`. (Author: Automated assistant) [PWA/UI]
 - 2025-10-26 — v1.13 — Navigation & accessibility polish, explicit hamburger, and favicon generator: removed the centered dashboard icon and moved Dashboard into the hamburger; added explicit `<button class="hamburger">` to headers that lacked it and updated the runtime injector to avoid duplicates. Implemented accessible hamburger behaviors (aria-expanded, focus-trap, Escape to close, restore focus) in `wireframes/script.js`. Added `scripts/generate-favicons.js` and updated `package.json` with a `generate:favicons` script to create PNG/ICO assets from `wireframes/favicon.svg` (must be run locally). (Author: Automated assistant) [UI polish / F-001]

 - 2025-10-27 — v1.14 — App scaffold and developer workflow: added a Vite + React + TypeScript scaffold under `app/` with initial entry `app/src/main.tsx`, `app/src/App.tsx`, and `app/src/styles.css`. Installed dependencies and started the Vite dev server during local implementation. Updated `tsconfig.json` to enable importing `.tsx` extensions to ease editor resolution in the scaffold. This scaffold is intentionally lightweight — next steps are to port wireframe pages into React components and convert the `wireframes/dataLoader.js` into a typed module under `app/src/lib/`. (Author: Automated assistant) [Infrastructure / Migration]
 - 2025-10-27 — v1.14 — App scaffold and developer workflow: added a Vite + React + TypeScript scaffold under `app/` with initial entry `app/src/main.tsx`, `app/src/App.tsx`, and `app/src/styles.css`. Installed dependencies and started the Vite dev server during local implementation. Updated `tsconfig.json` to enable importing `.tsx` extensions to ease editor resolution in the scaffold. This scaffold is intentionally lightweight — next steps are to port wireframe pages into React components and convert the `wireframes/dataLoader.js` into a typed module under `app/src/lib/`. (Author: Automated assistant) [Infrastructure / Migration]
 - 2025-10-27 — v1.15 — Migration & PWA: Ported key wireframe behaviors into the app scaffold and added basic PWA assets and favicon support.
   - Implemented accessible Modal component and focus-trap in the app: `app/src/components/Modal.tsx`.
   - Added a hamburger runtime helper (port of the wireframe injector) at `app/src/lib/ui.ts` and wired it in `app/src/components/Header.tsx`.
   - Added manifest-backed question lookup `getQuestionById` to `app/src/lib/ctetDataLoader.ts` and replaced inline Dashboard modals with the reusable `Modal`.
   - Added minimal PWA assets to the app: `app/public/sw.js`, `app/public/manifest.webmanifest`, and `app/public/favicon.svg`. The app registers the SW at load time (`app/src/main.tsx`).
   - Added generator & copy workflow for favicons: `scripts/generate-favicons.js` (existing), `scripts/copy-favicons-to-app.js` (new), and npm helper `generate-and-copy:favicons` in the repo root `package.json`. PNGs were generated and copied; ICO generation may fail in some environments — see notes below.
   (Author: Automated assistant)

 - 2025-10-27 — v1.16 — Mobile-first Dashboard & asset polish: responsive refactor and favicon asset copy.
   - Refactored `app/src/pages/Dashboard.tsx` to use mobile-first layout classes and responsive regions; added `.page`, `.container`, `.dashboard-header`, `.paper-cards`, `.paper-card`, `.layout`, `.sidebar`, `.main-panel`, and `.sample-grid` usages to align with `app/src/styles.css` mobile-first rules.
   - Updated `app/src/styles.css` with mobile-first helpers and responsive breakpoints (stacked layout on small screens, two-column layout at >=720px).
   - Copied generated PNG favicons into `app/public/` and added a placeholder `app/public/favicon.ico` to prevent browser 404s; ICO generation failed in this environment (see notes on generator limitations). Use `npm run generate-and-copy:favicons` locally to recreate PNGs and ICO, or convert a PNG to ICO and place under `app/public/`.
   - Minor accessibility wiring: `Header` was wired to use the hamburger helper; `Modal` and Dashboard preview/explain flows use the reusable Modal component.
  - Pending: small visual polish (scroll-snap for paper-cards, horizontal scroll affordance) and CI PWA checks. Unit tests for Modal and data loader were added in a follow-up update (see Changelog v1.19).
   (Author: Automated assistant)

 - 2025-10-27 — v1.17 — Button polish & icons: tactile buttons and iconography across Dashboard.
   - Replaced flat buttons with a tactile gradient button system (`.btn` primary and `.btn.outline` secondary) across `app/src/pages/Dashboard.tsx` and updated `app/src/styles.css` with sheen, shadow, hover/active and focus-visible states.
   - Added inline SVG icons to key actions (Change Paper, Select, Preview, Next/Prev) to improve scanability and affordance. Updated modal controls to use the same button language for consistency.
   - Applied the primary/secondary button patterns to the paper selector modal, preview modal navigation, sample question actions, and per-paper cards.
   - Result: dashboard buttons now present a consistent, tactile visual language and improved accessibility with visible focus states.
   - Pending: extract shared icons into a reusable `Icon` component and (optional) add a CSS-only ripple micro-interaction for click feedback.
   (Author: Automated assistant)

 - 2025-10-27 — v1.18 — Dev tooling & header fixes: resolved HMR/websocket and header visibility issues.
   - Updated Vite dev server HMR options in `app/vite.config.ts` to include explicit `protocol`, `host`, `port`, `clientPort`, and `path` settings so proxied/dev-forwarded pages connect to the correct websocket endpoint and HMR reconnects reliably.
   - Adjusted header CSS in `app/src/styles.css` to set `.header { position: relative; z-index: 40 }` and increased `.hamburger` z-index so the hamburger toggle is visible and operable on small viewports.
   - Added a placeholder `app/public/favicon.ico` to avoid 404s when ICO generation fails in some environments; kept the PNG favicons in `app/public/` and documented the local `generate-and-copy:favicons` workflow.
   - Minor tweaks and verification: restarted dev server and confirmed HMR handshake errors resolved in proxied scenarios; user confirmed issue fixed.
   (Author: Automated assistant) [Dev/UI]

 - 2025-10-27 — v1.19 — Tests & developer tooling: unit tests, Vitest config, fast test script, TS types, and button contrast.
   - Added Vitest configuration and a test setup file: `app/vitest.config.ts` and `app/src/test-setup.ts` to enable jsdom testing and jest-dom matchers.
   - Added unit tests for `Modal` (`app/src/__tests__/Modal.test.tsx` and `app/src/components/__tests__/Modal.test.tsx`) and `ctetDataLoader.getQuestionById` (`app/src/lib/__tests__/ctetDataLoader.test.ts`). Tests use Vitest + Testing Library and mock fetch for fast, isolated runs.
   - Added quick test scripts to `app/package.json`: `test:unit` and `test:fast` (the latter runs Vitest with threads disabled for very fast local iterations).
   - Updated TypeScript config to include `vite/client` and `vitest` types and added an ambient types file `app/src/types/vitest-global.d.ts` to support test globals and `global.fetch` in tests.
   - Minor UI polish: increased contrast for `.btn.outline` and added a stronger outline variant for buttons inside `.paper-card` to improve visibility on light cards.
   - Verification: ran the fast Vitest suite locally (3 unit tests) and confirmed green; updated docs and changelog accordingly.
   (Author: Automated assistant) [Dev/Tests/UI]

   - 2025-10-27 — v1.20 — Accessibility & CI: Dashboard ARIA, PWA checks, and CI workflow.
     - Dashboard: added small accessibility improvements and mobile hints (`aria-live` status, `role="list"` / `role="listitem"`, and `data-current-paper` attribute) to improve screen-reader and mobile UX for the Paper Selector and Dashboard view.
     - PWA quick-check script: added `scripts/check-pwa.js` which validates `app/public/manifest.webmanifest`, referenced icons, and `app/public/sw.js` for CI-friendly verification.
     - CI: added `.github/workflows/pwa-check.yml` to run `npm run test:fast` and the PWA quick-check on PRs and pushes to `main`.
     - Todos completed: marked mobile Dashboard polish, unit tests, and CI PWA verification as implemented in this release (see TODO list updates in repo).
     - Next: add an automated accessibility (axe) check into CI and expand coverage of unit tests.
     (Author: Automated assistant) [Dev/CI/Access]

Migration audit (2025-10-27)
---------------------------
I performed a feature parity audit between the wireframe prototype (`wireframes/`) and the migrated app scaffold (`app/`). Below is a concise mapping of wireframe features to the current app implementation and the outstanding work required to reach full parity.

Features present in the migrated app (`app/`):
- Paper selection and persistence: The `Dashboard` page in `app/src/pages/Dashboard.tsx` reads and persists `selectedPaper` in `localStorage` and exposes a modal to change the selection. (See `Dashboard.tsx`.)
- Data loader / manifest consumption: A typed loader exists at `app/src/lib/ctetDataLoader.ts` (loads `/data/index/manifest-latest.json`, exposes `listPapers()`, `listQuestions(paper)` and `loadFile(path)`). The repo-served manifest is available at `app/public/data/index/manifest-latest.json`.
- Dashboard UI: The Dashboard has sample question cards, per-paper summaries, a Questions summary grid, and a preview modal with paging and keyboard handlers (← / → / Esc). (See `app/src/pages/Dashboard.tsx`.)
- Explain modal: The Dashboard provides an Explain modal for sample questions (in-file explanations are shown).
- Styling / theme: The Mustard & Gray theme from the wireframe has been ported to `app/src/styles.css` and applied to the scaffolded pages.
- Buttons & controls: Primary and secondary actions across the `Dashboard` have been restyled with a tactile, gradient-based button system (primary `.btn` and secondary `.btn.outline`) and inline SVG icons were added to key actions for improved affordance and scanability.
- Header & navigation: A `Header` component exists at `app/src/components/Header.tsx` with a hamburger button and `react-router-dom` links.

Wireframe features that are not (yet) fully migrated / missing in `app/`:
- Full ARIA / focus-trap parity for all modals: an accessible `Modal` component exists in the app, but it requires a focused audit and unit tests to confirm its trap/restore behavior matches the wireframe's behavior across all usages.
- Visual polish & responsive affordances: the Dashboard was refactored to a mobile-first layout and most responsive pieces are in place, but a short polish pass is recommended (scroll-snap for `.paper-cards`, horizontal scroll affordances, card min-heights, and a11y labels).
- Proper ICO artifact: during generator runs in this environment ICO creation failed; a placeholder `app/public/favicon.ico` was added to prevent 404s. Please run the local generator or convert a PNG to ICO and place it in `app/public/` for full legacy support.
 - Tests & CI: unit tests for `Modal` and `ctetDataLoader.getQuestionById` have been added and a lightweight CI workflow was created to run fast unit tests and a PWA manifest/service-worker verification. An automated accessibility (axe) check on the Dashboard remains recommended for CI.

Risk & immediate next steps to complete parity
- Audit & polish (high priority): run an accessibility audit (axe), verify focus-trap behavior across `Modal` usages, add small visual polish to the Dashboard (scroll-snap for `.paper-cards`, clearer horizontal scroll affordances, card min-heights), and tidy spacing on mobile.
- Service worker & manifest verification: confirm `app/public/sw.js` and `app/public/manifest.webmanifest` are adapted correctly for the SPA routes and that icons referenced by the manifest exist in `app/public/` (update paths if needed).
- Favicon / ICO: regenerate `favicon.ico` locally (generator may fail in some environments); alternatively convert an existing PNG to ICO and place in `app/public/` to replace the placeholder.
- Tests & CI: unit tests for `Modal` and `ctetDataLoader.getQuestionById` have been added and a lightweight PWA/check action was created in `.github/workflows/pwa-check.yml` to run fast tests and validate the manifest/service worker. Add an accessibility (axe) CI step (Playwright + axe) as next work to provide automated a11y gating. Wire the validator into PRs to ensure data schema regressions are caught.
- Documentation: update this reference doc (this file) after the polish and tests are in place and bump `Version` + `LastUpdated` accordingly.

Files to add/modify (suggested minimal list)
- `app/src/lib/ui.ts` — desktop/mobile helpers (hamburger toggle, focus trap utilities)
- `app/src/components/Modal.tsx` — accessible modal wrapper (focus trap + ARIA)
- `app/public/sw.js` — service worker (adapted from `wireframes/sw.js`)
- `app/public/manifest.webmanifest` — web app manifest (copy/adapt from `wireframes/manifest.webmanifest`)
- `app/public/favicon.svg`, `app/public/favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon.ico` — favicon assets (generate via `scripts/generate-favicons.js` or commit pre-generated images)
- `app/src/lib/ctetDataLoader.ts` — add `getQuestionById` and manifest-backed index usage.

Migration conclusion (current):
Most of the wireframe's core UX for F-001 (Paper separation, manifest consumption, Dashboard preview/explain and paging, sample question rendering, and theme) have been migrated into the React + TypeScript scaffold under `app/`. However several supportive features required for feature parity and production-readiness — notably the PWA assets (SW & manifest), runtime accessible hamburger behavior, favicon assets, and a reusable accessible Modal + a `getQuestionById` API — remain to be migrated.

If you want, I can implement the missing items now in the app (I can start with the hamburger UI hook + `Modal.tsx` and `getQuestionById`, then add SW/manifest and favicon assets). Tell me which to prioritize and I'll proceed.


Appendix A — Where to find prototypes and sample data
----------------------------------------------------
- Wireframe prototype (clickable HTML): `wireframes/`.
- Sample JSON question data provided in workspace: `Docs/jsonData/Paper2-Dec24/`.
- Scripts and helpers: `scripts/`.

Appendix B — Contact & ownership
--------------------------------
Product owner / Content owner: (TO-BE-FILLED)
Lead developer: (TO-BE-FILLED)

---
This document is authoritative. All designers, developers, and QA engineers must refer to it before implementing or approving new work.

- 2025-10-27 — v1.21 — F-001 verification & CI tests: Verified Hindi converted artifact, added an automated manifest sanity check, and added an integration test to exercise converter+validator.
  - Added `scripts/check-manifest.js` to verify converted files exist, question counts match, and IDs are unique across converted artifacts.
  - Added a Vitest integration test `app/src/lib/__tests__/f001-convert-validate.test.ts` that runs the converter on a small fixture and validates the converted output.
  - Updated `.github/workflows/validate-json.yml` to run the manifest sanity check as part of PR validation for `Docs/jsonData/**` changes. (Author: Automated assistant)
 - 2025-10-27 — v1.22 — Study materials ingestion plan (F-006): Drafted schema & validator plan and prioritized ingestion work for StudyData under `Docs/StudyData/Dec24`.
   - Created phase-1 plan to author `scripts/study-schema.json` and a validation script to detect normalization needs; next step is converter to normalize chapter/question wrappers and produce `data/study/` and `data/index/manifest-study-latest.json`. (Author: Automated assistant)
 - 2025-10-28 — v1.23 — Archived Paper_2 raw and converted artifacts into `archive/removed-data-20251028`; updated manifest and added archive provenance files (`README.md`, `metadata.json`). (Author: Automated assistant) [Maintenance/Archive]
 - 2025-10-28 — v1.24 — Added canonical data model & storage plan (`Docs/data-model.md`): manifests, chunked layout, checksum/versioning policy, ingest flow, and CI validation guidance. This document is the authoritative reference for data ingest and manifest generation. (Author: Automated assistant) [Data Model]
