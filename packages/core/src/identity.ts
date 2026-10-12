import * as constants from './constants.js';
import { deriveSeedsFromRandomness, deriveSeedsFromWalletSignature, assertEoaSignatureShape } from './kdf.js';
import { keysFromSeeds } from './keys.js';
import { sign, verify } from './crypto.js';
import type { ArShieldKeyPair } from './types.js';

/** Convenience helpers that tie seed derivation + keygen + sign/verify together. */

/** Build a full identity from an EIP-191 wallet signature. */
export function identityFromWalletSignature(signatureHex: string): ArShieldKeyPair {
  assertEoaSignatureShape(signatureHex);
  return keysFromSeeds(deriveSeedsFromWalletSignature(signatureHex));
}

/** Build a fresh ephemeral identity from CSPRNG. */
export function ephemeralIdentity(): ArShieldKeyPair {
  return keysFromSeeds(deriveSeedsFromRandomness());
}

/** Sign a raw payload for the x402 payment context. */
export function signX402(secretKey: Uint8Array, payload: Uint8Array): Uint8Array {
  return sign(secretKey, payload, constants.X402_CONTEXT);
}

/** Verify an x402 signature. */
export function verifyX402(publicKey: Uint8Array, payload: Uint8Array, signature: Uint8Array): boolean {
  return verify(publicKey, payload, signature, constants.X402_CONTEXT);
}

export { ARSHIELD_DERIVATION_MESSAGE } from './constants.js';
