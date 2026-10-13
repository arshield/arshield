import type { Metadata } from 'next';
import { DocsLayout, DocTitle, DocH2, DocP } from '@/components/layout-docs';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: 'Architecture | ArShield Docs',
  description:
    'The hybrid post-quantum stack, the .arshield container, and wallet-derived identity behind ArShield.',
};

const LAYERS = [
  {
    step: '01',
    title: 'Hybrid key agreement',
    body: 'ArShield combines ML-KEM-768 (Kyber) with X25519. The shared secret is only as weak as the stronger of the two, so an attacker must break both a lattice scheme and an elliptic-curve scheme to recover a key.',
  },
  {
    step: '02',
    title: 'AEAD content encryption',
    body: 'File content is encrypted with AES-256-GCM using the derived key. A fresh random 96-bit nonce is generated per file, and the algorithm header is passed as additional authenticated data, so any edit to the header or ciphertext is detected on decrypt.',
  },
  {
    step: '03',
    title: 'Post-quantum signature',
    body: 'The envelope — header plus ciphertext — is signed with ML-DSA-65 (Dilithium) under a fixed ArShield context. The signature covers the KEM ciphertexts, the nonce and the encrypted payload, so a modified byte fails verification before decryption.',
  },
  {
    step: '04',
    title: 'Browser-only execution',
    body: 'All primitives run in pure JavaScript in your browser, using the audited @noble libraries. No key material, plaintext, or filename is ever posted to a server. There is no server that could receive it.',
  },
];

export default function ArchitecturePage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Architecture">The hybrid post-quantum stack</DocTitle>
      <p className="mb-6 max-w-2xl text-[14.5px] leading-relaxed text-[#8a93a3]">
        ArShield is deliberately conservative: instead of betting on a single post-quantum
        algorithm, it pairs each new primitive with a battle-tested classical one and combines them
        in the browser.
      </p>

      <DocH2>The encryption pipeline</DocH2>
      <div className="mb-2 flex flex-col gap-3">
        {LAYERS.map((l, i) => (
          <Reveal key={l.step} delay={i * 0.05}>
            <div className="panel flex gap-4 rounded-2xl p-5">
              <div className="font-mono text-[12px] font-semibold text-brand-gold">{l.step}</div>
              <div>
                <h3 className="mb-1.5 text-[15px] font-semibold text-[#e6e9ef]">{l.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-[#8a93a3]">{l.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <DocH2>The .arshield container</DocH2>
      <DocP>
        A <span className="font-mono text-[13px] text-brand-gold">.arshield</span> file is a small
        JSON envelope that travels next to your encrypted payload. It carries the algorithm
        identifiers, the wrapped content key, the sender and recipient wallet addresses, the
        ML-DSA-65 signature, and an optional x402 receipt. It contains no plaintext and no
        unencrypted key material.
      </DocP>
      <DocP>
        The envelope is self-describing, so a recipient only needs their own key material to open
        it. Nothing about the container depends on ArShield infrastructure being online.
      </DocP>

      <DocH2>Wallet-derived identity</DocH2>
      <DocP>
        Rather than asking you to create an account, ArShield treats your wallet as your identity.
        On first use you sign a fixed, human-readable message. That signature derives a deterministic
        identity key pair which is never transmitted anywhere. A later sign-in reproduces the same
        identity, so the wallet itself is the only credential you need to remember.
      </DocP>
      <DocP>
        This is why losing your wallet, key file, and passphrase means your files are unrecoverable:
        there is no recovery authority, and no escrow, because there is no server holding a copy.
      </DocP>
    </DocsLayout>
  );
}
