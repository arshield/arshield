import { randomBytes } from '@noble/hashes/utils';
import * as constants from './constants';
import { hkdfDerive } from './hkdf';
import type { ArShieldSeeds } from './types';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd length');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('Invalid hex string');
    }
    out[i] = byte;
  }
  return out;
}

/** Stretch an IKM into the three independent seeds ArShield needs. */
export function deriveSeedsFromIkm(ikm: Uint8Array): ArShieldSeeds {
  if (ikm.length === 0) {
    throw new Error('IKM must be non-empty');
  }
  return {
    mlkem: hkdfDerive(ikm, constants.HKDF_SALT, constants.HKDF_INFO_MLKEM_SEED, constants.ML_KEM_SEED_LEN),
    x25519: hkdfDerive(ikm, constants.HKDF_SALT, constants.HKDF_INFO_X25519_SEED, constants.X25519_SK_LEN),
    mldsa: hkdfDerive(ikm, constants.HKDF_SALT, constants.HKDF_INFO_MLDSA_SEED, constants.ML_DSA_SEED_LEN),
  };
}

const EOA_SIG_HEX_RE = /^0x[0-9a-fA-F]{130}$/;

/**
 * A wallet signature used as key material must be a plain 65-byte EOA signature.
 * Smart-contract wallets return different bytes and are not supported for derivation.
 */
export function assertEoaSignatureShape(signatureHex: string): void {
  if (!EOA_SIG_HEX_RE.test(signatureHex)) {
    throw new Error(
      'Wallet signature must be a 65-byte EOA signature (0x + 130 hex chars). ' +
        'Smart-contract wallet signatures are not supported for key derivation.',
    );
  }
}

/**
 * Derive seeds from an EIP-191 personal_sign signature. The signature bytes are used
 * exactly as the wallet returned them, recovery byte included — normalizing them would
 * give one identity in the browser and a different one over MCP.
 */
export function deriveSeedsFromWalletSignature(signatureHex: string): ArShieldSeeds {
  assertEoaSignatureShape(signatureHex);
  return deriveSeedsFromIkm(hexToBytes(signatureHex));
}

/** Fresh random seeds for an ephemeral (one-off) identity. */
export function deriveSeedsFromRandomness(): ArShieldSeeds {
  return {
    mlkem: randomBytes(constants.ML_KEM_SEED_LEN),
    x25519: randomBytes(constants.X25519_SK_LEN),
    mldsa: randomBytes(constants.ML_DSA_SEED_LEN),
  };
}
