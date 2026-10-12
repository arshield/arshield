/** Typed error hierarchy for QuantSafe. Every failure mode is a named class so
 * callers and agents can branch on `.code` instead of matching message text. */

export class QsafeError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'QsafeError';
  }
}

export class InvalidPassphraseError extends QsafeError {
  constructor() {
    super('Wrong passphrase or corrupted key file', 'INVALID_PASSPHRASE');
    this.name = 'InvalidPassphraseError';
  }
}

export class CorruptFileError extends QsafeError {
  constructor(detail: string) {
    super(`Corrupt or invalid .qsafe file: ${detail}`, 'CORRUPT_FILE');
    this.name = 'CorruptFileError';
  }
}

export class SignatureError extends QsafeError {
  constructor() {
    super('Signature verification failed', 'SIGNATURE_FAILED');
    this.name = 'SignatureError';
  }
}

/* --- Key shapes --- */
export type MlKemKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };

export type QuantSafePublicKey = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

export type QuantSafeSecretKey = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

export type QuantSafeKeyPair = {
  publicKey: QuantSafePublicKey;
  secretKey: QuantSafeSecretKey;
};

export type QuantSafeSeeds = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

/** The parsed .qsafe container. */
export type QuantSafeContainer = {
  version: number;
  algoId: number;
  kemCtPq: Uint8Array;
  kemCtCls: Uint8Array;
  nonce: Uint8Array;
  aeadPayload: Uint8Array;
  signature: Uint8Array;
};

/** The wrapped keyfile JSON structure. */
export type QuantSafeKeyfile = {
  v: 1;
  kdf: 'argon2id';
  kdfParams: { t: number; m: number; p: number };
  salt: string;
  nonce: string;
  wrapped: string;
};
