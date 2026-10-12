import { randomBytes } from '@noble/hashes/utils';
import { aeadDecrypt, aeadEncrypt } from './aead';
import { buildHeaderAad, decode, encode } from './codec';
import * as constants from './constants';
import { hybridDecapsulate, hybridEncapsulate, sign, verify } from './crypto';
import { SignatureError } from './types';
import type { QuantSafeKeyPair, QuantSafePublicKey, QuantSafeSecretKey } from './types';

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

/**
 * The AEAD plaintext packs the filename and the original size together with the file
 * bytes, so neither leaks in the cleartext header.
 *
 *   [ filenameLen u16 LE | filename UTF-8 | originalSize u64 LE | fileBytes ]
 */
function packAeadPlaintext(fileBytes: Uint8Array, filename: string): Uint8Array {
  const filenameBytes = utf8Encoder.encode(filename);
  if (filenameBytes.length > 0xffff) {
    throw new Error('Filename too long (>64KB UTF-8)');
  }
  const out = new Uint8Array(2 + filenameBytes.length + 8 + fileBytes.length);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let o = 0;
  view.setUint16(o, filenameBytes.length, true);
  o += 2;
  out.set(filenameBytes, o);
  o += filenameBytes.length;
  view.setBigUint64(o, BigInt(fileBytes.length), true);
  o += 8;
  out.set(fileBytes, o);
  return out;
}

function unpackAeadPlaintext(plaintext: Uint8Array): {
  fileBytes: Uint8Array;
  filename: string;
  originalSize: bigint;
} {
  if (plaintext.length < 10) {
    throw new SignatureError();
  }
  const view = new DataView(plaintext.buffer, plaintext.byteOffset, plaintext.byteLength);
  let o = 0;
  const filenameLen = view.getUint16(o, true);
  o += 2;
  if (plaintext.length < o + filenameLen + 8) {
    throw new SignatureError();
  }
  const filename = utf8Decoder.decode(plaintext.slice(o, o + filenameLen));
  o += filenameLen;
  const originalSize = view.getBigUint64(o, true);
  o += 8;
  const fileBytes = plaintext.slice(o);
  if (BigInt(fileBytes.length) !== originalSize) {
    throw new SignatureError();
  }
  return { fileBytes, filename, originalSize };
}

export type EncryptResult = {
  bytes: Uint8Array;
};

/** Seal bytes into an .qsafe container addressed to `recipient`, signed by `signer`. */
export async function encryptFile(
  fileBytes: Uint8Array,
  filename: string,
  recipient: QuantSafePublicKey,
  signer: QuantSafeSecretKey,
): Promise<Uint8Array> {
  const { kemCtPq, kemCtCls, aesKey } = hybridEncapsulate(recipient);
  const nonce = randomBytes(constants.NONCE_LEN);
  const aeadPlaintext = packAeadPlaintext(fileBytes, filename);
  const header = buildHeaderAad({
    version: constants.VERSION,
    algoId: constants.ALGO_ID.HYBRID_V1,
    kemCtPq,
    kemCtCls,
    nonce,
    aeadPayloadLen: BigInt(aeadPlaintext.length + 16),
  });
  const aeadPayload = await aeadEncrypt(aesKey, nonce, aeadPlaintext, header);
  const signedBytes = new Uint8Array(header.length + aeadPayload.length);
  signedBytes.set(header, 0);
  signedBytes.set(aeadPayload, header.length);
  const signature = sign(signer.mldsa, signedBytes, constants.FILE_CONTEXT);
  return encode({
    version: constants.VERSION,
    algoId: constants.ALGO_ID.HYBRID_V1,
    kemCtPq,
    kemCtCls,
    nonce,
    aeadPayload,
    signature,
  });
}

export type DecryptResult = {
  fileBytes: Uint8Array;
  filename: string;
  originalSize: bigint;
};

/**
 * Open an .qsafe container. Verifies the ML-DSA signature against `expectedSigner`
 * before touching the ciphertext, then decapsulates and decrypts.
 */
export async function decryptFile(
  qsafeBytes: Uint8Array,
  recipient: QuantSafeSecretKey,
  expectedSigner: { mldsa: Uint8Array },
): Promise<DecryptResult> {
  const container = decode(qsafeBytes);
  const header = buildHeaderAad({
    version: container.version,
    algoId: container.algoId,
    kemCtPq: container.kemCtPq,
    kemCtCls: container.kemCtCls,
    nonce: container.nonce,
    aeadPayloadLen: BigInt(container.aeadPayload.length),
  });
  const signedBytes = new Uint8Array(header.length + container.aeadPayload.length);
  signedBytes.set(header, 0);
  signedBytes.set(container.aeadPayload, header.length);
  if (!verify(expectedSigner.mldsa, signedBytes, container.signature, constants.FILE_CONTEXT)) {
    throw new SignatureError();
  }
  const aesKey = hybridDecapsulate(recipient, container.kemCtPq, container.kemCtCls);
  const plaintext = await aeadDecrypt(aesKey, container.nonce, container.aeadPayload, header);
  return unpackAeadPlaintext(plaintext);
}

export type { QuantSafeKeyPair };
