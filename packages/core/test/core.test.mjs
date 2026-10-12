// ArShield core — end-to-end round-trip tests.
// Run: node --test test/*.test.mjs  (after `npm run build`)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAGIC,
  ML_DSA_PK_LEN,
  ML_DSA_SK_LEN,
  ML_KEM_PK_LEN,
  ML_KEM_SK_LEN,
  encryptFile,
  decryptFile,
  identityFromWalletSignature,
  ephemeralIdentity,
  wrapKeyfile,
  unwrapKeyfile,
  sign,
  verify,
  verifyX402,
  signX402,
  buildMessageUrl,
  parseMessageUrl,
  ARSHIELD_DERIVATION_MESSAGE,
  SignatureError,
  CorruptFileError,
  InvalidPassphraseError,
} from '../dist/index.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

// A deterministic 65-byte EOA signature (as a wallet would return from personal_sign).
// Shape-valid: 0x + 130 hex chars, recovery byte 0x1b (27).
const WALLET_SIG =
  '0x' +
  'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0' +
  '1f2e3d4c5b6a79880716253443526170a1b2c3d4e5f60718293a4b5c6d7e8f90' +
  '1b';

test('wallet-derived identity is deterministic and correctly sized', () => {
  const a = identityFromWalletSignature(WALLET_SIG);
  const b = identityFromWalletSignature(WALLET_SIG);
  assert.equal(a.publicKey.mlkem.length, ML_KEM_PK_LEN);
  assert.equal(a.secretKey.mlkem.length, ML_KEM_SK_LEN);
  assert.equal(a.publicKey.mldsa.length, ML_DSA_PK_LEN);
  assert.equal(a.secretKey.mldsa.length, ML_DSA_SK_LEN);
  assert.deepEqual(a.publicKey.mlkem, b.publicKey.mlkem, 'same sig -> same ML-KEM key');
  assert.deepEqual(a.publicKey.x25519, b.publicKey.x25519, 'same sig -> same X25519 key');
  assert.deepEqual(a.secretKey.mldsa, b.secretKey.mldsa, 'same sig -> same ML-DSA key');
});

test('rejects malformed wallet signatures', () => {
  assert.throws(() => identityFromWalletSignature('0xdeadbeef'), /65-byte EOA signature/);
  assert.throws(() => identityFromWalletSignature('0x' + 'ab'.repeat(64)), /65-byte EOA signature/);
});

test('file encrypt -> decrypt round trip returns identical bytes', async () => {
  const id = ephemeralIdentity();
  const payload = enc.encode('ArShield: data can\'t run. #postquantum');
  const container = await encryptFile(payload, 'note.txt', id.publicKey, id.secretKey);

  assert.equal(container[0], MAGIC[0]);
  assert.equal(dec.decode(container.slice(0, 5)), 'ARSHD');

  const out = await decryptFile(container, id.secretKey, id.publicKey);
  assert.equal(out.filename, 'note.txt');
  assert.equal(BigInt(out.fileBytes.length), out.originalSize);
  assert.deepEqual(out.fileBytes, payload);
});

test('empty file and binary bytes round trip', async () => {
  const id = ephemeralIdentity();
  const empty = new Uint8Array(0);
  const c1 = await encryptFile(empty, 'empty.bin', id.publicKey, id.secretKey);
  const o1 = await decryptFile(c1, id.secretKey, id.publicKey);
  assert.equal(o1.fileBytes.length, 0);
  assert.equal(o1.filename, 'empty.bin');

  const bin = new Uint8Array([0, 1, 2, 253, 254, 255, 0, 42]);
  const c2 = await encryptFile(bin, 'x.bin', id.publicKey, id.secretKey);
  const o2 = await decryptFile(c2, id.secretKey, id.publicKey);
  assert.deepEqual(o2.fileBytes, bin);
});

test('tampered ciphertext is rejected (signature fails)', async () => {
  const id = ephemeralIdentity();
  const container = await encryptFile(enc.encode('secret'), 'a.txt', id.publicKey, id.secretKey);
  const tampered = container.slice();
  tampered[tampered.length - 40] ^= 0xff; // flip a byte inside the AEAD payload
  await assert.rejects(() => decryptFile(tampered, id.secretKey, id.publicKey), SignatureError);
});

test('tampered header is rejected', async () => {
  const id = ephemeralIdentity();
  const container = await encryptFile(enc.encode('secret'), 'a.txt', id.publicKey, id.secretKey);
  const tampered = container.slice();
  tampered[6] ^= 0x01; // flip a version bit
  await assert.rejects(() => decryptFile(tampered, id.secretKey, id.publicKey), CorruptFileError);
});

test('wrong signer is rejected', async () => {
  const id = ephemeralIdentity();
  const other = ephemeralIdentity();
  const container = await encryptFile(enc.encode('secret'), 'a.txt', id.publicKey, id.secretKey);
  await assert.rejects(() => decryptFile(container, id.secretKey, other.publicKey), SignatureError);
});

test('keyfile wrap -> unwrap restores the same keypair (fast params)', async () => {
  const id = ephemeralIdentity();
  const kf = await wrapKeyfile(id, 'correct horse battery staple', { t: 1, m: 1024, p: 1 });
  assert.equal(kf.v, 1);
  assert.equal(kf.kdf, 'argon2id');
  const back = await unwrapKeyfile(kf, 'correct horse battery staple');
  assert.deepEqual(back.secretKey.mlkem, id.secretKey.mlkem);
  assert.deepEqual(back.publicKey.mldsa, id.publicKey.mldsa);
});

test('wrong keyfile passphrase throws InvalidPassphraseError', async () => {
  const id = ephemeralIdentity();
  const kf = await wrapKeyfile(id, 'rightpass', { t: 1, m: 1024, p: 1 });
  await assert.rejects(() => unwrapKeyfile(kf, 'wrongpass'), InvalidPassphraseError);
});

test('message URL round trip with ephemeral embed', async () => {
  const id = ephemeralIdentity();
  const blob = await encryptFile(enc.encode('hello agent'), 'msg.txt', id.publicKey, id.secretKey);
  const url = buildMessageUrl(blob, id.publicKey, { sk: id.secretKey, pk: id.publicKey });
  assert.ok(url.startsWith('https://arc-shield.xyz/m/#v1.'));

  const parsed = parseMessageUrl(url);
  assert.deepEqual(parsed.blob, blob);
  assert.ok(parsed.ephemeralSecret, 'ephemeral secret embedded');
  const out = await decryptFile(parsed.blob, parsed.ephemeralSecret, parsed.signerPublic);
  assert.equal(dec.decode(out.fileBytes), 'hello agent');
});

test('message URL without embed parses to 2 segments', () => {
  const id = ephemeralIdentity();
  const url = buildMessageUrl(enc.encode('x'), id.publicKey);
  const parsed = parseMessageUrl(url);
  assert.equal(parsed.ephemeralSecret, undefined);
});

test('x402 signatures are context-bound (cannot cross-use file signatures)', () => {
  const id = ephemeralIdentity();
  const payload = enc.encode('{"amount":"1.00 USDC"}');
  const sig = signX402(id.secretKey.mldsa, payload);
  assert.equal(verifyX402(id.publicKey.mldsa, payload, sig), true);
  // A file-context signature must not verify in the x402 context.
  const fileSig = sign(id.secretKey.mldsa, payload, 'arshield-v1-file');
  assert.equal(verifyX402(id.publicKey.mldsa, payload, fileSig), false);
  // ...and verify() in file context must reject an x402 signature.
  assert.equal(verify(id.publicKey.mldsa, payload, sig, 'arshield-v1-file'), false);
});

test('derivation message is the ArShield domain, not a leftover', () => {
  assert.match(ARSHIELD_DERIVATION_MESSAGE, /Domain: arc-shield\.xyz/);
  assert.doesNotMatch(ARSHIELD_DERIVATION_MESSAGE, /quantsafe/i);
});
