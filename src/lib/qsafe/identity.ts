import * as constants from './constants';
import { deriveSeedsFromRandomness, deriveSeedsFromWalletSignature, assertEoaSignatureShape } from './kdf';
import { keysFromSeeds } from './keys';
import { sign, verify } from './crypto';
import type { QuantSafeKeyPair } from './types';

export function identityFromWalletSignature(signatureHex: string): QuantSafeKeyPair {
  assertEoaSignatureShape(signatureHex);
  return keysFromSeeds(deriveSeedsFromWalletSignature(signatureHex));
}

export function ephemeralIdentity(): QuantSafeKeyPair {
  return keysFromSeeds(deriveSeedsFromRandomness());
}

export function signX402(secretKey: Uint8Array, payload: Uint8Array): Uint8Array {
  return sign(secretKey, payload, constants.X402_CONTEXT);
}

export function verifyX402(publicKey: Uint8Array, payload: Uint8Array, signature: Uint8Array): boolean {
  return verify(publicKey, payload, signature, constants.X402_CONTEXT);
}

export { QSAFE_DERIVATION_MESSAGE } from './constants';