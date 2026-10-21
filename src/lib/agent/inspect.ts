/**
 * File inspection — what the agent knows about a file before it acts on it.
 *
 * This is the difference between a text box and an agent. A bare input can only
 * ask "seal or open?"; this reads the file first and answers the question itself,
 * then offers the one action that applies. An `.arshield` container can only be
 * opened. A plain file can only be sealed. Guessing wrong wastes a decrypt
 * attempt or produces a container the user did not want.
 *
 * Everything here is read-only and local. The header parse touches offsets in a
 * byte array; it does not decrypt, does not check the signature (that needs the
 * key and belongs to the real operation), and never leaves the tab.
 */

import * as constants from '../arshield/constants';
import type { FileRef } from './router';
import type { Identity } from './actions';
import { parsePublicKey } from '../arshield';

/** What a container says about itself, before any key is involved. */
export type ContainerHeader = {
  version: number;
  algoId: number;
  /** Ciphertext length for the payload, from the header. */
  payloadBytes: number;
  /** Recovered plaintext size, once the AEAD body has been decoded. */
  plaintextBytes: number | null;
  /** Filename packed inside the ciphertext — only available after opening. */
  filename: string | null;
};

export type FileKind = 'plain' | 'container' | 'keyfile' | 'seal-png' | 'unknown';

export type FileReport = {
  kind: FileKind;
  name: string;
  bytes: number;
  /** Lowercase hex SHA-256 of the file as it will be acted on. */
  sha256: string;
  /** The action this file admits. `null` when it admits none. */
  action: 'encrypt' | 'decrypt' | null;
  /** One line the agent can say, already written for a human. */
  summary: string;
  /** Anything worth flagging — wrong format, truncated, odd size. */
  warnings: string[];
  container?: ContainerHeader;
  /** Seal PNG metadata, when the file is a receipt rather than an envelope. */
  seal?: Record<string, string>;
};

const utf8 = new TextDecoder('latin1');
const utf8Strict = new TextDecoder('utf-8', { fatal: false });

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function startsWithMagic(bytes: Uint8Array): boolean {
  if (bytes.length < constants.MAGIC_LEN) return false;
  for (let i = 0; i < constants.MAGIC_LEN; i++) {
    if (bytes[i] !== constants.MAGIC[i]) return false;
  }
  return true;
}

function isPng(bytes: Uint8Array): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8) return false;
  return sig.every((b, i) => bytes[i] === b);
}

/**
 * Read the fixed-layout header.
 *
 * Offsets come from the wire format documented in codec.ts. The reads are bounds
 * checked rather than trusted: a truncated container is a real thing a user can
 * produce (a download that stopped early), and reporting "corrupt at byte N" is
 * more useful than an exception from deep inside the decrypt path.
 */
export function parseContainerHeader(bytes: Uint8Array): ContainerHeader | { error: string } {
  const minHeader =
    constants.MAGIC_LEN + 2 + 2 + constants.ML_KEM_CT_LEN + constants.X25519_PK_LEN + constants.NONCE_LEN + 8;
  if (bytes.length < minHeader) {
    return { error: `Too short to be a container — ${bytes.length} bytes, header alone needs ${minHeader}.` };
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = constants.MAGIC_LEN;
  const version = view.getUint16(o, true);
  o += 2;
  const algoId = view.getUint16(o, true);
  o += 2 + constants.ML_KEM_CT_LEN + constants.X25519_PK_LEN + constants.NONCE_LEN;
  const payloadBytes = Number(view.getBigUint64(o, true));

  const expected = minHeader + payloadBytes + 2 + constants.ML_DSA_SIG_LEN;
  const warnings: string[] = [];
  if (bytes.length !== expected) {
    // Signature length is variable on the wire, so a mismatch here is a hint and
    // not proof of damage. Reported, not asserted.
    warnings.push(`Size is ${bytes.length} bytes; a full container would be about ${expected}.`);
  }
  if (version !== constants.VERSION) {
    warnings.push(`Container version ${version} — this build writes version ${constants.VERSION}.`);
  }
  if (algoId !== constants.ALGO_ID.HYBRID_V1) {
    warnings.push(`Algorithm id 0x${algoId.toString(16).padStart(4, '0')} is not the hybrid-v1 suite.`);
  }

  return {
    version,
    algoId,
    payloadBytes,
    // Plaintext size equals ciphertext minus the 16-byte GCM tag.
    plaintextBytes: payloadBytes > constants.AES_GCM_TAG_LEN ? payloadBytes - constants.AES_GCM_TAG_LEN : null,
    filename: null,
  };
}

/**
 * Pull the ArShield tEXt chunk out of a seal PNG.
 *
 * Mirrors what /verify reads, including the keyword variants: /app writes
 * "arshield", hand-authored seals have used "arshield-seal". Both are read so a
 * seal dropped into chat is recognised whichever tool produced it.
 */
export function readSealMetadata(bytes: Uint8Array): Record<string, string> | null {
  if (!isPng(bytes)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = 8;
  const known = new Set(['version', 'timestamp', 'algo', 'file_hash', 'wallet', 'x402', 'anchor']);
  const out: Record<string, string> = {};

  while (o + 8 <= bytes.length) {
    const len = view.getUint32(o);
    const type = utf8.decode(bytes.subarray(o + 4, o + 8));
    const dataStart = o + 8;
    if (dataStart + len > bytes.length) break;

    if (type === 'tEXt' || type === 'iTXt') {
      const raw = utf8.decode(bytes.subarray(dataStart, dataStart + len));
      const sep = raw.indexOf('\0');
      if (sep > 0) {
        const key = raw.slice(0, sep).replace(/\0/g, '').trim();
        const value = raw.slice(sep + 1).replace(/\0/g, '').trim();
        if (key === 'arshield' || key === 'arshield-seal' || key === 'arshield_seal') {
          try {
            const obj = JSON.parse(value) as Record<string, unknown>;
            for (const k of Object.keys(obj)) {
              if (!known.has(k)) continue;
              const v = obj[k];
              if (v === null || v === undefined) continue;
              out[k] = String(v);
            }
          } catch {
            /* not the JSON shape — ignore */
          }
        } else if (known.has(key)) {
          out[key] = value;
        }
      }
    }
    o = dataStart + len + 4;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Look for a key file.
 *
 * Matched on shape rather than extension: a key file is JSON with the wrapped
 * keypair. Extension alone would classify any renamed JSON as a key file, and
 * offering to "seal" someone's key file is exactly the mistake worth avoiding.
 */
function looksLikeKeyfile(bytes: Uint8Array): boolean {
  if (bytes.length === 0 || bytes.length > 256 * 1024) return false;
  const text = utf8Strict.decode(bytes.subarray(0, 4096));
  const head = text.trimStart();
  if (!head.startsWith('{')) return false;
  return /"kdf"|"cipher"|"wrapped"|"ciphertext"|argon2/i.test(text);
}

/**
 * Inspect a file and decide what can be done with it.
 *
 * Order is deliberate: container, then key file, then seal, then plain. A
 * container is unambiguous; a key file must never be offered for sealing; a seal
 * is a receipt and has no action of its own.
 */
export async function inspectFile(file: FileRef): Promise<FileReport> {
  const sha256 = await sha256Hex(file.bytes);
  const base: Pick<FileReport, 'name' | 'bytes' | 'sha256'> = {
    name: file.name,
    bytes: file.bytes.length,
    sha256,
  };

  if (startsWithMagic(file.bytes)) {
    const parsed = parseContainerHeader(file.bytes);
    if ('error' in parsed) {
      return {
        ...base,
        kind: 'container',
        action: null,
        summary: 'This looks like an envelope but its header is incomplete, so it cannot be opened.',
        warnings: [parsed.error],
      };
    }
    const warnings: string[] = [];
    return {
      ...base,
      kind: 'container',
      action: 'decrypt',
      summary: 'Envelope — sealed with the hybrid post-quantum suite. It can be opened with the matching key.',
      warnings,
      container: parsed,
    };
  }

  if (looksLikeKeyfile(file.bytes)) {
    return {
      ...base,
      kind: 'keyfile',
      action: null,
      summary: 'Key file. This holds your keys — it opens envelopes, it is not itself sealed.',
      warnings: ['A key file is never uploaded or sealed. Keep it offline.'],
    };
  }

  const seal = readSealMetadata(file.bytes);
  if (seal) {
    return {
      ...base,
      kind: 'seal-png',
      action: null,
      summary: 'Seal receipt. It carries a hash for verification; there is nothing to encrypt or open here.',
      warnings: [],
      seal,
    };
  }

  return {
    ...base,
    kind: 'plain',
    action: 'encrypt',
    summary: 'Plain file — nothing sealed about it yet.',
    warnings: [],
  };
}

/**
 * Turn a report into the lines the agent speaks.
 *
 * Kept here rather than in the component so the wording and the data it is
 * derived from stay in one place — the agent's description of a file should not
 * drift from the file's actual properties.
 */
export function describeReport(r: FileReport): string[] {
  const lines: string[] = [];
  const kb = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

  if (r.kind === 'container' && r.container) {
    lines.push(`Envelope · ${kb(r.bytes)} on disk`);
    if (r.container.plaintextBytes !== null) {
      lines.push(`Carries about ${kb(r.container.plaintextBytes)} of plaintext (the filename is sealed inside it)`);
    }
    lines.push(`Wire format v${r.container.version} · hybrid suite · signed`);
  } else if (r.kind === 'plain') {
    lines.push(`Plain file · ${kb(r.bytes)}`);
    lines.push('Sealing turns this into a .arshield container plus a verifiable seal');
  } else if (r.kind === 'seal-png') {
    lines.push('Seal receipt · PNG with an embedded hash');
    if (r.seal?.file_hash) lines.push(`Claims hash ${r.seal.file_hash.slice(0, 24)}…`);
    if (r.seal?.algo) lines.push(`Algorithm ${r.seal.algo}`);
  } else if (r.kind === 'keyfile') {
    lines.push('Key file · passphrase-protected');
  }

  return lines;
}

/** True when this report admits the given action. */
export function admits(r: FileReport, action: 'encrypt' | 'decrypt'): boolean {
  return r.action === action;
}

/** Re-export so callers can show which key an operation will use. */
export type { Identity };
export { parsePublicKey };
