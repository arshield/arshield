// Verify #5: encrypt-to-recipient round trip using the message-url key format.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const core = await import(path.join(root, 'packages/core/dist/index.js'));

const enc = new TextEncoder();

// Recipient (Alice) generates a keypair; Bob encrypts a message to her pubkey.
const alice = core.ephemeralIdentity();
const bob = core.ephemeralIdentity();

// Bob serializes the recipient key the way the composer would (parsePublicKey input).
const alicePubB64 = core.encodePublicKey(alice.publicKey);
// Bob parses it back (this is what the composer does before encrypting).
const parsed = core.parsePublicKey(alicePubB64);

// Round-trip the parsed key -> encrypt to it -> decrypt with Alice's secret.
const plaintext = enc.encode('secret for alice only');
const blob = await core.encryptFile(plaintext, 'msg.txt', parsed, bob.secretKey);
const out = await core.decryptFile(blob, alice.secretKey, bob.publicKey);
console.log('recipient encrypted -> alice decrypts:', new TextDecoder().decode(out.fileBytes));

// Negative: Bob's own key cannot open it (only the recipient's key can).
let rejected = false;
try {
  await core.decryptFile(blob, bob.secretKey, bob.publicKey);
} catch {
  rejected = true;
}
console.log('bob cannot open (expected):', rejected);

// parsePublicKey must reject garbage.
let bad = false;
try {
  core.parsePublicKey('not-a-key');
} catch {
  bad = true;
}
console.log('parsePublicKey rejects junk:', bad);

const ok =
  new TextDecoder().decode(out.fileBytes) === 'secret for alice only' && rejected && bad;
console.log(ok ? 'RECIPIENT-ENCRYPT: PASS ✓' : 'RECIPIENT-ENCRYPT: FAIL ✗');
process.exit(ok ? 0 : 1);