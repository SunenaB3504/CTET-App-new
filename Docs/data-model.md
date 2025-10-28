# Canonical Data Model & Storage Plan (draft)

Version: 0.1
LastUpdated: 2025-10-28

Purpose
-------
This document describes the canonical on-disk JSON shapes, directory layout, manifest/index design, checksum/versioning policy, ingest/validation flow, and migration/archival guidance for the CTET Prep project. It is a pragmatic, file-first design intended to be stable, simple to operate from CI, and to enable a future migration to a DB-backed store if needed.

Goals
-----
- Provide a single, clear canonical layout under `data/` for questions, study materials, and mock tests.
- Make ingests deterministic and non-destructive (original input files preserved unless archived by a deliberate process).
- Make client loaders (frontend) simple: small manifests + chunked files that can be loaded on demand.
- Ensure reproducibility with checksums and manifest metadata for each imported file.

High-level directory layout
--------------------------
This layout lives in the repository (or in the deployed `data/` folder used by the app). Example:

- `data/`
  - `index/` — manifests and indexes
    - `manifest-latest.json` — pointer to current manifests (questions/study/mockTests)
    - `manifest-questions-<timestamp>.json` — full questions manifest (rotated)
    - `manifest-study-<timestamp>.json` — study manifest (rotated)
  - `questions/` — chunked question files (by paper/language/subject)
    - `paper-2/english/math/chunk-0001.json`
    - `paper-2/hindi/math/chunk-0001.json`
  - `study/` — canonical study materials (chapter-per-file)
    - `subject-math/chapter-01.json`
  - `archives/` — archival snapshots (if any) — do not reference this during normal loads

Canonical file shapes
---------------------
Questions chunk (example)
```json
{
  "paper": "Paper 2",
  "language": "Hindi",
  "subject": "Mathematics",
  "chunkId": "paper-2-hindi-maths-chunk-0001",
  "items": [
    {
      "id": "Q-P2-HI-M-00001",
      "question": "...",
      "options": ["A","B","C","D"],
      "correct_answer": "B",
      "explanation": "...",
      "metadata": { "pdfPage": 12, "topic": "Algebra", "difficulty": "Medium" }
    }
  ]
}
```

Study chapter file (example)
```json
{
  "subject": "Mathematics",
  "language": "English",
  "chapterId": "maths-ch-01",
  "title": "Number Systems",
  "order": 1,
  "sections": [
    { "id":"s1", "title":"Integers", "content":"# Integers\nContent...", "attachments":[] }
  ]
}
```

Manifest design
---------------
There are two levels of manifest:

1. `data/index/manifest-latest.json` — small pointer file used by clients. Example:

```json
{
  "version": "1",
  "generatedAt": "2025-10-28T12:00:00Z",
  "manifests": {
    "questions": "data/index/manifest-questions-20251028.json",
    "study": "data/index/manifest-study-20251028.json"
  }
}
```

2. `manifest-questions-<ts>.json` — the heavy manifest consumed by server-side tooling and optionally by the client. It contains a `questionIndex` mapping `questionId -> { filePath, chunkId, subject, paper, language, sha256 }` and per-file metadata.

Minimal manifest-questions example:

```json
{
  "generatedAt": "2025-10-28T12:00:00Z",
  "files": [
    { "path":"data/questions/paper-2/hindi/math/chunk-0001.json", "sha256":"ABC...", "count": 250 }
  ],
  "questionIndex": {
    "Q-P2-HI-M-00001": { "file":"data/questions/paper-2/hindi/math/chunk-0001.json", "sha256":"ABC...", "subject":"Mathematics", "paper":"Paper 2", "language":"Hindi" }
  }
}
```

Checksum & version policy
-------------------------
- Every file produced by the pipeline (`data/questions/*`, `data/study/*`) must include a SHA256 checksum recorded in the manifest.
- Manifests are timestamped and immutable. `manifest-latest.json` points to the authoritative manifest file.
- When files are re-generated, produce a new manifest (timestamped) and update `manifest-latest.json` atomically.

Ingest & validation flow (high level)
------------------------------------
1. Author provides source files under `Docs/` (e.g., `Docs/jsonData/...` or `Docs/StudyData/...`). If metadata is missing, also provide a small `Docs/manifest-upload.json` mapping filenames -> metadata.
2. Run `scripts/convert-and-split.js` (or the current `scripts/convert-add-paper-metadata.js` and `scripts/split-and-index.js`):
   - Normalize top-level arrays into wrapped objects if necessary (add `paper`, `term`, `year`, `subject`, `language`). Prefer explicit metadata from the `Docs` manifest; if not available, infer from filenames but log a manual-review warning.
   - Split large files into chunks (size target: ~200-500 items per chunk; tunable).
   - Compute SHA256 for each chunk and write to `data/questions/...` using atomic write (write to temp -> rename).
   - Produce the `manifest-questions-<ts>.json` and update `data/index/manifest-latest.json` atomically.
3. Run `scripts/validate-json.js --manifest data/index/manifest-latest.json` which:
   - Loads the manifest, iterates files, validates them against AJV schemas, and checks for duplicate IDs across the `questionIndex`.
   - Emits machine-readable JSON for CI.

Atomic/transactional updates
---------------------------
- Implementation note: use `fs.writeFile(tempPath)` and `fs.rename(tempPath, finalPath)` to ensure the final file appears atomically on most filesystems.
- When updating `manifest-latest.json`, write a temp file and rename; if using GitOps, create a single commit that includes new files and manifest pointer updates.

Archival & retention
---------------------
- Archival is a deliberate, logged operation. Move original raw uploads into `archive/removed-data-<YYYYMMDD>/` and record checksums and file sizes in `archive/metadata.json`.
- When marking files as archived in a manifest, include `archived: true`, `archivedAt`, and `archivePath` for traceability. Clients should ignore archived files by default.

Client loader contract
----------------------
- Client reads `data/index/manifest-latest.json` -> loads the `questions` manifest.
- To show counts / preview, the client can use the lightweight `files[]` list instead of loading the whole question index.
- For specific question lookup, client may fetch by `questionId` using the `questionIndex` map (small enough to be downloaded on first load for moderate-scale datasets). For very large datasets, provide a `questionId -> chunk` index per paper to lazy-load.

CI & validation
---------------
- Add a CI job that runs `node ./scripts/validate-json.js --manifest data/index/manifest-latest.json --json` and fails on validation errors or duplicate IDs.
- For `Docs/` commits (new uploads), run `node ./scripts/validate-json.js --input <changed-file> --json` to validate ad-hoc.

Acceptance criteria for this design
----------------------------------
1. A manifest-latest.json exists and points to a `manifest-questions-<ts>.json` file.
2. All `data/questions/*` chunk files referenced in the manifest exist and their checksums match the manifest.
3. No duplicate question IDs across the `questionIndex` map.
4. A documented ingest flow exists and can be run locally to convert and publish a new manifest.

Next steps (short)
------------------
1. Implement `scripts/convert-and-split.js` that wraps, splits, computes checksums, writes chunks, and generates manifests.
2. Implement `scripts/validate-json.js --manifest` to validate chunk files and the resulting manifest.
3. Wire a CI job to run the validation on push/PRs that touch `data/` or `Docs/` uploads.

Notes & rationale
-----------------
- This file-first approach minimizes operational complexity. The chunked manifest/index design lets us scale reads without moving to a DB immediately while keeping a clear upgrade path.
- The manifest + checksum approach ensures reproducibility, easier debugging, and safe rollbacks.

Contact
-------
Product owner / Content owner: TO-BE-FILLED
Lead implementer: TO-BE-FILLED
