import type { Metadata } from 'next';
import { DocsLayout, DocTitle, DocH2, DocP } from '@/components/layout-docs';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: 'Roadmap | ArShield Docs',
  description: 'What ships in ArShield today, and what is next. The honest plan, with no dates.',
};

const SHIPPED = [
  'Hybrid post-quantum encryption in the browser (ML-KEM-768 + X25519 KEM, ML-DSA-65 signatures, AES-256-GCM)',
  'The .arshield envelope container',
  'Quantum Seal PNG export with embedded tEXt-chunk metadata',
  'Local Seal verification by dropping a PNG',
  'Wallet-derived identity from a single signing message',
  'Encrypted messages via link',
  'MCP server with the wallet as identity',
  'Signed x402 receipts',
];

const NEXT = [
  { title: 'Multi-recipient envelopes', body: 'One payload, several authorised wallet addresses.' },
  { title: 'On-chain attestations', body: 'Optionally anchor a Seal hash on ARC.' },
  { title: 'Team workspaces', body: 'Shared key material for a group, with no server custody.' },
  { title: 'Hardware-key identity', body: 'Derive identity from a hardware wallet or FIDO2 key.' },
  { title: '$arshield tier thresholds', body: 'Published capacity limits, decided with the token launch.' },
  { title: 'Independent audit', body: 'A third-party review of the crypto core and the browser implementation.' },
];

export default function RoadmapPage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Roadmap">What ships today, and what is next</DocTitle>
      <p className="mb-10 max-w-2xl text-[14.5px] leading-relaxed text-[#8a93a3]">
        No date. We would rather ship something correct than something on time. Below is what is live
        today, followed by what we are working toward, in rough order.
      </p>

      <DocH2>Shipped</DocH2>
      <div className="mb-4 panel rounded-2xl p-5">
        <ul className="flex flex-col gap-2.5">
          {SHIPPED.map((s) => (
            <li key={s} className="flex gap-3 text-[13.5px] leading-relaxed text-[#8a93a3]">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      <DocH2>Next</DocH2>
      <div className="mb-2 flex flex-col gap-3">
        {NEXT.map((n, i) => (
          <Reveal key={n.title} delay={i * 0.05}>
            <div className="panel rounded-2xl p-5">
              <h3 className="mb-1.5 text-[14.5px] font-semibold text-[#e6e9ef]">{n.title}</h3>
              <p className="text-[13px] leading-relaxed text-[#8a93a3]">{n.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <DocP>
        Items move off this page only when they are actually live. If something slips, it stays here
        rather than moving to a new date.
      </DocP>
    </DocsLayout>
  );
}
