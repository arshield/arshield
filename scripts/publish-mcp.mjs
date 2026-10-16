#!/usr/bin/env node
/**
 * Publish @arshield/mcp to npm.
 *
 * Runs the checks that matter before a release, because the failure modes here
 * are quiet: a tarball missing its bundle installs fine and then crashes on the
 * user's machine, and a stale dist publishes old code under a new version.
 *
 *   node scripts/publish-mcp.mjs           verify only, no publish
 *   node scripts/publish-mcp.mjs --publish actually publish
 *   node scripts/publish-mcp.mjs --publish --tag beta   publish under a tag
 *
 * What it will not do for you: `npm login`. Run that yourself first.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pkgDir = join(root, 'packages/mcp');

const args = process.argv.slice(2);
const doPublish = args.includes('--publish');
const tagIndex = args.indexOf('--tag');
const tag = tagIndex >= 0 ? args[tagIndex + 1] : null;

const run = (cmd, opts = {}) =>
  execSync(cmd, { cwd: opts.cwd ?? root, stdio: opts.quiet ? 'pipe' : 'inherit', ...opts });

function ok(m) { console.log(`  ✓ ${m}`); }
function warn(m) { console.log(`  ⚠  ${m}`); }
function fail(m) { console.error(`\n  ✗ ${m}\n`); process.exit(1); }

console.log('\n=== 1. prerequisites ===');
try {
  const who = execSync('npm whoami', { stdio: 'pipe' }).toString().trim();
  ok(`logged in as ${who}`);
} catch {
  fail('not logged in to npm. Run `npm login` first, then re-run this.');
}

const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
ok(`package: ${pkg.name}@${pkg.version}`);
if (pkg.private === true) fail('package.json has "private": true — npm will refuse to publish.');

// The version must not already exist; npm rejects it and the error is unhelpful.
try {
  const existing = execSync(`npm view ${pkg.name}@${pkg.version} version`, { stdio: 'pipe' })
    .toString().trim();
  if (existing) fail(`${pkg.name}@${pkg.version} is already published. Bump the version.`);
} catch {
  ok('version is not yet published');
}

console.log('\n=== 2. no workspace references leak into the published package ===');
// A `file:` dependency cannot be resolved from the registry. If one survives,
// `npx` installs a package that crashes immediately.
const deps = { ...(pkg.dependencies ?? {}) };
const fileDeps = Object.entries(deps).filter(([, v]) => String(v).startsWith('file:'));
if (fileDeps.length) {
  fail(
    `unresolvable dependencies: ${fileDeps.map(([k]) => k).join(', ')}\n` +
    `    These are workspace links. Either bundle them (see tsup.config.ts\n` +
    `    noExternal) or publish them separately and pin a version.`,
  );
}
ok('no file: dependencies');

console.log('\n=== 3. build ===');
run('npm run mcp:build');
ok('core + mcp built');

const distFile = join(pkgDir, 'dist/server.js');
if (!existsSync(distFile)) fail('dist/server.js missing after build.');
const bundle = readFileSync(distFile, 'utf8');
ok(`dist/server.js present (${(bundle.length / 1024).toFixed(0)} kB)`);

console.log('\n=== 4. bundle is self-contained ===');
if (/from\s+["']@arshield\/core["']/.test(bundle)) {
  fail(
    'the bundle still imports @arshield/core, which is a workspace package and\n' +
    '    is not on npm. Set noExternal in tsup.config.ts so it is inlined.',
  );
}
ok('@arshield/core inlined, not imported');
for (const b of ['crypto', 'zod', '@modelcontextprotocol/sdk']) {
  if (new RegExp(`from\\s+["']${b}`).test(bundle)) ok(`external kept: ${b}`);
}
if (!bundle.startsWith('#!/usr/bin/env node')) {
  fail('the shebang is missing, so `npx arshield-mcp` will not execute.');
}
ok('shebang present');

console.log('\n=== 5. the built server actually runs ===');
try {
  const out = execSync(
    `printf '%s\\n' ` +
    `'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"v","version":"1"}}}' ` +
    `'{"jsonrpc":"2.0","method":"notifications/initialized"}' ` +
    `'{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' ` +
    `| timeout 20 node dist/server.js`,
    { cwd: pkgDir, shell: '/bin/bash', stdio: 'pipe' },
  ).toString();

  const lines = out.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } });
  const init = lines.find((l) => l?.id === 1);
  const tools = lines.find((l) => l?.id === 2);
  if (!init) fail('the server did not answer initialize.');
  ok(`initialize ok — ${init.result.serverInfo.name} ${init.result.serverInfo.version}`);
  const n = tools?.result?.tools?.length ?? 0;
  if (n === 0) fail('tools/list returned nothing.');
  ok(`tools/list returned ${n} tools`);
} catch (e) {
  fail(`the built server did not run:\n${e.message}`);
}

console.log('\n=== 6. tarball contents ===');
const packOut = execSync('npm pack --dry-run --json', { cwd: pkgDir, stdio: 'pipe' }).toString();
const info = JSON.parse(packOut)[0];
const names = info.files.map((f) => f.path);
ok(`${info.entryCount} files, ${(info.size / 1024).toFixed(1)} kB packed`);
names.forEach((n) => console.log(`      ${n}`));

for (const required of ['dist/server.js', 'package.json', 'README.md', 'LICENSE']) {
  if (!names.includes(required)) warn(`missing from the tarball: ${required}`);
}
if (names.some((n) => n.startsWith('src/'))) warn('source files are being shipped — check the files field.');

if (!doPublish) {
  console.log('\n  All checks passed. Nothing was published.\n');
  console.log(`  To publish:\n    node scripts/publish-mcp.mjs --publish${tag ? ` --tag ${tag}` : ''}\n`);
  process.exit(0);
}

console.log('\n=== 7. publish ===');
const tagArg = tag ? ` --tag ${tag}` : '';
run(`npm publish --access public${tagArg}`, { cwd: pkgDir });

console.log('\n  Published. Verify with:\n');
console.log(`    npm view ${pkg.name} version`);
console.log(`    npx -y ${pkg.name}\n`);
