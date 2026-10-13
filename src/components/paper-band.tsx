'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './reveal';

/**
 * A single light section in an otherwise dark page.
 *
 * Everything before this point is navy-on-navy, which is one of the reasons
 * the page read as an undifferentiated template. One paper-coloured block
 * mid-scroll resets the eye and gives the guarantee its own room.
 */
export function PaperBand() {
  return (
    <section className="relative my-2">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--color-paper)] px-6 py-12 sm:px-12 sm:py-16">
            {/* faint gold rule to tie it back to the brand */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-action)] to-transparent opacity-70" />

            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-paper-ink)]/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-paper-ink)]/60">
                  the whole promise
                </span>
                <h2 className="mt-5 text-balance text-3xl font-bold leading-[1.15] tracking-tight text-[var(--color-paper-ink)] sm:text-[2.6rem]">
                  We can’t lose your file,
                  <br />
                  because we never see it.
                </h2>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--color-paper-ink)]/70">
                  There is no upload, no account, and no ArShield server holding a copy. The envelope is built in your
                  browser and the only keys that open it stay with you — a wallet signature, or a key file you keep.
                  Lose both and the file is gone; that is the point.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/app"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--color-paper-ink)] px-6 text-[14.5px] font-medium text-[var(--color-paper)] transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    Seal a file
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/docs/security"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--color-paper-ink)]/20 px-6 text-[14.5px] font-medium text-[var(--color-paper-ink)] transition-colors hover:border-[var(--color-paper-ink)]/45"
                  >
                    Read the security notes
                  </Link>
                </div>
              </div>

              <ul className="space-y-4 lg:border-l lg:border-[var(--color-paper-ink)]/12 lg:pl-10">
                {[
                  ['Nothing is uploaded', 'Every byte is sealed on your device.'],
                  ['No account exists', 'There is no sign-up, and nothing to reset.'],
                  ['Two independent maths', 'ML-KEM-768 and X25519 both have to fall.'],
                  ['Verifiable offline', 'A Seal carries the digest, so you can check later.'],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[var(--color-paper-ink)]" />
                    <div>
                      <div className="text-[14px] font-semibold text-[var(--color-paper-ink)]">{t}</div>
                      <div className="text-[13px] leading-relaxed text-[var(--color-paper-ink)]/65">{d}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}