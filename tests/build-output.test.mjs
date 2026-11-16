import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builder = "tools/build-web.mjs";
async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nd-game-build-'));
  const source = await fs.readFile(path.join(root, builder), 'utf8');
  const match = source.match(/const files = (\[[^;]+\]);/);
  assert.ok(match);
  const files = JSON.parse(match[1].replaceAll("'", '"'));
  await fs.mkdir(path.join(directory, 'tools'), { recursive: true });
  await fs.writeFile(path.join(directory, builder), source);
  for (const file of files) {
    const target = path.join(directory, "web", file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(root, "web", file), target);
  }
  await fs.copyFile(path.join(root, 'LICENSE'), path.join(directory, 'LICENSE'));
  return directory;
}
async function cleanup(directory) {
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('nd-game-build-'));
  await fs.rm(directory, { recursive: true, force: true });
}
const run = directory => spawnSync(process.execPath, [builder], { cwd: directory, encoding: 'utf8' });
test('build refuses unknown local output before replacing generated files', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir).status, 0);
    const original = await fs.readFile(path.join(dir, 'dist/index.html'));
    await fs.writeFile(path.join(dir, 'dist/keep-local.txt'), 'local content');
    await fs.writeFile(path.join(dir, "web", 'index.html'), 'new source');
    const result = run(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unrecognized local output file preserved/);
    assert.deepEqual(await fs.readFile(path.join(dir, 'dist/index.html')), original);
    assert.equal(await fs.readFile(path.join(dir, 'dist/keep-local.txt'), 'utf8'), 'local content');
  } finally { await cleanup(dir); }
});
test('build refuses a linked output tree and preserves its destination', async () => {
  const dir = await fixture(), external = path.join(dir, 'external');
  try {
    await fs.mkdir(external);
    await fs.writeFile(path.join(external, 'keep.txt'), 'untouched');
    await fs.symlink(external, path.join(dir, 'dist'), 'junction');
    const result = run(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Linked build path refused/);
    assert.equal(await fs.readFile(path.join(external, 'keep.txt'), 'utf8'), 'untouched');
  } finally {
    await fs.unlink(path.join(dir, 'dist')).catch(e => { if (e.code !== 'ENOENT') throw e; });
    await cleanup(dir);
  }
});
