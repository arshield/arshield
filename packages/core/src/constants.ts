/**
 * ArShield constants — the fixed parameters of the .arshield container and the
 * key-derivation scheme. Every value here is part of the wire format: change it and
 * every existing envelope stops opening. Bump VERSION when you do.
 */

/** Magic bytes at the start of every .arshield container: "ARSHD". */
export const MAGIC = new Uint8Array([0x41, 0x52, 0x53, 0x48, 0x44]);
export const MAGIC_LEN = 5;

/** Container format version. */
export const VERSION = 1;

/** Algorithm suite identifiers. */
export const ALGO_ID = {
  HYBRID_V1: 0x0001,
} as const;

/* --- Domain-separation contexts (bound into signatures) --- */
export const FILE_CONTEXT = 'arshield-v1-file';
export const MESSAGE_CONTEXT = 'arshield-v1-message';
export const X402_CONTEXT = 'arshield-v1-x402';

/** HKDF salt for deriving the three seeds from an IKM. */
export const HKDF_SALT = 'arshield-v1';
/** HKDF salt for combining the two KEM shared secrets. */
export const HKDF_SALT_HYBRID = 'arshield-v1-hybrid';
/** HKDF info labels for per-primitive seed derivation. */
export const HKDF_INFO_MLKEM_SEED = 'mlkem-seed';
export const HKDF_INFO_X25519_SEED = 'x25519-seed';
export const HKDF_INFO_MLDSA_SEED = 'mldsa-seed';
/** HKDF info label for the AES key derived from combined shared secrets. */
export const HKDF_INFO_AES_KEY = 'aes-256-gcm';
/** HKDF info label for the keyfile wrapping key. */
export const HKDF_INFO_KEYFILE_WRAP = 'keyfile-wrap-key';
/** AAD for the wrapped keyfile payload. */
export const KEYFILE_AAD = 'arshield-keyfile-v1';
/** IKM label for wallet-derived identities (kept as a constant for tooling). */
export const WALLET_KDF_MESSAGE = 'arshield-key-derivation-v1';

/* --- Sizes (bytes) --- */
export const ML_KEM_SEED_LEN = 64;
export const ML_KEM_PK_LEN = 1184;
export const ML_KEM_SK_LEN = 2400;
export const ML_KEM_CT_LEN = 1088;
export const X25519_PK_LEN = 32;
export const X25519_SK_LEN = 32;
export const ML_DSA_SEED_LEN = 32;
export const ML_DSA_PK_LEN = 1952;
export const ML_DSA_SK_LEN = 4032;
export const ML_DSA_SIG_LEN = 3309;
export const AES_KEY_LEN = 32;
export const NONCE_LEN = 12;
export const AES_GCM_TAG_LEN = 16;

/* --- Argon2id parameters for keyfile wrapping (OWASP baseline) --- */
export const ARGON2ID_PARAMS_PROD = { t: 3, m: 65536, p: 1 } as const;
export const ARGON2ID_SALT_LEN = 16;

/** Maximum plaintext a single message URL may carry. */
export const MAX_MESSAGE_PLAINTEXT = 64 * 1024;

/** The exact message a wallet signs to derive an ArShield identity. */
export const ARSHIELD_DERIVATION_MESSAGE =
  'ArShield keypair derivation v1\n' +
  '\n' +
  'This signature derives your personal post-quantum encryption keypair.\n' +
  'It grants no permissions and costs no gas.\n' +
  '\n' +
  'Domain: arc-shield.xyz';

/** Base URL for shareable encrypted messages (data lives in the #fragment). */
export const MESSAGE_URL_BASE = 'https://arc-shield.xyz/m/#';
export const MESSAGE_URL_PREFIX = 'v1.';
