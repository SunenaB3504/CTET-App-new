#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');

function walkDir(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full, cb);
    else cb(full);
  }
}

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function normalizeText(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/\s+/g, ' ')
    .replace(/["'`]/g, '')
    .trim()
    .toLowerCase();
}

function extractQuestions(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (obj.questions && Array.isArray(obj.questions)) return obj.questions;
  // attempt common shapes
  if (obj.items && Array.isArray(obj.items)) return obj.items;
  return [];
}

function ensureLogsDir() {
  const logs = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logs)) fs.mkdirSync(logs);
  return logs;
}

function scanFiles(paths) {
  const jsonFiles = [];
  for (const p of paths) {
    const abs = path.resolve(process.cwd(), p);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      walkDir(abs, (f) => { if (f.endsWith('.json')) jsonFiles.push(f); });
    } else if (stat.isFile() && abs.endsWith('.json')) jsonFiles.push(abs);
  }
  return jsonFiles;
}

function usage() {
  console.log('Usage: node scripts/check-duplicates.js [paths..] [--json] [--fail]');
  console.log('If no paths provided, defaults to: Docs/jsonData data/questions data/converted');
}

function main() {
  const args = process.argv.slice(2);
  const opts = { json: false, fail: false };
  const paths = [];
  for (const a of args) {
    if (a === '--json') opts.json = true;
    else if (a === '--fail') opts.fail = true;
    else if (a === '--help' || a === '-h') { usage(); return; }
    else paths.push(a);
  }
  const targets = paths.length ? paths : ['Docs/jsonData', 'data/questions', 'data/converted'];

  const files = scanFiles(targets);
  const idMap = Object.create(null);
  const textMap = Object.create(null);
  const fileErrors = [];

  for (const f of files) {
    const json = readJson(f);
    if (!json) { fileErrors.push({ file: f, error: 'invalid-json' }); continue; }
    const questions = extractQuestions(json);
    if (!questions.length) continue;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const id = (q && (q.id || q.questionId || q.qid)) ? String(q.id || q.questionId || q.qid) : null;
      const txt = normalizeText(q && (q.question || q.text || q.prompt));
      if (id) {
        if (!idMap[id]) idMap[id] = [];
        idMap[id].push({ file: f, index: i });
      }
      if (txt) {
        if (!textMap[txt]) textMap[txt] = [];
        textMap[txt].push({ file: f, index: i, id: id || null });
      }
    }
  }

  const idDuplicates = Object.keys(idMap).filter(k => idMap[k].length > 1).reduce((acc,k)=>{acc[k]=idMap[k];return acc;},{});
  const textDuplicates = Object.keys(textMap).filter(k => textMap[k].length > 1).reduce((acc,k)=>{acc[k]=textMap[k];return acc;},{});

  const report = {
    generatedAt: new Date().toISOString(),
    scannedFiles: files.length,
    fileErrors,
    idDuplicateCount: Object.keys(idDuplicates).length,
    textDuplicateCount: Object.keys(textDuplicates).length,
    idDuplicates,
    textDuplicates
  };

  const logs = ensureLogsDir();
  const outFile = path.join(logs, `duplicates-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Scanned ${files.length} files. Found ${report.idDuplicateCount} ID duplicates and ${report.textDuplicateCount} text duplicates.`);
  console.log(`Report written to ${outFile}`);

  if (opts.json) console.log(JSON.stringify(report));

  if (opts.fail && (report.idDuplicateCount > 0 || report.textDuplicateCount > 0)) {
    console.error('Duplicates found (--fail specified): failing with exit code 2');
    process.exit(2);
  }

  process.exit(0);
}

if (require.main === module) main();
