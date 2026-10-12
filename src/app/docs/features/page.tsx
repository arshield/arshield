import type { Metadata } from 'next';
import { DocsLayout, DocTitle, DocH2, DocP } from '@/components/layout-docs';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: 'Features | ArShield Docs',
  description: 'Everything available in ArShield today, and what is on the roadmap.',
};

const TODAY = [
  { title: 'File encryption', body: 'Drop any file, get an encrypted payload plus a .arshield envelope. Hybrid post-quantum, entirely client-side.' },
  { title: 'File decryption', body: 'Open a .arshield envelope with your wallet, key file, or passphrase and recover the original file in your browser.' },
  { title: 'Quantum Seal PNG', body: 'Export a shareable PNG Seal carrying version, timestamp, algorithm, and file hash in its tEXt chunks.' },
  { title: 'Seal verification', body: 'Drop a Philips Seal PNG to parse its tEXt chunks locally and inspect the embedded metadata.' },
  { title: 'Wallet-derived identity', body: 'No accounts. A single signing message derives your deterministic identity key pair on first use.' },
  { title: 'Encrypted messages', body: 'Send short encrypted messages through a link, with the plaintext never leaving your device.' },
  { title: 'MCP server', body: 'Drive ArShield from an AI agent over the Model Context Protocol, with the wallet as identity.' },
  { title: 'Signed x402 receipts', body: 'Optional receipts that record a paid action and travel inside the .arshield envelope.' },
];

const NEXT = [
  { title: 'Multi-recipient envelopes', body: 'Encrypt once, allow several wallet addresses to open the same payload.' },
  { title: 'On-chain attestations', body: 'Optionally anchor a Seal hash on ARC for a public, timestamped proof.' },
  { title: 'Team workspaces', body: 'Shared key material within a group, without introducing a server that holds it.' },
  { title: 'Hardware-key support', body: 'Derive identity from a hardware wallet or FIDO2 authenticator.' },
];

export default function FeaturesPage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Features">Everything available today, and what is next</DocTitle>
      <p className="mb-10 max-w-2xl text-[14.5px] leading-relaxed text-[#8a93a3]">
        ArShield ships small and focuses on getting the cryptography right. Here is exactly what
        works right now, followed by what is planned.
      </p>

      <DocH2>Available today</DocH2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {TODAY.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.04}>
            <div className="panel h-full rounded-2xl p-5">
              <h3 className="mb-1.5 text-[14.5px] font-semibold text-[#e6e9ef]">{f.title}</h3>
              <p className="text-[13px] leading-relaxed text-[#8a93a3]">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <DocH2>On the roadmap</DocH2>
      <div className="mb-2 flex flex-col gap-3">
        {NEXT.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.05}>
            <div className="panel rounded-2xl p-5">
              <h3 className="mb-1.5 text-[14.5px] font-semibold text-[#e6e9ef]">{f.title}</h3>
              <p className="text-[13px] leading-relaxed text-[#8a93a3]">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <DocP>
        No roadmap item carries a date. We would rather ship a primitive that is correct than one
        that is on time, and this page is updated as each item lands.
      </DocP>
    </DocsLayout>
  );
}
