import {
  buildMessageUrl,
  decryptFile,
  encryptFile,
  ephemeralIdentity,
  identityFromWalletSignature,
  parseMessageUrl,
  signX402,
  unwrapKeyfile,
  verifyX402,
  CorruptFileError,
  InvalidPassphraseError,
  SignatureError,
  type ArShieldKeyPair,
} from '@arshield/core';
import { z } from 'zod';
import { ARSHIELD_SIGN_MESSAGE, recoverPersonalSigner, canonicalRecoveryByte } from './wallet-identity.js';

/**
 * Key-source rules (mirror the web app):
 *  - EITHER keyfile_json + passphrase
 *  - OR signature_hex + address (+ optional signature_hex_repeat)
 *  - a keyfile together with any wallet field, or a signature without its address
 *    (or the reverse), is an error.
 * When every signer field is omitted, encryption uses a fresh ephemeral identity.
 */

const b64decode = (s: string) => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
const b64encode = (b: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};
const b64urlToStd = (s: string) => s.replaceAll('-', '+').replaceAll('_', '/');

export type KeySource = {
  kind: 'keyfile';
  kp: ArShieldKeyPair;
  address?: string;
} | {
  kind: 'wallet';
  kp: ArShieldKeyPair;
  address: string;
} | {
  kind: 'ephemeral';
  kp: ArShieldKeyPair;
  address?: undefined;
};

function parseKeySource(args: {
  keyfile_json?: string;
  passphrase?: string;
  signature_hex?: string;
  signature_hex_repeat?: string;
  address?: string;
}): Promise<KeySource> {
  const hasKeyfile = Boolean(args.keyfile_json);
  const hasPass = Boolean(args.passphrase);
  const hasSig = Boolean(args.signature_hex);
  const hasAddr = Boolean(args.address);
  const hasWallet = hasSig || hasAddr;

  if (hasKeyfile && hasWallet) {
    return Promise.reject(new Error('Provide a keyfile OR a wallet signature, not both'));
  }
  if (hasKeyfile !== hasPass) {
    return Promise.reject(new Error('A keyfile requires its passphrase, and a passphrase requires its keyfile'));
  }
  if (hasSig !== hasAddr) {
    return Promise.reject(new Error('A wallet signature requires its address, and an address requires its signature'));
  }
  if ((args.signature_hex_repeat ?? '') !== '' && !hasSig) {
    return Promise.reject(new Error('signature_hex_repeat is only valid with signature_hex'));
  }

  if (hasKeyfile && hasPass) {
    return unwrapKeyfile(JSON.parse(args.keyfile_json!), args.passphrase!).then((kp) => ({ kind: 'keyfile', kp } as KeySource));
  }
  if (hasSig && hasAddr) {
    if (args.signature_hex_repeat && args.signature_hex_repeat !== args.signature_hex) {
      return Promise.reject(new Error('signature_hex and signature_hex_repeat must be identical'));
    }
    const signer = recoverPersonalSigner(ARSHIELD_SIGN_MESSAGE, args.signature_hex!);
    if (!signer || signer.toLowerCase() !== args.address!.toLowerCase()) {
      return Promise.reject(new Error('The signature does not match the provided address'));
    }
    const kp = identityFromWalletSignature(canonicalRecoveryByte(args.signature_hex!));
    return Promise.resolve({ kind: 'wallet', kp, address: args.address!.toLowerCase() } as KeySource);
  }
  return Promise.resolve({ kind: 'ephemeral', kp: ephemeralIdentity() } as KeySource);
}

const keySourceFields = {
  keyfile_json: z.string().optional().describe('The wrapped keyfile JSON from ArShield /app (Back up keys)'),
  passphrase: z.string().optional().describe('Passphrase of the keyfile'),
  signature_hex: z.string().optional().describe('65-byte EOA personal_sign signature (0x + 130 hex chars) over the ArShield derivation message'),
  signature_hex_repeat: z.string().optional().describe('Repeat of signature_hex for confirmation'),
  address: z.string().optional().describe('0x address that produced the signature'),
} as const;

export const tools = [
  {
    name: 'arshield_encrypt_file',
    description:
      'Encrypt bytes under hybrid ML-KEM-768 + X25519 and sign the envelope with ML-DSA-65 (ArShield .arshield container). ' +
      'Returns base64url of the container. Sign with a keyfile, a wallet signature, or a fresh ephemeral identity.',
    inputSchema: {
      type: 'object',
      properties: {
        data_base64: { type: 'string', description: 'File bytes encoded base64 (standard) or base64url' },
        filename: { type: 'string', description: 'Original filename, stored encrypted inside the payload' },
        ...keySourceFields,
      },
      required: ['data_base64', 'filename'],
    },
    async handler(args: Record<string, unknown>) {
      const dataB64 = String(args.data_base64);
      const raw = dataB64.includes('+') || dataB64.includes('/') ? dataB64 : b64urlToStd(dataB64);
      const bytes = b64decode(raw);
      const source = await parseKeySource(args);
      const container = await encryptFile(bytes, String(args.filename), source.kp.publicKey, source.kp.secretKey);
      return { content: [{ type: 'text', text: JSON.stringify({ container_b64url: b64encode(container) }) }] };
    },
  },
  {
    name: 'arshield_decrypt_file',
    description:
      'Decrypt an ArShield .arshield container (base64url). Verifies the ML-DSA-65 signature and returns the original file bytes and filename.',
    inputSchema: {
      type: 'object',
      properties: {
        container_b64url: { type: 'string', description: 'The .arshield container encoded base64url' },
        ...keySourceFields,
      },
      required: ['container_b64url'],
    },
    async handler(args: Record<string, unknown>) {
      const container = b64decode(b64urlToStd(String(args.container_b64url)));
      const source = await parseKeySource(args);
      const out = await decryptFile(container, source.kp.secretKey, source.kp.publicKey);
      return {
        content: [
          { type: 'text', text: JSON.stringify({ filename: out.filename, original_size: out.originalSize.toString(), data_b64: b64encode(out.fileBytes) }) },
        ],
      };
    },
  },
  {
    name: 'arshield_send_message',
    description:
      'Wrap a short plaintext (max 64KB) into a shareable encrypted ArShield message URL. The ciphertext lives in the URL #fragment. ' +
      'With an ephemeral sender the secret key is embedded so the recipient can decrypt without setup.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Plaintext message (max 64KB)' },
        ...keySourceFields,
      },
      required: ['text'],
    },
    async handler(args: Record<string, unknown>) {
      const text = String(args.text);
      const bytes = new TextEncoder().encode(text);
      if (bytes.length > 65536) throw new Error('Message exceeds 64KB plaintext limit');
      const source = await parseKeySource(args);
      const blob = await encryptFile(bytes, 'message.txt', source.kp.publicKey, source.kp.secretKey);
      const isEphemeral = source.kind === 'ephemeral';
      const url = buildMessageUrl(
        blob,
        source.kp.publicKey,
        isEphemeral ? { sk: source.kp.secretKey, pk: source.kp.publicKey } : undefined,
      );
      return { content: [{ type: 'text', text: JSON.stringify({ url, embed_secret_key: isEphemeral }) }] };
    },
  },
  {
    name: 'arshield_decrypt_message',
    description:
      'Read an ArShield encrypted message URL (like the /m page does). Returns the plaintext and the signer key that sealed it.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The arshield message URL' },
        ...keySourceFields,
      },
      required: ['url'],
    },
    async handler(args: Record<string, unknown>) {
      const parsed = parseMessageUrl(String(args.url));
      if (parsed.ephemeralSecret) {
        // Sender embedded the ephemeral secret in the URL — no key source needed.
        const out = await decryptFile(parsed.blob, parsed.ephemeralSecret, parsed.signerPublic);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                text: new TextDecoder().decode(out.fileBytes),
                mode: 'embedded',
                signer_mlkem: b64encode(parsed.signerPublic.mlkem),
                signer_x25519: b64encode(parsed.signerPublic.x25519),
                signer_mldsa: b64encode(parsed.signerPublic.mldsa),
              }),
            },
          ],
        };
      }
      // Sealed to a permanent identity: the reader must supply the same key source.
      const source = await parseKeySource(args);
      const out = await decryptFile(parsed.blob, source.kp.secretKey, source.kp.publicKey);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              text: new TextDecoder().decode(out.fileBytes),
              mode: source.kind === 'wallet' ? 'wallet' : 'keyfile',
              signer_mlkem: b64encode(parsed.signerPublic.mlkem),
              signer_x25519: b64encode(parsed.signerPublic.x25519),
              signer_mldsa: b64encode(parsed.signerPublic.mldsa),
            }),
          },
        ],
      };
    },
  },
  {
    name: 'arshield_verify_seal',
    description:
      'Parse the metadata fields an ArShield Quantum Seal PNG carries (unsigned) and, given an envelope, compare its sha256 against file_hash. Seal fields: file_hash, anchor_tx, anchor_chain, anchor_registry, anchor_time, anchor_account.',
    inputSchema: {
      type: 'object',
      properties: {
        seal_metadata_json: { type: 'string', description: 'The seal metadata parsed from the PNG text chunk' },
        envelope_sha256: { type: 'string', description: 'sha256 hex of the envelope to compare against file_hash' },
      },
      required: ['seal_metadata_json'],
    },
    async handler(args: Record<string, unknown>) {
      const meta = JSON.parse(String(args.seal_metadata_json));
      const match = args.envelope_sha256 ? String(args.envelope_sha256).toLowerCase() === String(meta.file_hash).toLowerCase() : null;
      return {
        content: [{ type: 'text', text: JSON.stringify({ fields: meta, hash_matches_envelope: match }) }],
      };
    },
  },
  {
    name: 'arshield_sign_x402',
    description:
      'Sign an x402 payment payload with ML-DSA-65 under context arshield-v1-x402. Returns the signature (base64url) the server can verify with the provided public key.',
    inputSchema: {
      type: 'object',
      properties: {
        payload_base64: { type: 'string', description: 'The x402 request bytes to sign (base64)' },
        ...keySourceFields,
      },
      required: ['payload_base64'],
    },
    async handler(args: Record<string, unknown>) {
      const payload = b64decode(b64urlToStd(String(args.payload_base64)));
      const source = await parseKeySource(args);
      const sig = signX402(source.kp.secretKey.mldsa, payload);
      const pub = source.kp.publicKey.mldsa;
      const verified = verifyX402(pub, payload, sig);
      return {
        content: [
          { type: 'text', text: JSON.stringify({ signature_b64url: b64encode(sig), public_key_mldsa_b64url: b64encode(pub), verified }) },
        ],
      };
    },
  },
] as const;

export type ArShieldTool = (typeof tools)[number];
export { CorruptFileError, InvalidPassphraseError, SignatureError };