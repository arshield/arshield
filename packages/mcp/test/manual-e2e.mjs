import { spawn } from 'node:child_process';
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, concatBytes, utf8ToBytes } from '@noble/hashes/utils';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const msg =
  'ArShield keypair derivation v1\n\nThis signature derives your personal post-quantum encryption keypair.\nIt grants no permissions and costs no gas.\n\nDomain: arc-shield.xyz';
const body = utf8ToBytes(msg);
const digest = keccak_256(concatBytes(utf8ToBytes(`\x19Ethereum Signed Message:\n${body.length}`), body));
const priv = secp256k1.utils.randomPrivateKey();
const pub = secp256k1.getPublicKey(priv, false);
const address = '0x' + bytesToHex(keccak_256(pub.subarray(1)).subarray(-20));
const sigObj = secp256k1.sign(digest, priv);
const r = sigObj.r.toString(16).padStart(64, '0');
const s = sigObj.s.toString(16).padStart(64, '0');
const v = (27 + sigObj.recovery).toString(16);
const signatureHex = '0x' + r + s + v;
console.log('addr:', address);
console.log('sig :', signatureHex.slice(0, 20) + '...' + signatureHex.slice(-8));

const cwd = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(cwd, '..', 'dist', 'server.js');
const child = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
let seq = 0;
const pending = [];
child.stderr.on('data', (d) => {
  const t = d.toString().trim();
  if (t) console.error('[stderr]', t);
});
child.stdout.on('data', (d) => {
  buf += d.toString();
  try { processMsgs(); } catch { /* continue */ }
});
function processMsgs() {
  let i;
  while ((i = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    try {
      const m = JSON.parse(line);
      const done = pending.shift();
      if (done) done(m);
    } catch { /* continue */ }
  }
}
function send(o) { child.stdin.write(JSON.stringify(o) + '\n'); }
function rpc(method, params) {
  return new Promise((res) => {
    pending.push(res);
    send({ jsonrpc: '2.0', id: ++seq, method, params });
  });
}

(async () => {
  const kw = { signature_hex: signatureHex, address };
  const enc = await rpc('tools/call', {
    name: 'arshield_encrypt_file',
    arguments: { data_base64: Buffer.from('hello arshield via wallet').toString('base64'), filename: 'wallet-note.txt', ...kw },
  });
  const out1 = JSON.parse(enc.result.content[0].text);
  const dec = await rpc('tools/call', {
    name: 'arshield_decrypt_file',
    arguments: { container_b64url: out1.container_b64url, ...kw },
  });
  if (dec.error) { console.log('DEC ERROR:', dec.error.message); child.kill(); return; }
  const out2 = JSON.parse(dec.result.content[0].text);
  console.log('DEC OK:', out2.filename, '|', Buffer.from(out2.data_b64, 'base64').toString());

  const sm = await rpc('tools/call', {
    name: 'arshield_send_message',
    arguments: { text: 'selamat pagi agent', ...kw },
  });
  const out3 = JSON.parse(sm.result.content[0].text);
  console.log('MSG URL:', out3.url.slice(0, 64) + '...');
  const dm = await rpc('tools/call', {
    name: 'arshield_decrypt_message',
    arguments: { url: out3.url, ...kw },
  });
  const out4 = JSON.parse(dm.result.content[0].text);
  console.log('MSG DEC:', out4.text);

  const x = await rpc('tools/call', {
    name: 'arshield_sign_x402',
    arguments: { payload_base64: Buffer.from('{"amount":"1.00 USDC","to":"0xabc"}').toString('base64'), ...kw },
  });
  const ox = JSON.parse(x.result.content[0].text);
  console.log('X402 signed:', ox.verified, 'sig len:', ox.signature_b64url.length);
  child.kill();
})();