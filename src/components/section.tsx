import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './reveal';

/**
 * Section wrapper: gold eyebrow + heading + subtitle.
 *
 * `align` lets sections alternate between centered and left-aligned so the
 * page has a rhythm instead of a stack of identical centered headers.
 */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
  align = 'center',
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  align?: 'center' | 'left';
}) {
  const isLeft = align === 'left';
  const headerAlign = isLeft ? 'text-left' : 'text-center';
  const titleAlign = isLeft ? 'text-left' : 'mx-auto text-center';

  return (
    // Vertical rhythm: 64px on small screens, 80px from sm up. Section padding
    // stacks (bottom of one + top of the next), so this lands the
    // content-to-heading gap near 200px — roomy without feeling empty.
    <section id={id} className={cn('relative scroll-mt-20 py-16 sm:py-20', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {(eyebrow || title) && (
          <div className={cn('mb-8', isLeft ? 'max-w-2xl' : '', headerAlign)}>
            {eyebrow && (
              <Reveal>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-gold">
                  {eyebrow}
                </div>
              </Reveal>
            )}
            {title && (
              <Reveal delay={0.05}>
                <h2 className={cn('max-w-3xl text-balance text-3xl font-bold leading-tight tracking-tight text-[#e6e9ef] sm:text-4xl', titleAlign)}>
                  {title}
                </h2>
              </Reveal>
            )}
            {subtitle && (
              <Reveal delay={0.1}>
                <p className={cn('mt-4 max-w-2xl text-balance text-[15px] leading-relaxed text-[#8a93a3]', isLeft ? '' : 'mx-auto')}>
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