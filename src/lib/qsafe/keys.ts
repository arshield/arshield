import { x25519 } from '@noble/curves/ed25519';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import type { QuantSafeKeyPair, QuantSafeSeeds } from './types';

/** Deterministically expand the three seeds into an QuantSafe keypair. */
export function keysFromSeeds(seeds: QuantSafeSeeds): QuantSafeKeyPair {
  const mlkem = ml_kem768.keygen(seeds.mlkem);
  const mldsa = ml_dsa65.keygen(seeds.mldsa);
  const x25519Pub = x25519.getPublicKey(seeds.x25519);
  return {
    publicKey: {
      mlkem: mlkem.publicKey,
      x25519: x25519Pub,
      mldsa: mldsa.publicKey,
    },
    secretKey: {
      mlkem: mlkem.secretKey,
      x25519: seeds.x25519,
      mldsa: mldsa.secretKey,
    },
  };
}
