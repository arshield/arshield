import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, concatBytes, utf8ToBytes } from '@noble/hashes/utils';
import { ARSHIELD_DERIVATION_MESSAGE } from '@arshield/core';

/** The exact personal_sign message the web app asks a wallet to sign. */
export const ARSHIELD_SIGN_MESSAGE = ARSHIELD_DERIVATION_MESSAGE;

export const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function personalSignDigest(message: string): Uint8Array {
  const body = utf8ToBytes(message);
  return keccak_256(concatBytes(utf8ToBytes(`\x19Ethereum Signed Message:\n${body.length}`), body));
}

/**
 * The signature lowercase and 0x-prefixed, its 65 bytes untouched. Browser and MCP must
 * derive keys from exactly these bytes — rewriting v (0/1 -> 27/28) would give a wallet
 * that returns 0/1 one identity in the browser and another over MCP.
 */
export function canonicalRecoveryByte(signatureHex: string): string {
  return `0x${(signatureHex.startsWith('0x') ? signatureHex.slice(2) : signatureHex).toLowerCase()}`;
}

/**
 * Recover the signer address from an EIP-191 personal_sign signature over the ArShield
 * derivation message. Returns null when the bytes are not a recoverable signature.
 * High-s signatures are refused: wallets only emit low-s, so a high-s copy is rewritten
 * bytes whose derived identity the wallet itself would never reproduce.
 */
export function recoverPersonalSigner(
  message: string,
  signatureHex: string,
): string | null {
  const raw = signatureHex.startsWith('0x') ? signatureHex.slice(2) : signatureHex;
  if (!/^[0-9a-fA-F]{130}$/.test(raw)) return null;
  const v = Number.parseInt(raw.slice(128), 16);
  const recovery = v >= 27 ? v - 27 : v;
  if (recovery !== 0 && recovery !== 1) return null;
  try {
    const sig = secp256k1.Signature.fromCompact(raw.slice(0, 128)).addRecoveryBit(recovery);
    if (sig.hasHighS()) return null;
    const publicKey = sig.recoverPublicKey(personalSignDigest(message)).toRawBytes(false);
    return '0x' + bytesToHex(keccak_256(publicKey.subarray(1)).subarray(-20));
  } catch {
    return null;
  }
}