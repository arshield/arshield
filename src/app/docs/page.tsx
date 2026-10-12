import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Boxes, Cpu, Fingerprint, LayoutGrid, Rocket, ShieldCheck, Coins } from 'lucide-react';
import { DocsLayout, DocTitle } from '@/components/layout-docs';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: 'QuantSafe Docs',
  description:
    'Documentation for QuantSafe: the hybrid post-quantum stack, the .qsafe container, wallet-derived identity, and how $qsafe gates encryption capacity.',
};

const CARDS = [
  {
    href: '/docs/getting-started',
    label: 'Getting Started',
    desc: 'Encrypt your first file in under a minute. No accounts, no uploads.',
    icon: Rocket,
  },
  {
    href: '/docs/architecture',
    label: 'Architecture',
    desc: 'The hybrid post-quantum stack, the .qsafe container, and wallet-derived identity.',
    icon: Boxes,
  },
  {
    href: '/docs/security',
    label: 'Security',
    desc: 'Five guarantees we make about your data. Zero-knowledge, NIST-standardized.',
    icon: ShieldCheck,
  },
  {
    href: '/docs/for-agents',
    label: 'For Agents',
    desc: 'The MCP server, the wallet as identity, and signed x402 receipts.',
    icon: Cpu,
  },
  {
    href: '/docs/features',
    label: 'Features',
    desc: 'Everything available today and what is on the roadmap.',
    icon: LayoutGrid,
  },
  {
    href: '/docs/tokenomics',
    label: 'Token Utility',
    desc: 'How $qsafe gates encryption capacity. Hold more, encrypt more.',
    icon: Coins,
  },
  {
    href: '/docs/roadmap',
    label: 'Roadmap',
    desc: 'What ships today, and what is next on the roadmap with no date. The honest plan.',
    icon: Fingerprint,
  },
];

export default function DocsIndexPage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Documentation">QuantSafe Docs</DocTitle>
      <p className="mb-10 max-w-2xl text-[14.5px] leading-relaxed text-[#8a93a3]">
        Everything you need to understand and use QuantSafe, from your first encrypted file to the
        post-quantum primitives underneath.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal key={c.href} delay={i * 0.04}>
              <Link
                href={c.href}
                className="panel group flex h-full flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-[2px] hover:border-brand-gold/30"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-gold/25 bg-brand-gold/[0.06] text-brand-gold">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="mb-1.5 text-[15px] font-semibold text-[#e6e9ef]">{c.label}</h2>
                <p className="mb-4 text-[13px] leading-relaxed text-[#8a93a3]">{c.desc}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-gold">
                  Read
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </DocsLayout>
  );
}
