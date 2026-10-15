/**
 * The X (formerly Twitter) profile link.
 *
 * One component for both placements so the target, the label and the security
 * attributes cannot drift apart between the header and the footer. The glyph is
 * inline SVG — it is a single path, and pulling in an icon package for one logo
 * is not a trade worth making.
 *
 * `tone` controls how much the button stands out. The header sits next to a
 * bright gold CTA and several nav items, so it stays quiet there; the footer has
 * nothing competing with it and uses the brighter variant.
 */
export function XLink({
  tone = 'quiet',
  className,
}: {
  tone?: 'quiet' | 'bright';
  className?: string;
}) {
  const styles =
    tone === 'bright'
      ? 'text-[#c8cedb] border-white/[0.16] bg-white/[0.05] hover:border-brand-gold/50 hover:bg-brand-gold/[0.10] hover:text-brand-gold'
      : 'text-[#9aa3b2] border-white/[0.10] bg-white/[0.02] hover:border-brand-gold/40 hover:bg-brand-gold/[0.08] hover:text-brand-gold';

  return (
    <a
      href="https://x.com/arcshield_"
      target="_blank"
      // `me` marks this as a profile the site owner controls; the other two stop
      // the opened tab from reaching back through window.opener.
      rel="me noopener noreferrer"
      aria-label="ArShield on X"
      title="@arcshield_ on X"
      className={[
        'grid h-9 w-9 flex-none place-items-center rounded-lg border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50',
        styles,
        className ?? '',
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px]" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>
  );
}
