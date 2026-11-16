import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const files = ['index.html', 'main.mjs', 'engine.mjs', 'bridge.mjs', 'render-layout.mjs', 'style.css', 'assets/snake.svg', 'assets/barrier.svg', 'assets/bonus.svg', 'assets/fonts/dm-sans-latin.woff2', 'assets/fonts/space-grotesk-latin.woff2', 'assets/fonts/dmsans-OFL.txt', 'assets/fonts/spacegrotesk-OFL.txt'];
for (const file of files) await assertNoLinks(path.join(root, "web", file));
await assertNoLinks(path.join(root, 'LICENSE'));
const inputs = await Promise.all(files.map(async file => ({ file, bytes: await fs.readFile(path.join(root, 'web', file)) })));
inputs.push({ file: 'LICENSE', bytes: await fs.readFile(path.join(root, 'LICENSE')) });
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unsafe output path');
// Preserve local output: preflight the complete tree and reject unknown files or links.
const allowed = new Set(inputs.map(input => input.file.replaceAll('\\', '/')));
async function assertNoLinks(target) {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path outside repository');
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Linked build path refused'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
async function inspectOutput(directory) {
  let entries;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    const target = path.join(directory, entry.name), relative = path.relative(output, target).replaceAll('\\', '/');
    if (entry.isSymbolicLink()) throw new Error('Linked output refused');
    if (entry.isDirectory()) {
      if (![...allowed].some(file => file.startsWith(relative + '/'))) throw new Error('Unrecognized local output directory preserved: ' + relative);
      await inspectOutput(target);
    } else if (!entry.isFile() || !allowed.has(relative)) throw new Error('Unrecognized local output file preserved: ' + relative);
  }
}
await assertNoLinks(output);
for (const { file } of inputs) await assertNoLinks(path.join(output, file));
await inspectOutput(output);

for (const { file, bytes } of inputs) {
  const target = path.join(output, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}
console.log(JSON.stringify({ files: inputs.map(({ file, bytes }) => ({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })) }));
