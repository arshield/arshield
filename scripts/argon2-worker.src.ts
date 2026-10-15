/**
 * Argon2id key derivation, off the main thread. SOURCE for the bundled worker.
 *
 * Why this exists: Argon2id is deliberately expensive — 3 passes over 64MB — and
 * @noble/hashes runs it synchronously in JavaScript. On the main thread that is
 * a measured 5 second freeze: no paint, no input, and the "Wrapping…" spinner
 * stops spinning precisely when the user is staring at it wondering whether the
 * page has hung. The work has to happen somewhere; it should not be somewhere
 * that owns the UI.
 *
 * This file is bundled by scripts/build-worker.mjs into public/argon2-worker.js,
 * which is what the browser actually loads. It is not imported by the app
 * directly — a static export cannot resolve bare specifiers from a worker at
 * runtime, so the dependencies have to be inlined at build time.
 *
 * Progress: Argon2id makes `t` sequential passes over the memory block, so the
 * final state is the only one whose output is used. Reporting between passes
 * therefore leaks nothing about the derived key — it only says how much wall
 * clock is left.
 */

import { argon2id } from '@noble/hashes/argon2';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';

const utf8 = new TextEncoder();

type Req = {
  id: number;
  passphrase: string;
  salt: number[];
  t: number;
  m: number;
  p: number;
  dkLen: number;
  info: string;
};

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, passphrase, salt, t, m, p, dkLen, info } = e.data;

  try {
    const out = argon2id(utf8.encode(passphrase), Uint8Array.from(salt), { t, m, p, dkLen });

    // Pass boundaries are not exposed by @noble, so progress is reported by the
    // caller's timer instead. What this worker guarantees is only that the
    // expensive part is not on the UI thread.
    const wrapKey = hkdf(sha256, out, undefined, utf8.encode(info), 32);
    self.postMessage({ id, type: 'done', wrapKey: Array.from(wrapKey) });
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
