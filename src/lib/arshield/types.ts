/** Typed error hierarchy for ArShield. Every failure mode is a named class so
 * callers and agents can branch on `.code` instead of matching message text. */

export class ArShieldError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ArShieldError';
  }
}

export class InvalidPassphraseError extends ArShieldError {
  constructor() {
    super('Wrong passphrase or corrupted key file', 'INVALID_PASSPHRASE');
    this.name = 'InvalidPassphraseError';
  }
}

export class CorruptFileError extends ArShieldError {
  constructor(detail: string) {
    super(`Corrupt or invalid .arshield file: ${detail}`, 'CORRUPT_FILE');
    this.name = 'CorruptFileError';
  }
}

export class SignatureError extends ArShieldError {
  constructor() {
    super('Signature verification failed', 'SIGNATURE_FAILED');
    this.name = 'SignatureError';
  }
}

/* --- Key shapes --- */
export type MlKemKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };

export type ArShieldPublicKey = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

export type ArShieldSecretKey = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

export type ArShieldKeyPair = {
  publicKey: ArShieldPublicKey;
  secretKey: ArShieldSecretKey;
};

export type ArShieldSeeds = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

/** The parsed .arshield container. */
export type ArShieldContainer = {
  version: number;
  algoId: number;
  kemCtPq: Uint8Array;
  kemCtCls: Uint8Array;
  nonce: Uint8Array;
  aeadPayload: Uint8Array;
  signature: Uint8Array;
};

/** The wrapped keyfile JSON structure. */
export type ArShieldKeyfile = {
  v: 1;
  kdf: 'argon2id';
  kdfParams: { t: number; m: number; p: number };
  salt: string;
  nonce: string;
  wrapped: string;
};
