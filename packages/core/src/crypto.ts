import { x25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa';
import { ml_kem768 } from '@noble/post-quantum/ml-kem';
import * as constants from './constants.js';
import { hkdfDerive } from './hkdf.js';
import type { ArShieldKeyPair, ArShieldPublicKey, ArShieldSecretKey } from './types.js';

const utf8 = new TextEncoder();

type EncapResult = {
  kemCtPq: Uint8Array;
  kemCtCls: Uint8Array;
  aesKey: Uint8Array;
};

/** Combine the post-quantum and classical shared secrets into one AES key. */
function combineSharedSecrets(ssPq: Uint8Array, ssCls: Uint8Array): Uint8Array {
  const ikm = new Uint8Array(ssPq.length + ssCls.length);
  ikm.set(ssPq, 0);
  ikm.set(ssCls, ssPq.length);
  return hkdfDerive(ikm, constants.HKDF_SALT_HYBRID, constants.HKDF_INFO_AES_KEY, constants.AES_KEY_LEN);
}

/**
 * Hybrid encapsulation: an attacker must break both ML-KEM-768 and X25519 to recover
 * the AES key. Returns the two ciphertexts plus the derived key.
 */
export function hybridEncapsulate(recipient: ArShieldPublicKey): EncapResult {
  const pq = ml_kem768.encapsulate(recipient.mlkem);
  const ephSk = randomBytes(constants.X25519_SK_LEN);
  const ephPk = x25519.getPublicKey(ephSk);
  const ssCls = x25519.getSharedSecret(ephSk, recipient.x25519);
  const aesKey = combineSharedSecrets(pq.sharedSecret, ssCls);
  return {
    kemCtPq: pq.cipherText,
    kemCtCls: ephPk,
    aesKey,
  };
}

/** Recover the AES key from the two ciphertexts and the recipient secret key. */
export function hybridDecapsulate(
  sk: ArShieldSecretKey,
  kemCtPq: Uint8Array,
  kemCtCls: Uint8Array,
): Uint8Array {
  const ssPq = ml_kem768.decapsulate(kemCtPq, sk.mlkem);
  const ssCls = x25519.getSharedSecret(sk.x25519, kemCtCls);
  return combineSharedSecrets(ssPq, ssCls);
}

/**
 * ML-DSA-65 sign/verify with context. @noble/post-quantum v0.4.0 ships .d.ts that
 * omits the context parameter (runtime supports it via getMessage(msg, ctx)); cast
 * through a local interface so callers keep a context-bound, type-safe wrapper.
 */
type MlDsaCtxInterface = {
  sign: (secretKey: Uint8Array, msg: Uint8Array, ctx?: Uint8Array) => Uint8Array;
  verify: (publicKey: Uint8Array, msg: Uint8Array, sig: Uint8Array, ctx?: Uint8Array) => boolean;
};

const mlDsaCtx = ml_dsa65 as unknown as MlDsaCtxInterface;

/** ML-DSA-65 signature, bound to a context string (domain separation). */
export function sign(secretKey: Uint8Array, msg: Uint8Array, context: string): Uint8Array {
  return mlDsaCtx.sign(secretKey, msg, utf8.encode(context));
}

/** Verify an ML-DSA-65 signature against its context. */
export function verify(
  publicKey: Uint8Array,
  msg: Uint8Array,
  signature: Uint8Array,
  context: string,
): boolean {
  return mlDsaCtx.verify(publicKey, msg, signature, utf8.encode(context));
}

export type { ArShieldKeyPair };
