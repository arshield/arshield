'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Background } from './background';
import { Logo } from './header';
import { cn } from '@/lib/utils';

const DOC_NAV = [
  { href: '/docs', label: 'Overview' },
  { href: '/docs/getting-started', label: 'Getting Started' },
  { href: '/docs/architecture', label: 'Architecture' },
  { href: '/docs/security', label: 'Security' },
  { href: '/docs/for-agents', label: 'For Agents' },
  { href: '/docs/features', label: 'Features' },
  { href: '/docs/tokenomics', label: 'Token Utility' },
  { href: '/docs/roadmap', label: 'Roadmap' },
];

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#5b6474]">Documentation</p>
        <nav className="flex flex-col gap-0.5 border-l border-white/[0.06]">
          {DOC_NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  '-ml-px border-l py-1.5 pl-4 text-[13px] transition-colors',
                  active
                    ? 'border-brand-gold text-brand-gold'
                    : 'border-transparent text-[#8a93a3] hover:border-white/20 hover:text-[#e6e9ef]',
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Background />
      <div className="relative min-h-screen">
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#020610]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="ArShield home"><Logo /></Link>
            <div className="flex items-center gap-5 text-[13px]">
              <Link href="/docs" className="text-[#9aa3b2] hover:text-white">Docs</Link>
              <Link href="/app" className="text-brand-gold hover:text-[#e9c35f]">Open App</Link>
            </div>
          </div>
        </header>
        <div className="mx-auto flex max-w-6xl gap-10 px-4 py-12 sm:px-6">
          <DocsSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}

/** Prose helpers for docs pages. */
export function DocTitle({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-gold">{eyebrow}</div>
      <h1 className="text-3xl font-bold tracking-tight text-[#e6e9ef]">{children}</h1>
    </div>
  );
}

export function DocH2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 mt-10 text-xl font-bold text-[#e6e9ef]">{children}</h2>;
}

export function DocP({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[14.5px] leading-relaxed text-[#8a93a3]">{children}</p>;
}