/**
 * Run Argon2id in a worker, with a progress tick and a main-thread fallback.
 *
 * The fallback matters: if the worker fails to load — an old browser, a strict
 * CSP, a bundler that moved the file — derivation must still work. It will
 * block for a few seconds, which is what the app did before, but a slow
 * derivation beats a broken one. The UI is told which path ran so it can skip
 * the progress bar when there is nothing to report.
 */

type Progress = (fraction: number) => void;

let worker: Worker | null = null;
let seq = 0;

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker('/argon2-worker.js');
    return worker;
  } catch {
    return null;
  }
}

export type KdfResult = { wrapKey: Uint8Array; usedWorker: boolean };

export function argon2WrapKey(
  passphrase: string,
  salt: Uint8Array,
  opts: { t: number; m: number; p: number; dkLen: number; info: string },
  onProgress?: Progress,
): Promise<KdfResult> {
  const w = getWorker();
  if (!w) return fallback(passphrase, salt, opts, onProgress);

  const id = ++seq;

  return new Promise<KdfResult>((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.id !== id) return;
      if (d.type === 'done') {
        cleanup();
        resolve({ wrapKey: Uint8Array.from(d.wrapKey), usedWorker: true });
      } else if (d.type === 'error') {
        cleanup();
        // A worker-side failure is a real error (bad params), not a load
        // problem — retrying on the main thread would just fail the same way.
        reject(new Error(d.message));
      }
    };
    const onError = () => {
      cleanup();
      // Load/exec failure: fall back rather than surface a dead end.
      fallback(passphrase, salt, opts, onProgress).then(resolve, reject);
    };
    const cleanup = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      if (ticker) clearInterval(ticker);
    };

    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);

    /*
     * @noble does not expose pass boundaries, so the bar is driven by elapsed
     * time against an expected duration rather than by real progress. It is
     * capped short of full: a bar that reaches 100% and then sits there is worse
     * than one that is honestly still moving. The expected value is tuned to the
     * measured cost of these params on a mid-range machine.
     */
    let ticker: ReturnType<typeof setInterval> | null = null;
    if (onProgress) {
      const expectedMs = 4200;
      const started = Date.now();
      ticker = setInterval(() => {
        const f = Math.min(0.92, (Date.now() - started) / expectedMs);
        onProgress(f);
      }, 90);
    }

    w.postMessage({
      id,
      passphrase,
      salt: Array.from(salt),
      ...opts,
    });
  });
}

async function fallback(
  passphrase: string,
  salt: Uint8Array,
  opts: { t: number; m: number; p: number; dkLen: number; info: string },
  onProgress?: Progress,
): Promise<KdfResult> {
  const { argon2id } = await import('@noble/hashes/argon2');
  const { hkdf } = await import('@noble/hashes/hkdf');
  const { sha256 } = await import('@noble/hashes/sha2');
  // Let the caller paint the "working" state before the freeze begins.
  await new Promise((r) => setTimeout(r, 0));
  onProgress?.(0.5);
  const out = argon2id(new TextEncoder().encode(passphrase), salt, opts);
  const wrapKey = hkdf(sha256, out, undefined, new TextEncoder().encode(opts.info), 32);
  onProgress?.(1);
  return { wrapKey, usedWorker: false };
}
