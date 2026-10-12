import * as constants from './constants';

/** WebCrypto AES-GCM. Runs in browsers and in Node 20+ (globalThis.crypto.subtle). */

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto SubtleCrypto is not available in this environment');
  }
  return subtle;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(u8.byteLength);
  new Uint8Array(buf).set(u8);
  return buf;
}

async function importAesKey(key: Uint8Array, usage: KeyUsage): Promise<CryptoKey> {
  if (key.length !== constants.AES_KEY_LEN) {
    throw new Error(`AES key must be ${constants.AES_KEY_LEN} bytes, got ${key.length}`);
  }
  return getSubtle().importKey('raw', toArrayBuffer(key), { name: 'AES-GCM' }, false, [usage]);
}

/** AES-256-GCM seal. `aad` is authenticated but not encrypted (used for the header). */
export async function aeadEncrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
): Promise<Uint8Array> {
  if (nonce.length !== constants.NONCE_LEN) {
    throw new Error(`Nonce must be ${constants.NONCE_LEN} bytes, got ${nonce.length}`);
  }
  const cryptoKey = await importAesKey(key, 'encrypt');
  const ct = await getSubtle().encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce), additionalData: toArrayBuffer(aad) },
    cryptoKey,
    toArrayBuffer(plaintext),
  );
  return new Uint8Array(ct);
}

/** AES-256-GCM open. Throws if the tag or AAD does not match. */
export async function aeadDecrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  aad: Uint8Array,
): Promise<Uint8Array> {
  if (nonce.length !== constants.NONCE_LEN) {
    throw new Error(`Nonce must be ${constants.NONCE_LEN} bytes, got ${nonce.length}`);
  }
  const cryptoKey = await importAesKey(key, 'decrypt');
  const pt = await getSubtle().decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce), additionalData: toArrayBuffer(aad) },
    cryptoKey,
    toArrayBuffer(ciphertext),
  );
  return new Uint8Array(pt);
}
