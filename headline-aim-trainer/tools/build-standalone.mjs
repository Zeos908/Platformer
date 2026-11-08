// Builds dist/headline.html: one self-contained file with three.js and all game
// code inlined, so it runs by double-clicking it. No server or install needed.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  target: 'es2020',
  write: false,
});
// Keep the bundle from closing its own <script> tag early.
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let html = await readFile(path.join(root, 'index.html'), 'utf8');
const start = html.indexOf('<script type="importmap">');
const endTag = '<script type="module" src="./src/main.js"></script>';
const end = html.indexOf(endTag);
if (start < 0 || end < 0) throw new Error('Could not find the script tags in index.html');
html = `${html.slice(0, start)}<script type="module">\n${js}\n</script>${html.slice(end + endTag.length)}`;

await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/headline.html'), html);
console.log(`dist/headline.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
