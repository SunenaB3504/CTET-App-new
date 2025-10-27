#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function run(){
  try{
    const repoRoot = path.join(__dirname, '..');
    const srcDir = path.join(repoRoot, 'wireframes');
    const destDir = path.join(repoRoot, 'app', 'public');
    const files = ['favicon.svg','favicon-16.png','favicon-32.png','favicon-48.png','favicon.ico'];
    for(const f of files){
      const src = path.join(srcDir, f);
      const dest = path.join(destDir, f);
      try{
        await fs.copyFile(src, dest);
        console.log('Copied', src, '->', dest);
      }catch(e){
        console.warn('Missing source file, skipping:', src);
      }
    }
    console.log('Copy finished.');
  }catch(err){
    console.error('Failed to copy favicons:', err);
    process.exit(1);
  }
}

run();
