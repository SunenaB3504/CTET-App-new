#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function normalizeText(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/\s+/g,' ').trim().toLowerCase();
}

function ensureLogsDir() {
  const logs = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logs)) fs.mkdirSync(logs);
  return logs;
}

function shortHash(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0,8);
}

function extractQuestions(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (obj.questions && Array.isArray(obj.questions)) return obj.questions;
  if (obj.items && Array.isArray(obj.items)) return obj.items;
  return [];
}

function loadIndexFromManifest() {
  const manifestPath = path.resolve(process.cwd(), 'data','index','manifest-latest.json');
  if (!fs.existsSync(manifestPath)) return { questionIndex: {} };
  try {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const qManifestPath = m.manifests && m.manifests.questions ? path.resolve(process.cwd(), m.manifests.questions) : null;
    if (!qManifestPath || !fs.existsSync(qManifestPath)) return { questionIndex: {} };
    const qm = JSON.parse(fs.readFileSync(qManifestPath, 'utf8'));
    return { questionIndex: qm.questionIndex || {}, files: qm.files || [] };
  } catch (e) {
    return { questionIndex: {} };
  }
}

function usage() {
  console.log('Usage: node scripts/import-helper.js <upload-file.json> [--rename-duplicates]');
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) { usage(); return; }
  const opts = { rename: false };
  const files = [];
  for (const a of args) {
    if (a === '--rename-duplicates') opts.rename = true;
    else files.push(a);
  }
  if (!files.length) { usage(); return; }

  const indexData = loadIndexFromManifest();
  const questionIndex = indexData.questionIndex || {};

  const report = { generatedAt: new Date().toISOString(), uploads: [] };

  for (const f of files) {
    const abs = path.resolve(process.cwd(), f);
    if (!fs.existsSync(abs)) { report.uploads.push({ file: f, error: 'not-found' }); continue; }
    const json = readJson(abs);
    if (!json) { report.uploads.push({ file: f, error: 'invalid-json' }); continue; }
    const questions = extractQuestions(json);
    const suggestions = [];
    for (let i=0;i<questions.length;i++) {
      const q = questions[i];
      const id = q && (q.id || q.questionId || q.qid) ? String(q.id || q.questionId || q.qid) : null;
      const txt = normalizeText(q && (q.question || q.text || q.prompt) || '');
      if (id && questionIndex[id]) {
        // duplicate id
        const action = opts.rename ? `rename:${id}->${id}-${shortHash(txt||id)}` : 'skip';
        suggestions.push({ index: i, id, problem: 'duplicate-id', suggestion: action });
      } else {
        // also check for near-duplicate by text
        const existingByText = Object.keys(questionIndex).find(k => {
          const rec = questionIndex[k];
          try { return normalizeText(fs.readFileSync(path.resolve(process.cwd(), rec.file),'utf8')).includes(txt.slice(0,40)); } catch { return false; }
        });
        if (existingByText) {
          suggestions.push({ index: i, id, problem: 'near-duplicate-text', suggestion: 'skip-or-review', match: existingByText });
        }
      }
    }
    report.uploads.push({ file: f, total: questions.length, suggestions });
  }

  const logs = ensureLogsDir();
  const outFile = path.join(logs, `import-preview-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Import preview written to ${outFile}`);
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) main();
