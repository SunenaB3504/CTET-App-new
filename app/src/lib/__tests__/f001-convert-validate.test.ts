import { spawnSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

describe('F-001 converter + validator integration', () => {
  const repoRoot = join(__dirname, '..', '..', '..', '..');
  const fixtureSrc = join(repoRoot, 'scripts', 'test-fixtures');
  const outDir = join(repoRoot, 'scripts', 'test-output');

  it('converter normalizes top-level array and validator accepts converted output', () => {
    // run converter pointing at our small fixture folder
    const conv = spawnSync(process.execPath, [join('scripts','convert-add-paper-metadata.js'), '--src', fixtureSrc, '--out', outDir, '--index', join(outDir,'index')], { cwd: repoRoot, encoding: 'utf8' });
    // converter should have exited normally
    expect(conv.error).toBeUndefined();
    // find converted file under outDir
    const paper2Dir = join(outDir, 'Paper_2');
    const files = existsSync(paper2Dir) ? readdirSync(paper2Dir).filter(f => f.endsWith('.json')) : [];
    expect(files.length).toBeGreaterThan(0);

    const outFile = join(paper2Dir, files[0]);
    expect(existsSync(outFile)).toBe(true);

    // run validator on the converted file
    const val = spawnSync(process.execPath, [join('scripts','validate-json.js'), outFile, '--json'], { cwd: repoRoot, encoding: 'utf8' });
    expect(val.stdout).toBeTruthy();
    // parse JSON output and confirm file validated
    const parsed = JSON.parse(String(val.stdout));
    expect(parsed.summary.failed).toBe(0);
  });
});
