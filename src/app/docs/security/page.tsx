import type { Metadata } from 'next';
import { EyeOff, ServerOff, KeyRound, FileLock2, BadgeCheck } from 'lucide-react';
import { DocsLayout, DocTitle, DocH2, DocP } from '@/components/layout-docs';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: 'Security | QuantSafe Docs',
  description:
    'Five guarantees QuantSafe makes about your data. Zero-knowledge, NIST-standardized.',
};

const GUARANTEES = [
  {
    icon: EyeOff,
    title: 'We cannot see your data',
    body: 'Encryption and decryption happen in your browser. File contents, filenames, keys, and message plaintext never reach us.',
  },
  {
    icon: ServerOff,
    title: 'No custody, no control',
    body: 'QuantSafe has no ability to decrypt, access, or modify your files at any time. There is no server that processes your data.',
  },
  {
    icon: KeyRound,
    title: 'Keys never leave your device',
    body: 'Key material is derived and used locally, in WebAssembly. If you lose your wallet, key file, and passphrase, your encrypted files are unrecoverable. This is by design.',
  },
  {
    icon: FileLock2,
    title: 'Authenticated and tamper-evident',
    body: 'AES-256-GCM binds ciphertext to its metadata through an authentication tag. Any modification is detected at decrypt time.',
  },
  {
    icon: BadgeCheck,
    title: 'NIST-standardized primitives',
    body: 'ML-KEM-768, ML-DSA-65, X25519, Ed25519, and AES-256-GCM. No experimental or home-rolled cryptography.',
  },
];

export default function SecurityPage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Security">Five guarantees about your data</DocTitle>
      <p className="mb-10 max-w-2xl text-[14.5px] leading-relaxed text-[#8a93a3]">
        Security claims are only useful when they are specific. These are the five properties
        QuantSafe is built to preserve, and how each one is enforced.
      </p>

      <div className="flex flex-col gap-3">
        {GUARANTEES.map((g, i) => {
          const Icon = g.icon;
          return (
            <Reveal key={g.title} delay={i * 0.05}>
              <div className="panel flex gap-4 rounded-2xl p-5">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-gold/25 bg-brand-gold/[0.06] text-brand-gold">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="mb-1.5 text-[15px] font-semibold text-[#e6e9ef]">{g.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-[#8a93a3]">{g.body}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <DocH2>What this means in practice</DocH2>
      <DocP>
        Because there is no server holding your data, there is no breach surface for your files. The
        privacy policy lists the only records that ever touch a disk: a count of today&apos;s
        encryptions in local storage, a first-use signing flag per wallet, and the wallet
        connection your wallet library keeps. Nothing else, and no signature or key, is stored.
      </DocP>

      <DocH2>Reporting a vulnerability</DocH2>
      <DocP>
        If you believe you have found a security issue, email{' '}
        <a href="mailto:hello@quantsafe.tech" className="text-brand-gold hover:underline">
          hello@quantsafe.tech
        </a>
        . Please include reproduction steps and, where possible, a minimal proof of concept.
      </DocP>
    </DocsLayout>
  );
}
