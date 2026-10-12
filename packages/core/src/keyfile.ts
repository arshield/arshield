import { argon2idAsync } from '@noble/hashes/argon2';
import { randomBytes } from '@noble/hashes/utils';
import { aeadDecrypt, aeadEncrypt } from './aead.js';
import * as constants from './constants.js';
import { hkdfDerive } from './hkdf.js';
import { InvalidPassphraseError } from './types.js';
import type { ArShieldKeyPair, ArShieldKeyfile } from './types.js';

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();
const b64 = {
  encode(bytes: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  },
  decode(s: string): Uint8Array {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/') + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

function serializeKeypair(kp: ArShieldKeyPair): Uint8Array {
  return utf8Encoder.encode(
    JSON.stringify({
      pk: {
        mlkem: b64.encode(kp.publicKey.mlkem),
        x25519: b64.encode(kp.publicKey.x25519),
        mldsa: b64.encode(kp.publicKey.mldsa),
      },
      sk: {
        mlkem: b64.encode(kp.secretKey.mlkem),
        x25519: b64.encode(kp.secretKey.x25519),
        mldsa: b64.encode(kp.secretKey.mldsa),
      },
    }),
  );
}

function deserializeKeypair(bytes: Uint8Array): ArShieldKeyPair {
  const obj = JSON.parse(utf8Decoder.decode(bytes));
  return {
    publicKey: {
      mlkem: b64.decode(obj.pk.mlkem),
      x25519: b64.decode(obj.pk.x25519),
      mldsa: b64.decode(obj.pk.mldsa),
    },
    secretKey: {
      mlkem: b64.decode(obj.sk.mlkem),
      x25519: b64.decode(obj.sk.x25519),
      mldsa: b64.decode(obj.sk.mldsa),
    },
  };
}

async function deriveWrapKey(
  passphrase: string,
  salt: Uint8Array,
  params: { t: number; m: number; p: number },
): Promise<Uint8Array> {
  const argonOut = await argon2idAsync(utf8Encoder.encode(passphrase), salt, {
    t: params.t,
    m: params.m,
    p: params.p,
    dkLen: 32,
  });
  return hkdfDerive(
    argonOut,
    constants.HKDF_SALT,
    constants.HKDF_INFO_KEYFILE_WRAP,
    constants.AES_KEY_LEN,
  );
}

/** Wrap a keypair under a passphrase (Argon2id + AES-256-GCM) into a portable keyfile. */
export async function wrapKeyfile(
  kp: ArShieldKeyPair,
  passphrase: string,
  params: { t: number; m: number; p: number } = constants.ARGON2ID_PARAMS_PROD,
): Promise<ArShieldKeyfile> {
  if (!passphrase || passphrase.length === 0) {
    throw new Error('Passphrase must be non-empty');
  }
  const salt = randomBytes(constants.ARGON2ID_SALT_LEN);
  const nonce = randomBytes(constants.NONCE_LEN);
  const wrapKey = await deriveWrapKey(passphrase, salt, params);
  const wrapped = await aeadEncrypt(
    wrapKey,
    nonce,
    serializeKeypair(kp),
    utf8Encoder.encode(constants.KEYFILE_AAD),
  );
  return {
    v: 1,
    kdf: 'argon2id',
    kdfParams: { t: params.t, m: params.m, p: params.p },
    salt: b64.encode(salt),
    nonce: b64.encode(nonce),
    wrapped: b64.encode(wrapped),
  };
}

/** Open a keyfile with its passphrase. Wrong passphrase -> InvalidPassphraseError. */
export async function unwrapKeyfile(
  kf: ArShieldKeyfile,
  passphrase: string,
): Promise<ArShieldKeyPair> {
  if (kf.v !== 1) {
    throw new Error(`Unsupported keyfile version ${kf.v}`);
  }
  if (kf.kdf !== 'argon2id') {
    throw new Error(`Unsupported keyfile KDF ${kf.kdf}`);
  }
  const salt = b64.decode(kf.salt);
  const nonce = b64.decode(kf.nonce);
  const wrapped = b64.decode(kf.wrapped);
  const wrapKey = await deriveWrapKey(passphrase, salt, kf.kdfParams);
  let plaintext: Uint8Array;
  try {
    plaintext = await aeadDecrypt(
      wrapKey,
      nonce,
      wrapped,
      utf8Encoder.encode(constants.KEYFILE_AAD),
    );
  } catch {
    throw new InvalidPassphraseError();
  }
  return deserializeKeypair(plaintext);
}
