#!/usr/bin/env node
/*
  scripts/validate-study.js
  Phase 1 validator for Study materials. Scans a directory (default: Docs/StudyData/Dec24)
  and reports files that are top-level arrays (need wrapping), files that fail the
  canonical `scripts/study-schema.json` schema, and basic normalization warnings.

  Usage:
    node ./scripts/validate-study.js [path] [--json]

  Outputs a JSON summary when `--json` is provided, otherwise prints a human-readable report.
*/
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const argv = process.argv.slice(2);
let target = argv.find(a => !a.startsWith('--')) || 'Docs/StudyData/Dec24';
const asJson = argv.includes('--json');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return { __parseError: String(err) };
  }
}

function inferLanguageFromFilename(name) {
  const s = name.toLowerCase();
  if (s.includes('eng') || s.includes('english')) return 'English';
  if (s.includes('hin') || s.includes('hindi')) return 'Hindi';
  if (s.includes('math')) return 'Mathematics';
  if (s.includes('sst') || s.includes('social')) return 'Social Studies';
  return null;
}

function analyzeChapterShape(ch) {
  const issues = [];
  if (ch == null) { issues.push('chapter is null/undefined'); return issues; }
  if (typeof ch !== 'object') { issues.push('chapter is not an object'); return issues; }
  if (ch.id === undefined) issues.push('missing id');
  if (!ch.title) issues.push('missing title');
  if (!ch.summary && !Array.isArray(ch.sections) && !Array.isArray(ch.questions)) issues.push('has no summary/sections/questions');
  if (Array.isArray(ch.questions)) {
    ch.questions.forEach((q, i) => {
      if (!q || (typeof q !== 'object')) issues.push(`questions[${i}] is not an object`);
    });
  }
  return issues;
}

function scanDir(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json'));
  } catch (err) {
    return null;
  }
}

const schemaPath = path.join(__dirname, 'study-schema.json');
const schema = readJSON(schemaPath);
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const absTarget = path.resolve(target);
const files = scanDir(absTarget);
if (!files) {
  console.error(`Directory not found or not readable: ${absTarget}`);
  process.exit(2);
}

const summary = { scanned: files.length, files: [] };

files.forEach(fn => {
  const fp = path.join(absTarget, fn);
  const raw = readJSON(fp);
  const entry = { file: path.relative(process.cwd(), fp), ok: false, warnings: [], errors: [] };
  if (raw && raw.__parseError) {
    entry.errors.push({ type: 'parse', message: raw.__parseError });
    summary.files.push(entry);
    return;
  }

  if (Array.isArray(raw)) {
    // Top-level array — likely chapters array (unwrapped). Detect per-chapter shape issues.
    entry.warnings.push('top_level_array');
    entry.inferred = { chapters: raw.length };
    const lang = inferLanguageFromFilename(fn);
    if (lang) entry.inferred.language = lang;
    raw.forEach((ch, idx) => {
      const issues = analyzeChapterShape(ch);
      if (issues.length) entry.warnings.push({ chapterIndex: idx, issues });
    });
    entry.note = 'File is a top-level array. Recommended: convert into wrapped object { subject, language, chapters: [...] } before schema validation.';
    summary.files.push(entry);
    return;
  }

  // Otherwise expect an object that matches the schema
  const valid = validate(raw);
  if (!valid) {
    entry.errors = (validate.errors || []).map(e => ({ instancePath: e.instancePath, message: e.message, keyword: e.keyword }));
    summary.files.push(entry);
    return;
  }

  // If valid, still run light consistency checks
  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    entry.warnings.push('no_chapters');
  } else {
    raw.chapters.forEach((ch, idx) => {
      const issues = analyzeChapterShape(ch);
      if (issues.length) entry.warnings.push({ chapterIndex: idx, issues });
    });
  }
  entry.ok = true;
  summary.files.push(entry);
});

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Scanned ${summary.scanned} file(s) in ${absTarget}\n`);
  summary.files.forEach(f => {
    console.log(`- ${f.file}`);
    if (f.errors && f.errors.length) {
      console.log(`  Errors:`);
      f.errors.forEach(e => console.log(`    - ${e.instancePath || ''} ${e.message || JSON.stringify(e)}`));
    }
    if (f.warnings && f.warnings.length) {
      console.log(`  Warnings:`);
      f.warnings.forEach(w => console.log(`    - ${typeof w === 'string' ? w : JSON.stringify(w)}`));
    }
    if (f.inferred) console.log(`  Inferred: ${JSON.stringify(f.inferred)}`);
    console.log('');
  });
}

// Exit code: 0 if no parse/schema errors, 1 otherwise
const hasErrors = summary.files.some(f => f.errors && f.errors.length);
process.exit(hasErrors ? 1 : 0);
