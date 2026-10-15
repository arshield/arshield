#!/usr/bin/env node
/**
 * Set the $arshield contract and verify the tier wiring end to end.
 *
 * Run this on launch with the address. It writes .env.local, rebuilds, and then
 * proves the value actually reached the bundle and that both live endpoints
 * answer — the two things that silently fail and produce "always Free" instead
 * of an error.
 *
 *   node scripts/set-token.mjs 0x<address> [fallbackUsd]
 *
 * Verification is the point. A tier gate that quietly resolves everyone to Free
 * looks identical to one that is working and nobody holds the token yet, so the
 * checks below are what distinguish the two.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ENV_FILE = join(root, '.env.local');

const address = (process.argv[2] ?? '').trim().toLowerCase();
const fallback = (process.argv[3] ?? '').trim();

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

if (!/^0x[0-9a-f]{40}$/.test(address)) {
  fail(`not a valid contract address: "${address}"\n    expected 0x followed by 40 hex characters`);
}

console.log(`\n=== 1. write .env.local ===`);
const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
const kept = existing
  .split('\n')
  .filter((l) => l.trim() && !/^NEXT_PUBLIC_ARSHIELD_(CONTRACT|USD_FALLBACK)=/.test(l.trim()));

const lines = [...kept, `NEXT_PUBLIC_ARSHIELD_CONTRACT=${address}`];
if (fallback && Number(fallback) > 0) {
  lines.push(`NEXT_PUBLIC_ARSHIELD_USD_FALLBACK=${Number(fallback)}`);
}
writeFileSync(ENV_FILE, lines.join('\n') + '\n');
ok(`wrote ${ENV_FILE}`);
lines.forEach((l) => console.log(`      ${l}`));

console.log(`\n=== 2. check the token actually answers on ARC ===`);
const RPC = 'https://rpc.mainnet.arc.io';
try {
  const chain = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    signal: AbortSignal.timeout(8000),
  }).then((r) => r.json());
  const id = parseInt(chain.result, 16);
  id === 5042 ? ok(`chainId ${id} (ARC)`) : fail(`chainId is ${id}, expected 5042`);
} catch (e) {
  fail(`ARC RPC unreachable: ${e.message}`);
}

// decimals() — selector 0x313ce567
try {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_call',
      params: [{ to: address, data: '0x313ce567' }, 'latest'],
    }),
    signal: AbortSignal.timeout(8000),
  }).then((r) => r.json());

  if (res.error || !res.result || res.result === '0x') {
    fail(`decimals() did not answer — is ${address} an ERC-20 on ARC?`);
  }
  const decimals = parseInt(res.result, 16);
  ok(`decimals() = ${decimals}`);
  if (decimals !== 18) {
    console.log(`\n  ⚠  src/lib/tiers.ts assumes 18 decimals (TOKEN_DECIMALS).`);
    console.log(`     This token uses ${decimals}. Change the constant or every balance`);
    console.log(`     will be off by a factor of 10^${Math.abs(18 - decimals)}.\n`);
  }
} catch (e) {
  fail(`decimals() read failed: ${e.message}`);
}

// symbol() — selector 0x95d89b41, just to confirm it is the right token
try {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_call',
      params: [{ to: address, data: '0x95d89b41' }, 'latest'],
    }),
    signal: AbortSignal.timeout(8000),
  }).then((r) => r.json());
  if (res.result && res.result !== '0x') {
    // ABI-encoded string: offset, length, then the bytes.
    const hex = res.result.slice(2);
    const len = parseInt(hex.slice(64, 128), 16);
    const sym = Buffer.from(hex.slice(128, 128 + len * 2), 'hex').toString('utf8');
    ok(`symbol() = "${sym}"`);
  }
} catch {
  console.log(`      (symbol() did not answer — not fatal)`);
}

console.log(`\n=== 3. check the price feed covers it ===`);
try {
  const url = `https://api.peach.ag/arc/v1/arc/market_price?base_symbol_address=${address}&quote_coin_address=usd&market=birdeye`;
  const json = await fetch(url, { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  const price = json?.data?.prices?.[0]?.price;
  if (price == null) {
    console.log(`  ⚠  Peach has no price for this token yet.`);
    console.log(`     The tier will fall back to ${fallback || 'Free'} until it is listed.`);
  } else {
    ok(`price = $${Number(price)}`);
    const tiers = [{ n: 'Holder', u: 20 }, { n: 'Pro', u: 100 }, { n: 'Whale', u: 1000 }];
    tiers.forEach((t) =>
      console.log(`      ${t.n.padEnd(7)} $${String(t.u).padEnd(5)} = ${Math.ceil(t.u / Number(price)).toLocaleString()} tokens`),
    );
  }
} catch (e) {
  console.log(`  ⚠  price check failed: ${e.message}`);
}

console.log(`\n=== 4. build ===`);
try {
  execSync('npm run build', { stdio: 'pipe', env: { ...process.env } });
  ok('build succeeded');
} catch (e) {
  fail(`build failed:\n${e.stdout?.toString().slice(-800) ?? e.message}`);
}

console.log(`\n=== 5. prove the value reached the bundle ===`);
const { readdirSync } = await import('node:fs');
const chunkDir = join(root, 'out/_next/static/chunks');
const js = readdirSync(chunkDir).filter((f) => f.endsWith('.js'));
let nameSeen = false;
let valueSeen = false;
for (const f of js) {
  const src = readFileSync(join(chunkDir, f), 'utf8');
  if (src.includes('NEXT_PUBLIC_ARSHIELD_CONTRACT')) nameSeen = true;
  if (src.includes(address)) valueSeen = true;
}

if (nameSeen) {
  fail(
    `the variable NAME is still in the bundle, so it was not inlined.\n` +
    `    The app would read undefined at runtime and every wallet would show Free.\n` +
    `    Check how it is referenced in src/lib/tiers.ts — the bundler must be able\n` +
    `    to substitute it directly, not via a bound alias of process.env.`,
  );
}
ok('variable name absent (it was substituted, not left as a lookup)');
valueSeen ? ok('contract address present in the bundle') : fail('address not found in bundle');

console.log(`\n  Ready. Deploy with:\n`);
console.log(`    wrangler pages deploy out --project-name=arshield --branch=master --commit-dirty=true\n`);
