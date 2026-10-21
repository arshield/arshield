/**
 * Receipt and message helpers shared by the workspace and the chat agent.
 *
 * These used to live inside app-workspace.tsx as file-private functions. The
 * chat agent needs exactly the same two outputs — a verifiable seal PNG and a
 * shareable message link — so they moved here rather than being copied. One
 * implementation means a seal built from chat and a seal built from the
 * workspace are byte-identical, which matters because /verify reads them both.
 */

import { buildMessageUrl, encryptFile } from '@/lib/arshield';
import type { Identity } from '@/lib/agent/actions';

/** Seal PNG geometry. 720×480 keeps the seven metadata lines on one screen. */
const SEAL_W = 720;
const SEAL_H = 480;

/** Insert a tEXt chunk right after IHDR so /verify can parse file_hash. */
function injectTextChunk(png: Uint8Array, keyword: string, text: string): Uint8Array {
  const data = new TextEncoder().encode(keyword + '\0' + text);
  const chunk = new Uint8Array(12 + data.length);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, data.length);
  chunk.set([0x74, 0x45, 0x58, 0x74], 4); // "tEXt"
  chunk.set(data, 8);
  const crc = crc32(chunk.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc);
  // Splice after IHDR: 8 bytes of signature + a 25-byte IHDR chunk.
  const insertAt = 8 + 25;
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(png.subarray(insertAt), insertAt + chunk.length);
  return out;
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Build a Quantum Seal PNG carrying the envelope sha256 in its tEXt chunk.
 *
 * The visible text and the embedded chunk say the same thing on purpose: a user
 * who cannot parse PNG chunks still gets the hash, and a tool that ignores the
 * pixels still gets it from the chunk.
 */
export async function buildSealPng(
  fileHash: string,
  filename: string,
  address?: string,
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = SEAL_W;
  canvas.height = SEAL_H;

  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, SEAL_W, SEAL_H);
  g.addColorStop(0, '#0a1220');
  g.addColorStop(1, '#020610');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SEAL_W, SEAL_H);
  ctx.strokeStyle = 'rgba(209,164,19,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 672, 432);
  ctx.fillStyle = '#d1a413';
  ctx.font = 'bold 30px ui-monospace, monospace';
  ctx.fillText('QUANTUM SEAL', 56, 96);
  ctx.fillStyle = '#8a93a3';
  ctx.font = '15px ui-monospace, monospace';
  ctx.fillText('ArShield · post-quantum receipt', 56, 128);
  ctx.fillStyle = '#e6e9ef';
  ctx.font = '14px ui-monospace, monospace';
  const lines = [
    `file      ${filename}`,
    `algo      ML-KEM-768 + X25519 / ML-DSA-65`,
    `sha256    ${fileHash.slice(0, 40)}`,
    `${fileHash.slice(40, 72)}`,
    `time      ${new Date().toISOString()}`,
    address ? `wallet    ${address}` : `signer    ephemeral`,
    `chain     ARC (5042)`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, 56, 190 + i * 30));
  ctx.fillStyle = 'rgba(209,164,19,0.6)';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText('those metadata fields are also embedded as PNG tEXt chunks', 56, 420);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('Seal image could not be rendered.');
  const buf = new Uint8Array(await blob.arrayBuffer());
  return injectTextChunk(
    buf,
    'arshield',
    JSON.stringify({
      version: 1,
      timestamp: new Date().toISOString(),
      algo: 'ML-KEM-768+X25519/ML-DSA-65',
      file_hash: fileHash,
      wallet: address ?? null,
    }),
  );
}

export type SealOutcome = { url: string; chars: number };

/**
 * Encrypt a short message and wrap it in a link.
 *
 * An ephemeral identity embeds its own secret in the link so the recipient can
 * open it without a prior exchange — convenient, and the reason the caller must
 * label such links clearly. A wallet or key-file identity does not, so the link
 * only opens for someone holding the matching key.
 */
export async function encryptMessage(text: string, identity: Identity): Promise<SealOutcome> {
  const bytes = new TextEncoder().encode(text.slice(0, 65536));
  const container = await encryptFile(
    bytes,
    'message.txt',
    identity.kp.publicKey,
    identity.kp.secretKey,
  );
  const isEphemeral = identity.kind === 'keyfile' && identity.label.includes('generated');
  const url = buildMessageUrl(
    container,
    identity.kp.publicKey,
    isEphemeral ? { sk: identity.kp.secretKey, pk: identity.kp.publicKey } : undefined,
  );
  return { url, chars: text.length };
}

/** Kick off a browser download for a byte payload. */
export function download(bytes: Uint8Array, name: string, type = 'application/octet-stream'): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
