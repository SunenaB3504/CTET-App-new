#!/usr/bin/env node
/*
  scripts/validate-json.js
  Enhanced validator for CTET question JSON files.

  Features:
  - Accepts one or more file paths as positional args.
  - If no files are given, searches `data/converted` and `Docs/jsonData` recursively for JSON files.
  - Supports `--paper "Paper 1"` to only validate files for a given paper (paper inferred from payload or path).
  - Supports `--json` to emit machine-readable JSON results.
  - Validates against `scripts/question-schema.json` (AJV) and performs duplicate-ID checks.

  Exit codes:
  0 = all validated files passed
  1 = one or more files failed validation
  2 = no files found or other usage error

  Usage:
    node scripts/validate-json.js [--paper "Paper 1"] [--json] [file1.json file2.json ...]
*/

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

function logErr(){
  console.error.apply(console, arguments);
}

function usage(){
  console.log('Usage: node scripts/validate-json.js [--paper "Paper 1"] [--json] [file1.json file2.json ...]');
  console.log('If no files are provided, the script searches `data/converted` and `Docs/jsonData` for JSON files.');
}

function readJSON(filePath){
  try{
    const raw = fs.readFileSync(filePath,'utf8');
    return JSON.parse(raw);
  }catch(e){
    throw new Error('Invalid JSON: '+e.message);
  }
}

// simple argv parsing
const rawArgs = process.argv.slice(2);
const flags = { json:false, paper: null };
const files = [];
for(let i=0;i<rawArgs.length;i++){
  const a = rawArgs[i];
  if(a==='--json') { flags.json = true; continue; }
  if(a==='--paper') { flags.paper = rawArgs[i+1]; i++; continue; }
  if(a==='--help' || a==='-h'){ usage(); process.exit(0); }
  files.push(a);
}

const schemaPath = path.resolve(__dirname,'question-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath,'utf8'));
const ajv = new Ajv({allErrors:true, strict:false});
addFormats(ajv);
const validate = ajv.compile(schema);

// discover files if none provided
function findJSONFiles(){
  const roots = [path.resolve('data','converted'), path.resolve('Docs','jsonData')];
  const found = [];
  for(const r of roots){
    if(!fs.existsSync(r)) continue;
    const walk = (dir)=>{
      for(const name of fs.readdirSync(dir)){
        const full = path.join(dir,name);
        const st = fs.statSync(full);
        if(st.isDirectory()) walk(full);
        else if(st.isFile() && name.toLowerCase().endsWith('.json')) found.push(full);
      }
    };
    walk(r);
  }
  return found;
}

function inferPaperFromPath(p){
  const b = p.toLowerCase();
  if(b.includes('paper1') || b.includes('paper_1') || b.includes('paper 1')) return 'Paper 1';
  if(b.includes('paper2') || b.includes('paper_2') || b.includes('paper 2')) return 'Paper 2';
  // try parent folder names
  const parts = p.split(path.sep);
  for(const part of parts){
    const m = part.match(/paper\s*(\d)/i) || part.match(/paper(\d)/i);
    if(m) return `Paper ${m[1]}`;
  }
  return null;
}

const targetFiles = files.length? files.map(f=>path.resolve(f)) : findJSONFiles();
if(targetFiles.length===0){ logErr('No files found to validate.'); process.exit(2); }

const results = [];

for(const filePath of targetFiles){
  let fileResult = {file: path.relative(process.cwd(), filePath), ok: true, schemaValid: false, schemaErrors: [], duplicateOk: false, duplicateErrors: [], paper: null};
  try{
    const data = readJSON(filePath);
    // normalize arrays -> keep as-is but note missing metadata
    let payload = data;
    if(Array.isArray(data)){
      payload = { questions: data };
    }

    // determine paper for filter
    if(payload.paper) fileResult.paper = payload.paper;
    else fileResult.paper = inferPaperFromPath(filePath) || null;
    if(flags.paper && fileResult.paper && flags.paper !== fileResult.paper){
      // skip file
      fileResult.skipped = true;
      results.push(fileResult);
      continue;
    }

    // schema validation
    const valid = validate(payload);
    if(!valid){
      fileResult.schemaValid = false;
      fileResult.schemaErrors = (validate.errors||[]).map(e=>(`${e.instancePath} ${e.message}`));
      fileResult.ok = false;
    } else {
      fileResult.schemaValid = true;
    }

    // duplicate ID check (if questions present)
    if(payload && Array.isArray(payload.questions)){
      const ids = payload.questions.map(q=>q.id);
      const dup = ids.filter((v,i,a)=>v && a.indexOf(v)!==i);
      if(dup.length){
        fileResult.duplicateOk = false;
        fileResult.duplicateErrors = [...new Set(dup)];
        fileResult.ok = false;
      } else {
        fileResult.duplicateOk = true;
      }
    } else {
      fileResult.duplicateOk = false;
      fileResult.duplicateErrors = ['No questions array'];
      fileResult.ok = false;
    }

  } catch(e){
    fileResult.ok = false;
    fileResult.error = e.message;
  }
  results.push(fileResult);
}

// output
const failed = results.filter(r=>!r.skipped && !r.ok);
if(flags.json){
  const out = {generatedAt: new Date().toISOString(), summary: {files: results.length, failed: failed.length}, results};
  console.log(JSON.stringify(out, null, 2));
} else {
  for(const r of results){
    if(r.skipped){ console.log(`Skipping ${r.file} (paper filter)`); continue; }
    console.log(`--- Validating: ${r.file}`);
    if(r.error){ console.error('Error reading file:', r.error); continue; }
    if(r.schemaValid) console.log('Schema validation: OK');
    else { console.error('Schema validation failed:'); r.schemaErrors.forEach(e=> console.error(`  ${e}`)); }
    if(r.duplicateOk) console.log('Duplicate ID check: OK');
    else { console.error('Duplicate question IDs found or missing questions:', r.duplicateErrors.join(', ')); }
  }
}

process.exit(failed.length?1:0);
