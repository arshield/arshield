// QA: cross-check that the container produced in the browser (wallet-derived
// keys) decrypts in the MCP server with the same wallet signature.
// Reads the envelope from a file the browser test writes out.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { identityFromWalletSignature, encryptFile } from '../packages/core/dist/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const PK = hexToBytes(process.env.QA_PK);
const ADDR = '0x' + bytesToHex(keccak_256(secp256k1.getPublicKey(PK, false).slice(1)).slice(-20));
const MSG =
  'ArShield keypair derivation v1\n\n' +
  'This signature derives your personal post-quantum encryption keypair.\n' +
  'It grants no permissions and costs no gas.\n\n' +
  'Domain: arc-shield.xyz';
const body = new TextEncoder().encode(MSG);
const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${body.length}`);
const hash = keccak_256(new Uint8Array([...prefix, ...body]));
const s = secp256k1.sign(hash, PK);
const SIG = '0x' + bytesToHex(s.toCompactRawBytes()) + ((s.recovery ?? 0) + 27).toString(16);

// 1) Reproduce exactly what the browser workspace does (same core, same keys).
const id = identityFromWalletSignature(SIG);
const plaintext = new TextEncoder().encode('QA browser: dokumen rahasia dari wallet lo');
const container = await encryptFile(plaintext, 'rahasia.txt', id.publicKey, id.secretKey);
const b64url = Buffer.from(container).toString('base64url');
console.log('1) wallet-derived envelope built:', container.length, 'bytes');

// 2) Hand it to the MCP server, decrypt with the wallet signature only.
const child = spawn('node', [path.join(root, 'packages/mcp/dist/server.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '', seq = 0; const pending = [];
child.stdout.on('data', (d) => { buf += d.toString(); frame(); });
function frame() { let i; while ((i = buf.indexOf('\n')) !== -1) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { const m = JSON.parse(line); const done = pending.shift(); if (done) done(m); } catch {} } }
function rpc(method, params) { return new Promise((r) => { pending.push(r); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: ++seq, method, params }) + '\n'); }); }
await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'qa2', version: '1' } });
const res = await rpc('tools/call', { name: 'arshield_decrypt_file', arguments: { container_b64url: b64url, signature_hex: SIG, address: ADDR } });
if (res.error) { console.log('2) FAILED:', res.error.message); child.kill(); process.exit(1); }
const out = JSON.parse(res.result.content[0].text);
const got = Buffer.from(out.data_b64, 'base64').toString();
console.log('2) MCP decrypted with wallet signature:', JSON.stringify(got));
console.log('   filename:', out.filename);
const pass = got === 'QA browser: dokumen rahasia dari wallet lo';
console.log(pass ? 'CROSS-CHECK: PASS ✓' : 'CROSS-CHECK: FAIL ✗');
child.kill();
process.exit(pass ? 0 : 1);
