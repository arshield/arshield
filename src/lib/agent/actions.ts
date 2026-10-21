/**
 * Action layer: turns a routed intent into a real crypto result.
 *
 * This is where the wallet guard is caught rather than shown. The crypto core
 * refuses smart-contract wallets by design — a 65-byte EOA signature is the only
 * thing that can be used as key material, and an EIP-1271 signature is not that.
 * That refusal is correct and stays. What changes here is what the user hears:
 * the raw guard message names a spec section, not a next step.
 *
 * So every failure that has a way forward is translated into one, and the way
 * forward is always the key file — the path that works with no wallet at all.
 */

import {
  decryptFile,
  encryptFile,
  type ArShieldKeyPair,
} from '@/lib/arshield';
import {
  buildSealPng,
  encryptMessage,
  type SealOutcome,
} from '@/lib/agent/message';
import type { FileRef } from '@/lib/agent/router';

/** A keypair plus where it came from, which decides what the UI says about it. */
export type Identity = {
  kind: 'wallet' | 'keyfile';
  label: string;
  kp: ArShieldKeyPair;
};

export type AgentResult =
  | { ok: true; kind: 'sealed'; name: string; bytes: Uint8Array; seal: Uint8Array; hash: string }
  | { ok: true; kind: 'opened'; name: string; bytes: Uint8Array }
  | { ok: true; kind: 'message'; url: string; chars: number }
  | { ok: false; kind: 'wallet-unsupported'; message: string; offer: 'keyfile' }
  | { ok: false; kind: 'error'; message: string };

/**
 * Is this failure the smart-contract-wallet guard?
 *
 * Matched on the guard's own wording rather than an error class: the message
 * crosses the core package boundary, so a thrown type would not survive, but the
 * text does. Kept narrow so a genuine malformed-signature error is not silently
 * reclassified as "use a key file", which would send the user down a path that
 * cannot fix their actual problem.
 */
export function isSmartWalletError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /smart-contract wallet|65-byte EOA signature/i.test(msg);
}

/** SHA-256, lowercase hex. Used for the seal's file_hash field. */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Seal a file. Produces the .arshield container and the verifiable seal PNG.
 *
 * The hash is taken over the container, not the plaintext, so /verify can check
 * what was actually downloaded against what the seal claims.
 */
export async function sealFile(file: FileRef, identity: Identity): Promise<AgentResult> {
  try {
    const container = await encryptFile(
      file.bytes,
      file.name,
      identity.kp.publicKey,
      identity.kp.secretKey,
    );
    const hash = await sha256Hex(container);
    const seal = await buildSealPng(hash, file.name);
    return { ok: true, kind: 'sealed', name: `${file.name}.arshield`, bytes: container, seal, hash };
  } catch (e) {
    if (isSmartWalletError(e)) {
      return {
        ok: false,
        kind: 'wallet-unsupported',
        message: 'This wallet signs with EIP-1271, so its signature cannot derive a key.',
        offer: 'keyfile',
      };
    }
    return { ok: false, kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Open an envelope.
 *
 * Failure here is deliberately vague in public and precise in private: "wrong key
 * or tampered" covers both, because telling an attacker which of the two it was
 * is a real leak. The container already distinguishes them internally.
 */
export async function openFile(file: FileRef, identity: Identity): Promise<AgentResult> {
  try {
    const out = await decryptFile(file.bytes, identity.kp.secretKey, identity.kp.publicKey);
    return { ok: true, kind: 'opened', name: out.filename, bytes: out.fileBytes };
  } catch (e) {
    if (isSmartWalletError(e)) {
      return {
        ok: false,
        kind: 'wallet-unsupported',
        message: 'This wallet signs with EIP-1271, so its signature cannot derive a key.',
        offer: 'keyfile',
      };
    }
    return {
      ok: false,
      kind: 'error',
      message: 'Could not open it. Either this is not the right key, or the file was altered.',
    };
  }
}

/**
 * Encrypt a short message and return a link that carries it.
 *
 * The link holds the ciphertext; the key stays with whoever holds the matching
 * secret. Nothing is stored server-side, so the link is the whole message.
 */
export async function sealMessage(text: string, identity: Identity): Promise<AgentResult> {
  if (text.trim().length === 0) {
    return { ok: false, kind: 'error', message: 'Nothing to seal — put the text in quotes.' };
  }
  try {
    const { url, chars }: SealOutcome = await encryptMessage(text, identity);
    return { ok: true, kind: 'message', url, chars };
  } catch (e) {
    if (isSmartWalletError(e)) {
      return {
        ok: false,
        kind: 'wallet-unsupported',
        message: 'This wallet signs with EIP-1271, so its signature cannot derive a key.',
        offer: 'keyfile',
      };
    }
    return { ok: false, kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
