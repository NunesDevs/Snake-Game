import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const files = ['index.html', 'main.mjs', 'engine.mjs', 'bridge.mjs', 'style.css', 'assets/snake.svg', 'assets/fonts/dm-sans-latin.woff2', 'assets/fonts/space-grotesk-latin.woff2', 'assets/fonts/dmsans-OFL.txt', 'assets/fonts/spacegrotesk-OFL.txt'];
const inputs = await Promise.all(files.map(async file => ({ file, bytes: await fs.readFile(path.join(root, 'web', file)) })));
inputs.push({ file: 'LICENSE', bytes: await fs.readFile(path.join(root, 'LICENSE')) });
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unsafe output path');
await fs.rm(output, { recursive: true, force: true });
for (const { file, bytes } of inputs) {
  const target = path.join(output, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}
console.log(JSON.stringify({ files: inputs.map(({ file, bytes }) => ({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })) }));
