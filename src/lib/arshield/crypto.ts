import { x25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import * as constants from './constants';
import { hkdfDerive } from './hkdf';
import type { ArShieldKeyPair, ArShieldPublicKey, ArShieldSecretKey } from './types';

const utf8 = new TextEncoder();

type EncapResult = {
  kemCtPq: Uint8Array;
  kemCtCls: Uint8Array;
  aesKey: Uint8Array;
};

/**
 * @noble/post-quantum v0.7.x API notes (differs from earlier versions):
 *   ml_dsa65.sign(msg, secretKey, { context })
 *   ml_dsa65.verify(msg, signature, publicKey, { context })
 * For portability across minor versions, adapt the call shapes here in one place.
 */
type MlDsaCtx = {
  sign: (msg: Uint8Array, secretKey: Uint8Array, opts: { context: Uint8Array }) => Uint8Array;
  verify: (sig: Uint8Array, msg: Uint8Array, publicKey: Uint8Array, opts: { context: Uint8Array }) => boolean;
};
const mlDsa = ml_dsa65 as unknown as MlDsaCtx;

function combineSharedSecrets(ssPq: Uint8Array, ssCls: Uint8Array): Uint8Array {
  const ikm = new Uint8Array(ssPq.length + ssCls.length);
  ikm.set(ssPq, 0);
  ikm.set(ssCls, ssPq.length);
  return hkdfDerive(ikm, constants.HKDF_SALT_HYBRID, constants.HKDF_INFO_AES_KEY, constants.AES_KEY_LEN);
}

/** Hybrid encapsulation: an attacker must break both ML-KEM-768 and X25519. */
export function hybridEncapsulate(recipient: ArShieldPublicKey): EncapResult {
  const pq = ml_kem768.encapsulate(recipient.mlkem);
  const ephSk = randomBytes(constants.X25519_SK_LEN);
  const ephPk = x25519.getPublicKey(ephSk);
  const ssCls = x25519.getSharedSecret(ephSk, recipient.x25519);
  const aesKey = combineSharedSecrets(pq.sharedSecret, ssCls);
  return { kemCtPq: pq.cipherText, kemCtCls: ephPk, aesKey };
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

/** ML-DSA-65 signature, bound to a context string (domain separation). */
export function sign(secretKey: Uint8Array, msg: Uint8Array, context: string): Uint8Array {
  return mlDsa.sign(msg, secretKey, { context: utf8.encode(context) });
}

/** Verify an ML-DSA-65 signature against its context. */
export function verify(
  publicKey: Uint8Array,
  msg: Uint8Array,
  signature: Uint8Array,
  context: string,
): boolean {
  return mlDsa.verify(signature, msg, publicKey, { context: utf8.encode(context) });
}

export type { ArShieldKeyPair };