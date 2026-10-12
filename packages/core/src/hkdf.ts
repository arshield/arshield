import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';

const utf8 = new TextEncoder();

/** HKDF-SHA256 with UTF-8 encoded salt/info. Single combiner for the whole core. */
export function hkdfDerive(
  ikm: Uint8Array,
  salt: string,
  info: string,
  length: number,
): Uint8Array {
  return hkdf(sha256, ikm, utf8.encode(salt), utf8.encode(info), length);
}
