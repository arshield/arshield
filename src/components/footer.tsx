import Link from 'next/link';
import { Logo } from './header';

const COLS = [
  {
    title: 'PRODUCT',
    links: [
      { href: '/app', label: 'Launch app' },
      { href: '/mcp', label: 'MCP server' },
      { href: '/m', label: 'Messages' },
      { href: '/verify', label: 'Verify Seal' },
      { href: '/#tiers', label: 'Tiers' },
      { href: '/#shield', label: 'Shield (roadmap)' },
    ],
  },
  {
    title: 'RESOURCES',
    links: [
      { href: '/docs', label: 'Docs' },
      { href: '/docs/features', label: 'Features' },
      { href: '/docs/roadmap', label: 'Roadmap' },
      { href: '/#protocol', label: 'How it works' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'LEGAL',
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: 'mailto:hello@arc-shield.xyz', label: 'Contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#020610]">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#7b8493]">
              Security between agents. Post-quantum envelopes for files and messages, signatures for
              x402 receipts. MCP-native. Built for ARC.
            </p>

            {/* Social. The label is visually hidden rather than omitted so the
                link still announces itself to a screen reader. */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://x.com/arcshield_"
                target="_blank"
                rel="me noopener noreferrer"
                aria-label="ArShield on X"
                title="@arcshield_ on X"
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.10] bg-white/[0.02] text-[#9aa3b2] transition-colors hover:border-brand-gold/40 hover:bg-brand-gold/[0.08] hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px]" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5b6474]">
              arc-shield.xyz
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5b6474]">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#9aa3b2] transition-colors hover:text-[#e6e9ef]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[13px] text-[#5b6474] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ArShield. Built for ARC. Built on open-source noble cryptography.</p>
          <p className="font-semibold uppercase tracking-[0.18em] text-[#7b8493]">
            Holders encrypt more.
          </p>
        </div>
      </div>
    </footer>
  );
}