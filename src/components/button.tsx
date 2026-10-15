import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'ghost' | 'outline';

const base =
  'group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50';

export const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
} as const;

export const variants: Record<ButtonVariant, string> = {
  // The lift is on a named easing rather than the default so the primary action
  // settles the way the rest of the site's motion does. The glow widens on the
  // same transition rather than a separate one, so lift and light move together.
  primary:
    'bg-gold-gradient text-brand-ink shadow-gold-glow hover:-translate-y-[1px] hover:shadow-gold-glow-lg duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
  ghost:
    'border border-white/10 bg-white/[0.02] text-[#e6e9ef] hover:border-white/20 hover:bg-white/[0.05]',
  outline:
    'border border-brand-gold/50 bg-transparent text-brand-gold hover:bg-brand-gold/10',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button ref={ref} className={cn(base, sizes[size], variants[variant], className)} {...props} />
    );
  },
);
Button.displayName = 'Button';

/** Gold banner pill used above section headings. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold',
        className,
      )}
    >
      {children}
    </div>
  );
}