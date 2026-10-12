import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './reveal';

/**
 * Standard section wrapper with a gold eyebrow, centered heading and optional subtitle.
 * Matches ArShield's `Section` primitive (eyebrow / title / subtitle).
 */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('relative scroll-mt-20 py-20 sm:py-24', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {(eyebrow || title) && (
          <div className="mb-10 text-center">
            {eyebrow && (
              <Reveal>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-gold">
                  {eyebrow}
                </div>
              </Reveal>
            )}
            {title && (
              <Reveal delay={0.05}>
                <h2 className="mx-auto max-w-3xl text-balance text-3xl font-bold leading-tight tracking-tight text-[#e6e9ef] sm:text-4xl">
                  {title}
                </h2>
              </Reveal>
            )}
            {subtitle && (
              <Reveal delay={0.1}>
                <p className="mx-auto mt-4 max-w-2xl text-balance text-[15px] leading-relaxed text-[#8a93a3]">
                  {subtitle}
                </p>
              </Reveal>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}