import * as constants from './constants.js';
import type { ArShieldPublicKey, ArShieldSecretKey } from './types.js';

/**
 * Shareable encrypted message URLs. The ciphertext lives in the URL #fragment, which
 * browsers never send to a server — so the host serves only a static page.
 *
 *   https://arc-shield.xyz/m/#v1.<blob>.<signerPublic>
 *
 * When the sender used an ephemeral identity, the secret key is embedded so the
 * recipient can decrypt without any prior setup:
 *
 *   https://arc-shield.xyz/m/#v1.<blob>.<signerPublic>.<embedSk>.<embedPk>
 */

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function b64urlDecode(s: string, segment: string): Uint8Array {
  try {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/') + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    throw new Error(`Malformed message URL: the ${segment} segment does not decode.`);
  }
}

const PUBLIC_KEY_LENGTHS = {
  mlkem: constants.ML_KEM_PK_LEN,
  x25519: constants.X25519_PK_LEN,
  mldsa: constants.ML_DSA_PK_LEN,
} as const;

const SECRET_KEY_LENGTHS = {
  mlkem: constants.ML_KEM_SK_LEN,
  x25519: constants.X25519_SK_LEN,
  mldsa: constants.ML_DSA_SK_LEN,
} as const;

type KeyShape<T> = { [K in keyof T]: Uint8Array };

function encodeKey(key: Record<string, Uint8Array>): string {
  const obj: Record<string, string> = {};
  for (const k of Object.keys(key)) obj[k] = b64urlEncode(key[k]);
  return b64urlEncode(new TextEncoder().encode(JSON.stringify(obj)));
}

function decodeKey(
  s: string,
  segment: string,
  lengths: Record<string, number>,
): Record<string, Uint8Array> {
  let obj: unknown;
  try {
    obj = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(b64urlDecode(s, segment)));
  } catch {
    throw new Error(`Malformed message URL: the ${segment} segment does not decode.`);
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error(`Malformed message URL: the ${segment} segment does not decode.`);
  }
  const fields = obj as Record<string, unknown>;
  const out: Record<string, Uint8Array> = {};
  for (const [name, length] of Object.entries(lengths)) {
    const value = fields[name];
    if (typeof value !== 'string') {
      throw new Error(`Malformed message URL: the ${segment} segment does not decode.`);
    }
    const bytes = b64urlDecode(value, segment);
    if (bytes.length !== length) {
      throw new Error(`Malformed message URL: the ${segment} segment does not decode.`);
    }
    out[name] = bytes;
  }
  return out;
}

export type ParsedMessageUrl = {
  blob: Uint8Array;
  signerPublic: ArShieldPublicKey;
  ephemeralSecret?: ArShieldSecretKey;
  ephemeralPublic?: ArShieldPublicKey;
};

export function buildMessageUrl(
  blob: Uint8Array,
  signerPublic: ArShieldPublicKey,
  embed?: { sk: ArShieldSecretKey; pk: ArShieldPublicKey },
): string {
  const parts = [
    constants.MESSAGE_URL_PREFIX + b64urlEncode(blob),
    encodeKey(signerPublic as unknown as KeyShape<ArShieldPublicKey>),
  ];
  if (embed) {
    parts.push(encodeKey(embed.sk as unknown as KeyShape<ArShieldSecretKey>));
    parts.push(encodeKey(embed.pk as unknown as KeyShape<ArShieldPublicKey>));
  }
  return constants.MESSAGE_URL_BASE + parts.join('.');
}

export function parseMessageUrl(url: string): ParsedMessageUrl {
  if (typeof url !== 'string') throw new Error('Malformed message URL: url must be a string.');
  const hashIdx = url.indexOf('#');
  if (hashIdx === -1) throw new Error('Malformed message URL: missing fragment');
  const frag = url.slice(hashIdx + 1);
  if (!frag.startsWith(constants.MESSAGE_URL_PREFIX)) {
    throw new Error('Unsupported message URL version');
  }
  const segs = frag.slice(constants.MESSAGE_URL_PREFIX.length).split('.');
  if (segs.length !== 2 && segs.length !== 4) {
    throw new Error('Malformed message URL');
  }
  const blob = b64urlDecode(segs[0], 'envelope');
  const signerPublic = decodeKey(segs[1], 'signer key', PUBLIC_KEY_LENGTHS) as unknown as ArShieldPublicKey;
  if (segs.length === 2) {
    return { blob, signerPublic };
  }
  const ephemeralSecret = decodeKey(segs[2], 'embedded secret key', SECRET_KEY_LENGTHS) as unknown as ArShieldSecretKey;
  const ephemeralPublic = decodeKey(segs[3], 'embedded public key', PUBLIC_KEY_LENGTHS) as unknown as ArShieldPublicKey;
  return { blob, signerPublic, ephemeralSecret, ephemeralPublic };
}

export { b64urlEncode, b64urlDecode };
