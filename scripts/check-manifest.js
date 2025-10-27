#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readManifest(){
  const idxDir = path.resolve('data','index');
  if(!fs.existsSync(idxDir)){
    console.error('Index directory not found:', idxDir);
    process.exit(2);
  }
  // prefer manifest-latest.json, else pick the newest manifest-*.json
  const latestPath = path.join(idxDir,'manifest-latest.json');
  let manifestFile = null;
  if(fs.existsSync(latestPath)) manifestFile = latestPath;
  else{
    const files = fs.readdirSync(idxDir).filter(f=>f.startsWith('manifest-') && f.endsWith('.json'));
    if(files.length===0){ console.error('No manifest files found in', idxDir); process.exit(2); }
    files.sort(); manifestFile = path.join(idxDir, files[files.length-1]);
  }
  return JSON.parse(fs.readFileSync(manifestFile,'utf8'));
}

function check(){
  const manifest = readManifest();
  const errors = [];
  const seenIds = new Map();
  if(!manifest.files || !Array.isArray(manifest.files)){
    console.error('Manifest missing files array'); process.exit(2);
  }
  for(const f of manifest.files){
    const out = path.resolve(f.output);
    if(!fs.existsSync(out)) errors.push(`Missing output file: ${out}`);
    else{
      try{
        const payload = JSON.parse(fs.readFileSync(out,'utf8'));
        const qs = Array.isArray(payload.questions) ? payload.questions : [];
        if(qs.length !== f.questionCount) errors.push(`Question count mismatch for ${out}: manifest=${f.questionCount} file=${qs.length}`);
        for(const q of qs){
          const id = q && q.id ? String(q.id) : null;
          if(!id) { errors.push(`Missing id in ${out}`); continue; }
          if(seenIds.has(id)){
            const prev = seenIds.get(id);
            errors.push(`Duplicate ID ${id} found in ${prev} and ${out}`);
          } else seenIds.set(id, out);
        }
      }catch(e){ errors.push(`Invalid JSON in ${out}: ${e.message}`); }
    }
  }
  if(errors.length){
    console.error('Manifest checks failed:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('Manifest sanity check: OK');
}

check();
