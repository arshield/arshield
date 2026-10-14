// End-to-end: encrypt in the web UI (wallet-derived keys) and decrypt through
// the MCP server using the same wallet signature. Proves the wallet connect
// flow produces keys the ecosystem can actually use.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const core = await import(path.join(root, 'packages/core/dist/index.js'));

const SIG = '0x1930df554f10ed626f42d3cee526ca0958c14a84d605f7c3eecf8ceda3f0fadc7cca82f2f30648fbe45191c63773403eaeb70fe524683d7b9a82a5c4eb0a63ed1c';
const ADDR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// 1) What the browser does after "Sign to derive": identity from signature.
const id = core.identityFromWalletSignature(SIG);
const plaintext = new TextEncoder().encode('wallet e2e: browser -> MCP');
const container = await core.encryptFile(plaintext, 'w.txt', id.publicKey, id.secretKey);
const b64url = Buffer.from(container).toString('base64url');
console.log('1) browser-side derived identity + encrypted', container.length, 'bytes');

// 2) MCP server decrypts with the SAME wallet signature (no key file).
const child = spawn('node', [path.join(root, 'packages/mcp/dist/server.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '', seq = 0; const pending = [];
child.stderr.on('data', (d) => { const t = d.toString().trim(); if (t) console.error('[mcp]', t); });
child.stdout.on('data', (d) => { buf += d.toString(); try { frame(); } catch {} });
function frame() { let i; while ((i = buf.indexOf('\n')) !== -1) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { const m = JSON.parse(line); const done = pending.shift(); if (done) done(m); } catch {} } }
function send(o) { child.stdin.write(JSON.stringify(o) + '\n'); }
function rpc(method, params) { return new Promise((r) => { pending.push(r); send({ jsonrpc: '2.0', id: ++seq, method, params }); }); }

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } });
const res = await rpc('tools/call', {
  name: 'arshield_decrypt_file',
  arguments: { container_b64url: b64url, signature_hex: SIG, address: ADDR },
});
if (res.error) { console.log('2) MCP decrypt FAILED:', res.error.message); child.kill(); process.exit(1); }
const out = JSON.parse(res.result.content[0].text);
const got = Buffer.from(out.data_b64, 'base64').toString();
console.log('2) MCP decrypted with wallet signature:', JSON.stringify(got));
const pass = got === 'wallet e2e: browser -> MCP';
console.log(pass ? 'WALLET-E2E: PASS ✓' : 'WALLET-E2E: FAIL ✗');
child.kill();
process.exit(pass ? 0 : 1);