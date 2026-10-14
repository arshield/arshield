import * as constants from './constants';
import { CorruptFileError } from './types';
import type { ArShieldContainer } from './types';

/**
 * Binary layout of a .arshield container:
 *
 *   [ MAGIC(5) | version u16 | algoId u16 | kemCtPq(1088) | kemCtCls(32)
 *     | nonce(12) | aeadLen u64 | aeadPayload(aeadLen) | sigLen u16 | signature(sigLen) ]
 *
 * Everything up to and including aeadLen is the "header". The header is used as AES-GCM
 * additional data AND is covered by the ML-DSA signature, so flipping any header byte
 * makes both the tag and the signature fail.
 */

const HEADER_FIXED_LEN =
  constants.MAGIC_LEN +
  2 + // version
  2 + // algoId
  constants.ML_KEM_CT_LEN +
  constants.X25519_PK_LEN +
  constants.NONCE_LEN +
  8; // aeadLen

export type HeaderInput = {
  version: number;
  algoId: number;
  kemCtPq: Uint8Array;
  kemCtCls: Uint8Array;
  nonce: Uint8Array;
  aeadPayloadLen: bigint;
};

/** Serialize the header, which doubles as the AES-GCM additional data. */
export function buildHeaderAad(container: HeaderInput): Uint8Array {
  const out = new Uint8Array(HEADER_FIXED_LEN);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let o = 0;
  out.set(constants.MAGIC, o);
  o += constants.MAGIC_LEN;
  view.setUint16(o, container.version, true);
  o += 2;
  view.setUint16(o, container.algoId, true);
  o += 2;
  out.set(container.kemCtPq, o);
  o += constants.ML_KEM_CT_LEN;
  out.set(container.kemCtCls, o);
  o += constants.X25519_PK_LEN;
  out.set(container.nonce, o);
  o += constants.NONCE_LEN;
  view.setBigUint64(o, container.aeadPayloadLen, true);
  return out;
}

/** Encode a container into the on-disk .arshield byte string. */
export function encode(container: Omit<ArShieldContainer, 'version' | 'algoId'> & {
  version: number;
  algoId: number;
}): Uint8Array {
  if (container.kemCtPq.length !== constants.ML_KEM_CT_LEN) {
    throw new Error(`KEM PQ ciphertext must be ${constants.ML_KEM_CT_LEN} bytes`);
  }
  if (container.kemCtCls.length !== constants.X25519_PK_LEN) {
    throw new Error(`KEM classical ciphertext must be ${constants.X25519_PK_LEN} bytes`);
  }
  if (container.nonce.length !== constants.NONCE_LEN) {
    throw new Error(`Nonce must be ${constants.NONCE_LEN} bytes`);
  }
  if (container.signature.length > 0xffff) {
    throw new Error('Signature too long (>64KB)');
  }
  const header = buildHeaderAad({
    version: container.version,
    algoId: container.algoId,
    kemCtPq: container.kemCtPq,
    kemCtCls: container.kemCtCls,
    nonce: container.nonce,
    aeadPayloadLen: BigInt(container.aeadPayload.length),
  });
  const total = header.length + container.aeadPayload.length + 2 + container.signature.length;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let o = 0;
  out.set(header, o);
  o += header.length;
  out.set(container.aeadPayload, o);
  o += container.aeadPayload.length;
  view.setUint16(o, container.signature.length, true);
  o += 2;
  out.set(container.signature, o);
  return out;
}

/** Parse and validate a .arshield byte string. */
export function decode(bytes: Uint8Array): ArShieldContainer {
  if (bytes.length < HEADER_FIXED_LEN + 2) {
    throw new CorruptFileError('Input too short for .arshield header');
  }
  for (let i = 0; i < constants.MAGIC_LEN; i++) {
    if (bytes[i] !== constants.MAGIC[i]) {
      throw new CorruptFileError('Bad magic bytes (not a .arshield file)');
    }
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = constants.MAGIC_LEN;
  const version = view.getUint16(o, true);
  o += 2;
  if (version !== constants.VERSION) {
    throw new CorruptFileError(`Unsupported version ${version} (this build expects ${constants.VERSION})`);
  }
  const algoId = view.getUint16(o, true);
  o += 2;
  if (algoId !== constants.ALGO_ID.HYBRID_V1) {
    throw new CorruptFileError(`Unknown algorithm suite 0x${algoId.toString(16)}`);
  }
  const kemCtPq = bytes.slice(o, o + constants.ML_KEM_CT_LEN);
  o += constants.ML_KEM_CT_LEN;
  const kemCtCls = bytes.slice(o, o + constants.X25519_PK_LEN);
  o += constants.X25519_PK_LEN;
  const nonce = bytes.slice(o, o + constants.NONCE_LEN);
  o += constants.NONCE_LEN;
  const aeadLenBig = view.getBigUint64(o, true);
  o += 8;
  if (aeadLenBig > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new CorruptFileError('AEAD payload length exceeds safe range');
  }
  const aeadLen = Number(aeadLenBig);
  if (bytes.length < o + aeadLen + 2) {
    throw new CorruptFileError('Truncated AEAD payload');
  }
  const aeadPayload = bytes.slice(o, o + aeadLen);
  o += aeadLen;
  const sigLen = view.getUint16(o, true);
  o += 2;
  if (bytes.length < o + sigLen) {
    throw new CorruptFileError('Truncated signature');
  }
  const signature = bytes.slice(o, o + sigLen);
  o += sigLen;
  if (o !== bytes.length) {
    throw new CorruptFileError(`Trailing bytes after signature (${bytes.length - o} bytes)`);
  }
  return { version, algoId, kemCtPq, kemCtCls, nonce, aeadPayload, signature };
}
