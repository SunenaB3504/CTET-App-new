#!/usr/bin/env node
/*
  scripts/convert-add-paper-metadata.js
  - Reads JSON files under Docs/jsonData/** (recursively).
  - If a file is a top-level array of question objects, wraps it into the canonical schema:
    { paper, term, year, subject, language, questions: [ ... ] }
  - Infers `paper` and `term`/`year` from parent folder name (e.g., Paper2-Dec24 -> Paper 2, December 2024).
  - Infers `subject` and `language` from filename tokens (best-effort). Falls back to "Unknown" / "English".
  - Writes outputs to data/converted/<paperNormalized>/<originalFilename>.json (non-destructive).
  - Writes a manifest per-run to data/index/manifest-<timestamp>.json mapping questionId -> file and includes checksums.
  - Uses atomic write (tmp file + rename).

  Usage: node scripts/convert-add-paper-metadata.js [--src Docs/jsonData] [--out data/converted] [--index data/index]
*/

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// simple arg parsing to avoid extra deps
const rawArgs = process.argv.slice(2);
const argv = {};
for(let i=0;i<rawArgs.length;i++){
  const a = rawArgs[i];
  if(a.startsWith('--')){
    const key = a.slice(2);
    const val = rawArgs[i+1] && !rawArgs[i+1].startsWith('--') ? rawArgs[++i] : true;
    argv[key]=val;
  }
}
argv.src = argv.src || 'Docs/jsonData';
argv.out = argv.out || 'data/converted';
argv.index = argv.index || 'data/index';

const srcRoot = path.resolve(argv.src);
const outRoot = path.resolve(argv.out);
const indexRoot = path.resolve(argv.index);

const monthMap = {
  jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', jun: 'June',
  jul: 'July', aug: 'August', sep: 'September', oct: 'October', nov: 'November', dec: 'December'
};

const subjectLookup = Object.assign({}, {
  eng: 'English', hindi: 'Hindi', maths: 'Mathematics', math: 'Mathematics', sst: 'Social Studies',
  cdp: 'Child Development & Pedagogy', cd: 'Child Development & Pedagogy'
});

function sha256(str){
  return crypto.createHash('sha256').update(str,'utf8').digest('hex');
}

async function ensureDir(dir){
  await fsp.mkdir(dir, {recursive:true});
}

function inferFromPath(filePath){
  const dir = path.basename(path.dirname(filePath)); // e.g., Paper2-Dec24
  const parts = dir.split(/[-_]/);
  let paper = 'Unknown';
  let term = 'Unknown';
  let year = null;
  if(parts.length>=1){
    const m = parts[0].match(/Paper\s*(\d)|Paper(\d)/i);
    if(m){
      const n = m[1] || m[2];
      paper = `Paper ${n}`;
    }
  }
  if(parts.length>=2){
    // attempt to parse e.g., Dec24 or Dec-24
    const t = parts[1];
    const letters = t.replace(/\d/g,'').toLowerCase();
    const digits = t.replace(/\D/g,'');
    if(letters && monthMap[letters]) term = monthMap[letters];
    if(digits){
      const d = parseInt(digits,10);
      year = (d < 100) ? 2000 + d : d;
    }
  }
  if(!year) year = new Date().getFullYear();
  return {paper, term, year};
}

function inferSubjectAndLanguage(filename){
  const base = path.basename(filename, path.extname(filename));
  const tokens = base.split(/[^A-Za-z0-9]+/).map(s=>s.toLowerCase());
  let subject = null;
  let language = null;
  for(const t of tokens){
    if(subjectLookup[t]) subject = subjectLookup[t];
    if(t==='hindi') language = 'Hindi';
    if(t==='eng' || t==='english') language = 'English';
  }
  if(!subject){
    // try tokens like Maths, SST, ENG
    for(const t of tokens){
      if(subjectLookup[t]){ subject = subjectLookup[t]; break; }
      if(t==='maths' || t==='math') { subject = 'Mathematics'; break; }
      if(t==='sst') { subject = 'Social Studies'; break; }
    }
  }
  if(!language) language = subject && subject.toLowerCase().includes('hindi') ? 'Hindi' : 'English';
  if(!subject) subject = tokens.join(' ') || 'Unknown';
  return {subject, language};
}

async function walk(dir){
  const entries = await fsp.readdir(dir, {withFileTypes:true});
  const files = [];
  for(const e of entries){
    const full = path.join(dir,e.name);
    if(e.isDirectory()){
      const sub = await walk(full);
      files.push(...sub);
    } else if(e.isFile() && e.name.toLowerCase().endsWith('.json')){
      files.push(full);
    }
  }
  return files;
}

async function atomicWrite(filePath, dataStr){
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmp = filePath + '.tmp-' + Date.now();
  await fsp.writeFile(tmp, dataStr, 'utf8');
  await fsp.rename(tmp, filePath);
}

async function run(){
  if(!fs.existsSync(srcRoot)){
    console.error('Source folder not found:', srcRoot);
    process.exit(2);
  }
  await ensureDir(outRoot);
  await ensureDir(indexRoot);
  const files = await walk(srcRoot);
  if(files.length===0){
    console.log('No JSON files found under', srcRoot);
    return;
  }
  const manifest = {generatedAt: new Date().toISOString(), files: [], questionIndex: {}};

  for(const file of files){
    try{
      const raw = await fsp.readFile(file,'utf8');
      let parsed;
      try{ parsed = JSON.parse(raw); } catch(e){ console.warn('Skipping invalid JSON:', file); continue; }

      let outputObj = null;
      if(Array.isArray(parsed)){
        const inf = inferFromPath(file);
        const subjLang = inferSubjectAndLanguage(path.basename(file));
        // normalize each question to canonical shape
        const questions = parsed.map((q, idx)=> normalizeQuestion(q, path.basename(file), idx));
        outputObj = {
          paper: inf.paper,
          term: inf.term,
          year: inf.year,
          subject: subjLang.subject,
          language: subjLang.language,
          questions
        };
      } else if(parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)){
        // already wrapped; normalize inner questions
        const questions = parsed.questions.map((q, idx)=> normalizeQuestion(q, path.basename(file), idx));
        outputObj = Object.assign({}, parsed, {questions});
      } else {
        console.warn('Skipping file (unknown structure):', file);
        continue;
      }

      // prepare out path: data/converted/<paperNormalized>/<orig-filename>
      const paperNorm = outputObj.paper.replace(/\s+/g,'_');
      const relOutDir = path.join(paperNorm);
      const outDir = path.join(outRoot, relOutDir);
      const outFile = path.join(outDir, path.basename(file));

      const jsonStr = JSON.stringify(outputObj, null, 2);
      const checksum = sha256(jsonStr);
      await atomicWrite(outFile, jsonStr);

      // update manifest
      const qids = Array.isArray(outputObj.questions) ? outputObj.questions.map(q=>q.id).filter(Boolean) : [];
      manifest.files.push({
        input: path.relative(process.cwd(), file),
        output: path.relative(process.cwd(), outFile),
        paper: outputObj.paper,
        term: outputObj.term,
        year: outputObj.year,
        subject: outputObj.subject,
        language: outputObj.language,
        questionCount: qids.length,
        checksum
      });
      for(const id of qids){
        if(!manifest.questionIndex[id]) manifest.questionIndex[id] = [];
        manifest.questionIndex[id].push({file: path.relative(process.cwd(), outFile), checksum});
      }

      // run validator on the converted file
      console.log('Validating converted file:', outFile);
      const res = spawnSync(process.execPath, [path.join('scripts','validate-json.js'), outFile], {stdio:'inherit'});
      if(res.status !== 0){
        console.warn(`Validator returned code ${res.status} for ${outFile}`);
      }

    } catch(err){
      console.error('Error processing', file, err);
    }
  }

  const manifestName = `manifest-${Date.now()}.json`;
  const manifestPath = path.join(indexRoot, manifestName);
  await atomicWrite(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest to', manifestPath);
  console.log('Conversion complete. Converted files written to', outRoot);
}


function normalizeQuestion(orig, filename, idx){
  // canonical fields per schema: id, question, options, correct_answer, explanation, topic, difficulty, attachments
  const q = orig || {};
  // id
  let id = q.id && String(q.id).trim();
  if(!id){
    if(q.questionNumber) id = `${path.basename(filename, path.extname(filename))}-Q${q.questionNumber}`;
    else id = `${path.basename(filename, path.extname(filename))}-Q${idx+1}`;
  }
  // question text
  const questionText = q.question || q.q || q.text || q.prompt || '';
  // options
  let options = q.options || q.opt || q.choices || q.mcqOptions || [];
  if(!Array.isArray(options)) options = Array.from(options||[]).map(String);
  options = options.map(o=> (o===null||o===undefined)? '': String(o));
  // correct answer: map numeric index to option text, or use provided string
  let correct = q.correct_answer || q.correctAnswer || q.answer || q.answerKey || null;
  if(typeof correct === 'number'){
    const idx0 = correct; // assume 0-based
    correct = (options[idx0]!==undefined) ? String(options[idx0]) : String(correct);
  } else if(typeof correct === 'string'){
    // if it's a single letter like 'A' convert to option if possible
    if(correct.length===1 && /^[A-Za-z]$/.test(correct) && options.length>=1){
      const letterIndex = correct.toUpperCase().charCodeAt(0) - 65;
      if(options[letterIndex]) correct = String(options[letterIndex]);
    }
  }
  if(!correct) correct = '';
  // explanation
  const explanation = q.explanation || q.expl || q.answerExplanation || '';
  // topic
  const topic = q.topic || q.chapter || q.section || 'Unknown';
  // difficulty
  let difficulty = q.difficulty || q.level || q.diff || 'Medium';
  if(!['Easy','Medium','Hard'].includes(difficulty)) difficulty = 'Medium';
  // attachments
  const attachments = Array.isArray(q.attachments) ? q.attachments.map(String) : [];

  return {
    id: String(id),
    question: String(questionText || ''),
    options,
    correct_answer: String(correct),
    explanation: String(explanation || ''),
    topic: String(topic),
    difficulty: String(difficulty),
    attachments
  };
}

run().catch(err=>{ console.error(err); process.exit(99); });
