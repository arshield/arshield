import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Not found | ArShield',
  robots: { index: false, follow: true },
};

/**
 * 404.
 *
 * The default Next.js page is a bare black-on-white "This page could not be
 * found" with no branding and no way back — the single most visible sign that
 * nobody finished the site. This one keeps the shell, offers the four places a
 * lost visitor is most likely to have meant, and is marked noindex so it never
 * ends up in search results.
 */
export default function NotFound() {
  const paths = [
    { href: '/', label: 'Home', note: 'What ArShield is' },
    { href: '/app', label: 'Launch app', note: 'Seal a file in your browser' },
    { href: '/mcp', label: 'MCP server', note: 'Use it from an agent' },
    { href: '/docs', label: 'Docs', note: 'Architecture and security' },
  ];

  return (
    <>
      <Background />
      <div className="relative flex min-h-screen flex-col">
        <header className="border-b border-white/[0.06] bg-[#020610]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="ArShield home">
              <Logo />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#9aa3b2] transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
          <div className="as-dialog-in">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-brand-gold/25 bg-brand-gold/[0.07]">
                <FileQuestion className="h-5 w-5 text-brand-gold" />
              </span>
              <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#8b94a4]">
                Error 404
              </span>
            </div>

            <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-[#e6e9ef] sm:text-4xl">
              That page isn&rsquo;t here.
            </h1>
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[#9ba4b3]">
              The link may be mistyped, or the page may have moved. Nothing was lost — sealed files
              live on your device, not on this server.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {paths.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="as-lift-soft group rounded-2xl border border-white/[0.10] bg-white/[0.028] px-5 py-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[14.5px] font-semibold text-[#eef1f6]">{p.label}</span>
                    <ArrowLeft className="h-4 w-4 rotate-180 text-[#7a8494] transition-transform group-hover:translate-x-0.5 group-hover:text-brand-gold" />
                  </div>
                  <p className="mt-1 text-[13px] text-[#8f98a8]">{p.note}</p>
                </Link>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
