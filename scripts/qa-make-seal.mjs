// QA: build a real Quantum Seal PNG (same code path as app-workspace) so the
// /verify page can be exercised with a genuine artefact.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { ephemeralIdentity, encryptFile } from '../packages/core/dist/index.js';

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const off = y * (1 + width * 3);
    raw[off] = 0;
    for (let x = 0; x < width; x++) {
      const p = off + 1 + x * 3;
      raw[p] = rgb[0]; raw[p + 1] = rgb[1]; raw[p + 2] = rgb[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function injectText(pngBuf, keyword, text) {
  const data = Buffer.from(keyword + '\0' + text, 'latin1');
  const c = chunk('tEXt', data);
  const insertAt = 8 + 25; // after signature + IHDR
  return Buffer.concat([pngBuf.subarray(0, insertAt), c, pngBuf.subarray(insertAt)]);
}

const id = ephemeralIdentity();
const blob = await encryptFile(new TextEncoder().encode('seal QA payload'), 'sealed.txt', id.publicKey, id.secretKey);
const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', blob))]
  .map((b) => b.toString(16).padStart(2, '0')).join('');

const meta = JSON.stringify({
  version: 1,
  timestamp: new Date().toISOString(),
  algo: 'ML-KEM-768+X25519 / ML-DSA-65 / AES-256-GCM',
  file_hash: digest,
  chain: 'ARC (5042)',
});
const seal = injectText(png(720, 480, [10, 18, 32]), 'arshield', meta);
writeFileSync('/tmp/qa-seal.png', seal);
writeFileSync('/tmp/qa-digest.txt', digest);
console.log('seal png   :', seal.length, 'bytes -> /tmp/qa-seal.png');
console.log('file_hash  :', digest);
