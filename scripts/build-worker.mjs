/**
 * Bundle the Argon2id worker.
 *
 * A static export serves public/ verbatim, and a worker loaded from there cannot
 * resolve bare specifiers like `@noble/hashes/argon2`. So the dependencies are
 * inlined at build time and the result is written into public/ as a classic
 * script the browser can just load.
 *
 * Run via `npm run build:worker`. Wired into `prebuild` so a normal `next build`
 * always produces a current worker — otherwise editing the worker source would
 * silently have no effect on the deployed site.
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const out = resolve('public/argon2-worker.js');
mkdirSync(dirname(out), { recursive: true });

await build({
  entryPoints: ['scripts/argon2-worker.src.ts'],
  outfile: out,
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  platform: 'browser',
  logLevel: 'error',
});

console.log(`worker bundled -> ${out}`);
