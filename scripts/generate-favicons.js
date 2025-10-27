#!/usr/bin/env node
const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const fs = require('fs').promises;
const path = require('path');

const sizes = [16,32,48];
const svgPath = path.join(__dirname, '..', 'wireframes', 'favicon.svg');
const outDir = path.join(__dirname, '..', 'wireframes');

async function run(){
  try{
    console.log('Generating PNG favicons from', svgPath);
    const pngPaths = [];
    for(const s of sizes){
      const out = path.join(outDir, `favicon-${s}.png`);
      await sharp(svgPath).resize(s, s).png({quality:90}).toFile(out);
      console.log('Wrote', out);
      pngPaths.push(out);
    }

    console.log('Generating favicon.ico from PNGs');
    const icoBuf = await pngToIco(pngPaths);
    const icoPath = path.join(outDir, 'favicon.ico');
    await fs.writeFile(icoPath, icoBuf);
    console.log('Wrote', icoPath);
    console.log('Done.');
  }catch(err){
    console.error('Failed to generate favicons:', err);
    process.exit(1);
  }
}

run();
