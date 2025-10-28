#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(e) { return null; }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

function walkDir(dir, cb) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full, cb);
    else if (e.isFile() && full.endsWith('.json')) cb(full);
  }
}

function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function extractQuestions(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (obj.questions && Array.isArray(obj.questions)) return obj.questions;
  if (obj.items && Array.isArray(obj.items)) return obj.items;
  return [];
}

function rel(p) { return path.relative(process.cwd(), p).replace(/\\/g,'/'); }

function main() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const candidates = [ path.join(process.cwd(),'data','converted'), path.join(process.cwd(),'data','questions') ];

  const filesMeta = [];
  const questionIndex = {};

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    walkDir(dir, (f) => {
      const json = readJson(f);
      if (!json) return;
      const items = extractQuestions(json);
      const count = items.length;
      const checksum = sha256(f);
      const meta = { path: rel(f), sha256: checksum, count };
      // attempt to read top-level metadata
      if (json.paper) meta.paper = json.paper;
      if (json.subject) meta.subject = json.subject;
      if (json.language) meta.language = json.language;
      filesMeta.push(meta);
      for (let i=0;i<items.length;i++) {
        const q = items[i];
        const id = q && (q.id || q.questionId || q.qid) ? String(q.id || q.questionId || q.qid) : null;
        if (!id) continue;
        if (!questionIndex[id]) {
          questionIndex[id] = { file: rel(f), index: i, sha256: checksum, paper: json.paper || null, subject: json.subject || null, language: json.language || null };
        } else {
          // keep first occurrence but record duplicates array
          if (!questionIndex[id].duplicates) questionIndex[id].duplicates = [];
          questionIndex[id].duplicates.push({ file: rel(f), index: i });
        }
      }
    });
  }

  const now = new Date().toISOString().replace(/[:.]/g,'-');
  const manifestName = `data/index/manifest-questions-${now}.json`;
  const manifest = {
    generatedAt: new Date().toISOString(),
    files: filesMeta,
    questionIndex
  };
  writeJson(path.resolve(process.cwd(), manifestName), manifest);
  console.log('Wrote', manifestName);

  // update manifest-latest.json
  const latestPath = path.resolve(process.cwd(), 'data','index','manifest-latest.json');
  let latest = {};
  if (fs.existsSync(latestPath)) latest = readJson(latestPath) || {};
  // preserve archives if present
  const archives = latest.archives || [];
  const out = {
    version: '1',
    generatedAt: new Date().toISOString(),
    manifests: Object.assign({}, latest.manifests || {}, { questions: manifestName }),
    archives
  };
  writeJson(latestPath, out);
  console.log('Updated data/index/manifest-latest.json to reference questions manifest.');
}

if (require.main === module) main();
