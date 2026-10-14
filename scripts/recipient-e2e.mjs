// End-to-end proof of #5 (recipient encryption) using the exact library the
// /m page calls: encodePublicKey -> parsePublicKey -> encryptFile -> URL -> parse.
import {
  ephemeralIdentity,
  encodePublicKey,
  parsePublicKey,
  encryptFile,
  decryptFile,
  buildMessageUrl,
  parseMessageUrl,
} from '../packages/core/dist/index.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

const alice = ephemeralIdentity(); // recipient (has the secret key)
const bob = ephemeralIdentity();   // sender (ephemeral)

// 1) Alice shares her public key (what "Copy my public key" produces).
const alicePub = encodePublicKey(alice.publicKey);

// 2) Bob parses it and encrypts TO it, signing with his ephemeral key.
const recipient = parsePublicKey(alicePub);
const blob = await encryptFile(enc.encode('pesan untuk alice'), 'msg.txt', recipient, bob.secretKey);
const url = buildMessageUrl(blob, bob.publicKey); // no embed => recipient-only

// 3) URL shape: exactly 2 segments after prefix (blob + signer key, no secret).
const segs = url.split('#')[1].split('.');
const shapeOk = segs.length === 3 && !url.includes('.gey'); // v1 + blob + signerKey

// 4) Alice opens it with her own secret key.
const parsed = parseMessageUrl(url);
const out = await decryptFile(parsed.blob, alice.secretKey, parsed.signerPublic);
const aliceOk = dec.decode(out.fileBytes) === 'pesan untuk alice';

// 5) Bob (non-recipient) cannot open it.
let bobRejected = false;
try { await decryptFile(parsed.blob, bob.secretKey, parsed.signerPublic); } catch { bobRejected = true; }

console.log('url segments (v1 + blob + signer):', segs.length, '->', shapeOk ? 'OK' : 'BAD');
console.log('recipient decrypts:', aliceOk);
console.log('non-recipient rejected:', bobRejected);
const pass = shapeOk && aliceOk && bobRejected && !parsed.ephemeralSecret;
console.log(pass ? 'RECIPIENT-ONLY: PASS ✓' : 'RECIPIENT-ONLY: FAIL ✗');
process.exit(pass ? 0 : 1);