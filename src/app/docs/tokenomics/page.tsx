import type { Metadata } from 'next';
import { DocsLayout, DocTitle, DocH2, DocP } from '@/components/layout-docs';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: 'Token Utility | ArShield Docs',
  description: 'How $arshield gates encryption capacity. Hold more, encrypt more.',
};

const TIERS = [
  { name: 'Free', hold: '—', limit: 'A handful of file encryptions per day', note: 'No token, no wallet required to try it.' },
  { name: 'Holder', hold: 'Hold $arshield', limit: 'A higher daily encryption capacity', note: 'Read from Robinhood Chain at connect time.' },
  { name: 'Deep', hold: 'Hold more $arshield', limit: 'A materially higher daily capacity', note: 'Same mechanism, larger allowance.' },
];

export default function TokenomicsPage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Token Utility">How $arshield gates encryption capacity</DocTitle>
      <p className="mb-10 max-w-2xl text-[14.5px] leading-relaxed text-[#8a93a3]">
        ArShield is free to use. The $arshield token does not unlock the cryptography, and it does not
        gate your privacy. It only raises the daily ceiling on how many files you can encrypt.
      </p>

      <DocH2>Tiers</DocH2>
      <div className="mb-4 flex flex-col gap-3">
        {TIERS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.05}>
            <div className="panel grid gap-3 rounded-2xl p-5 sm:grid-cols-[140px_1fr]">
              <div>
                <div className="text-[15px] font-semibold text-[#e6e9ef]">{t.name}</div>
                <div className="text-[12px] font-medium text-brand-gold">{t.hold}</div>
              </div>
              <div>
                <div className="mb-1 text-[13.5px] font-medium text-[#e6e9ef]">{t.limit}</div>
                <p className="text-[13px] leading-relaxed text-[#8a93a3]">{t.note}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <DocP>
        Tier thresholds are announced with the token launch and are subject to change. The exact
        numbers live in the app once the token is live.
      </DocP>

      <DocH2>How the check works</DocH2>
      <DocP>
        Once the $arshield token is live, connecting a wallet makes the app read your token balance via
        a Robinhood Chain RPC endpoint to determine your tier. This read is unauthenticated and is
        identical to querying any block explorer: the RPC endpoint sees the address it is asked
        about. No wallet address is stored by us. Pages you visit without connecting a wallet or
        submitting a Seal send nothing to the chain.
      </DocP>

      <DocH2>What the token does not do</DocH2>
      <DocP>
        Holding $arshield does not give us any ability to decrypt your files, and it does not change the
        encryption itself. It is a capacity gate, nothing more. The cryptography stays
        zero-knowledge whether you hold zero tokens or a large balance.
      </DocP>
    </DocsLayout>
  );
}
