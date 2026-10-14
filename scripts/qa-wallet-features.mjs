// QA: full feature test using a real wallet signature.
// Local only. No transactions, no network writes.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const core = await import(path.join(root, 'packages/core/dist/index.js'));

const PK = hexToBytes(process.env.QA_PK);
const ADDR = '0x' + bytesToHex(keccak_256(secp256k1.getPublicKey(PK, false).slice(1)).slice(-20));

const DERIVE_MSG =
  'ArShield keypair derivation v1\n\n' +
  'This signature derives your personal post-quantum encryption keypair.\n' +
  'It grants no permissions and costs no gas.\n\n' +
  'Domain: arc-shield.xyz';

function eip191Sign(msg) {
  const body = new TextEncoder().encode(msg);
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${body.length}`);
  const hash = keccak_256(new Uint8Array([...prefix, ...body]));
  const sig = secp256k1.sign(hash, PK);
  return { hash, sig, hex: '0x' + bytesToHex(sig.toCompactRawBytes()) + ((sig.recovery ?? 0) + 27).toString(16) };
}

const { hex: SIG } = eip191Sign(DERIVE_MSG);
const results = [];
const ok = (name, cond, detail = '') => results.push({ name, pass: !!cond, detail });

// ---------- MCP bridge ----------
const child = spawn('node', [path.join(root, 'packages/mcp/dist/server.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '', seq = 0; const pending = [];
child.stderr.on('data', () => {});
child.stdout.on('data', (d) => { buf += d.toString(); frame(); });
function frame() { let i; while ((i = buf.indexOf('\n')) !== -1) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { const m = JSON.parse(line); const done = pending.shift(); if (done) done(m); } catch {} } }
function rpc(method, params) { return new Promise((r) => { pending.push(r); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: ++seq, method, params }) + '\n'); }); }
const call = async (name, args) => {
  const res = await rpc('tools/call', { name, arguments: args });
  if (res.error) throw new Error(res.error.message);
  return JSON.parse(res.result.content[0].text);
};

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'qa', version: '1' } });

// 1) encrypt with the wallet signature
const payload = Buffer.from('QA: wallet-signed envelope, no servers involved.').toString('base64');
const enc = await call('arshield_encrypt_file', {
  data_base64: payload, filename: 'qa.txt', signature_hex: SIG, address: ADDR,
});
ok('MCP encrypt_file (wallet sig)', !!enc.container_b64url, `${enc.container_b64url?.length} chars`);

// 2) decrypt with the same wallet signature
const dec = await call('arshield_decrypt_file', {
  container_b64url: enc.container_b64url, signature_hex: SIG, address: ADDR,
});
const got = Buffer.from(dec.data_b64, 'base64').toString();
ok('MCP decrypt_file round-trip', got === 'QA: wallet-signed envelope, no servers involved.', JSON.stringify(got.slice(0, 40)));

// 3) tampered container must fail (GCM auth)
const raw = Buffer.from(enc.container_b64url, 'base64');
raw[raw.length - 20] ^= 0xff;
let tamperRejected = false;
try { await call('arshield_decrypt_file', { container_b64url: raw.toString('base64url'), signature_hex: SIG, address: ADDR }); }
catch { tamperRejected = true; }
ok('tampered envelope rejected', tamperRejected);

// 4) wrong signer must fail
const otherPk = hexToBytes('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const otherAddr = '0x' + bytesToHex(keccak_256(secp256k1.getPublicKey(otherPk, false).slice(1)).slice(-20));
const otherBody = new TextEncoder().encode(DERIVE_MSG);
const otherPrefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${otherBody.length}`);
const otherHash = keccak_256(new Uint8Array([...otherPrefix, ...otherBody]));
const otherSigObj = secp256k1.sign(otherHash, otherPk);
const otherSig = '0x' + bytesToHex(otherSigObj.toCompactRawBytes()) + ((otherSigObj.recovery ?? 0) + 27).toString(16);
let wrongRejected = false;
try { await call('arshield_decrypt_file', { container_b64url: enc.container_b64url, signature_hex: otherSig, address: otherAddr }); }
catch { wrongRejected = true; }
ok('wrong-signer key rejected', wrongRejected);

// 5) send_message + decrypt_message
const sent = await call('arshield_send_message', { text: 'QA message via wallet', signature_hex: SIG, address: ADDR });
ok('MCP send_message', typeof sent.url === 'string' && sent.url.startsWith('https://arc-shield.xyz/m/#v1.'), `${sent.url?.length} chars`);

// 6) x402 signing
const signing = await call('arshield_sign_x402', {
  payload_base64: Buffer.from('x402 pledge 0.01 USDC').toString('base64'), signature_hex: SIG, address: ADDR,
});
ok('MCP sign_x402', signing.verified === true, `pubkey ${signing.public_key_mldsa_b64url?.slice(0, 12)}...`);

// 7) verify_seal with a real envelope digest
const digest = Buffer.from(await crypto.subtle.digest('SHA-256', Buffer.from(enc.container_b64url, 'base64url'))).toString('hex');
const seal = await call('arshield_verify_seal', {
  seal_metadata_json: JSON.stringify({ file_hash: digest }), envelope_sha256: digest,
});
ok('MCP verify_seal (digest match)', seal.hash_matches_envelope === true);

child.kill();

// 8) core-level: keyfile wrap/unwrap
const kp = core.ephemeralIdentity();
const kf = await core.wrapKeyfile(kp, 'qa-passphrase', { t: 1, m: 1024, p: 1 });
let unwrapped = null;
try { unwrapped = await core.unwrapKeyfile(kf, 'qa-passphrase'); } catch {}
ok('keyfile wrap/unwrap', unwrapped && unwrapped.publicKey.mlkem.length === 1184);
let badPass = false;
try { await core.unwrapKeyfile(kf, 'wrong-pass'); } catch { badPass = true; }
ok('keyfile wrong passphrase rejected', badPass);

// 9) recipient-only encryption
const alice = core.ephemeralIdentity();
const bob = core.ephemeralIdentity();
const alicePub = core.encodePublicKey(alice.publicKey);
const blob = await core.encryptFile(new TextEncoder().encode('for alice only'), 'a.txt', core.parsePublicKey(alicePub), bob.secretKey);
const u = core.buildMessageUrl(blob, bob.publicKey);
const parsed = core.parseMessageUrl(u);
const opened = await core.decryptFile(parsed.blob, alice.secretKey, parsed.signerPublic);
ok('recipient-only encrypt/decrypt', new TextDecoder().decode(opened.fileBytes) === 'for alice only');
ok('recipient URL has no embedded secret', !parsed.ephemeralSecret);

// ---------- report ----------
console.log('\n================ QA REPORT ================');
console.log('wallet  :', ADDR);
console.log('signature:', SIG.slice(0, 18) + '…' + SIG.slice(-10));
console.log('-------------------------------------------');
let allPass = true;
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
  if (!r.pass) allPass = false;
}
console.log('-------------------------------------------');
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
console.log(allPass ? 'OVERALL: PASS ✓' : 'OVERALL: FAIL ✗');
process.exit(allPass ? 0 : 1);
