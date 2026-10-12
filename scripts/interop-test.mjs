// Interop test: a container produced by the web core must open in the MCP server.
// Run from /home/gumilang/arshield-clone: node scripts/interop-test.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

// 1) Produce an .arshield container using the SAME core the web app uses.
const core = await import(path.join(root, 'packages/core/dist/index.js'));
const id = core.ephemeralIdentity();
const plaintext = new TextEncoder().encode('interop: web core -> MCP decrypt');
const container = await core.encryptFile(plaintext, 'interop.txt', id.publicKey, id.secretKey);
const b64url = Buffer.from(container).toString('base64url');
console.log('1) web core produced container:', container.length, 'bytes');

// 2) Feed it to the MCP server over stdio with the same identity's keys, decrypt.
const serverPath = path.join(root, 'packages/mcp/dist/server.js');
const child = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '', seq = 0; const pending = [];
child.stderr.on('data', d => { const t = d.toString().trim(); if (t) console.error('[mcp stderr]', t); });
child.stdout.on('data', d => { buf += d.toString(); try { frame(); } catch {} });
function frame() { let i; while ((i = buf.indexOf('\n')) !== -1) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { const m = JSON.parse(line); const done = pending.shift(); if (done) done(m); } catch {} } }
function send(o) { child.stdin.write(JSON.stringify(o) + '\n'); }
function rpc(method, params) { return new Promise(r => { pending.push(r); send({ jsonrpc: '2.0', id: ++seq, method, params }); }); }

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'interop', version: '1' } });

// The MCP server needs the key source. An ephemeral identity can't be re-derived,
// so instead we round-trip via a keyfile: wrap the SAME identity and pass it.
const kf = await core.wrapKeyfile(id, 'interop-pass', { t: 1, m: 1024, p: 1 });
const decrypt = await rpc('tools/call', {
  name: 'arshield_decrypt_file',
  arguments: { container_b64url: b64url, keyfile_json: JSON.stringify(kf), passphrase: 'interop-pass' },
});

if (decrypt.error) {
  console.log('2) MCP decrypt FAILED:', decrypt.error.message);
  child.kill();
  process.exit(1);
}
const out = JSON.parse(decrypt.result.content[0].text);
const got = Buffer.from(out.data_b64, 'base64').toString();
console.log('2) MCP decrypted:', JSON.stringify(got), '| filename:', out.filename);
console.log(got === 'interop: web core -> MCP decrypt' ? 'INTEROP: PASS ✓' : 'INTEROP: MISMATCH ✗');
child.kill();
process.exit(got === 'interop: web core -> MCP decrypt' ? 0 : 1);
