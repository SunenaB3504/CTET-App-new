const fs = require('fs')
const path = require('path')

function fail(msg){
  console.error('PWA check failed:', msg)
  process.exit(1)
}

const appPublic = path.join(__dirname, '..', 'app', 'public')
const manifestPath = path.join(appPublic, 'manifest.webmanifest')
const swPath = path.join(appPublic, 'sw.js')

if(!fs.existsSync(manifestPath)) fail(`Missing manifest at ${manifestPath}`)
if(!fs.existsSync(swPath)) fail(`Missing service worker at ${swPath}`)

let manifest = null
try{
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
}catch(e){
  fail(`Failed to parse manifest: ${e.message}`)
}

if(!Array.isArray(manifest.icons)) fail('manifest.webmanifest must include an icons array')

for(const icon of manifest.icons){
  if(!icon.src) fail('Each icon entry must include a src')
  const iconPath = path.join(appPublic, icon.src.replace(/^\//, ''))
  if(!fs.existsSync(iconPath)) fail(`Icon referenced in manifest missing: ${icon.src}`)
}

console.log('PWA check OK: manifest, icons and sw.js present')
process.exit(0)
