/**
 * Social links for the footer and the mobile menu.
 *
 * X is live. Discord and Telegram are shown but not yet clickable — the accounts
 * do not exist yet, and a link to nowhere is worse than a visible placeholder,
 * so they render as disabled elements with a tooltip that says so. When an
 * account is ready, set its `href` and nothing else changes.
 *
 * Glyphs are inline SVG. Three single-path logos do not justify an icon
 * dependency, and the shapes here are the official marks.
 */

type Social = {
  key: 'x' | 'discord' | 'telegram';
  label: string;
  href: string | null;
  title: string;
  path: string;
};

const SOCIALS: Social[] = [
  {
    key: 'x',
    label: 'ArShield on X',
    href: 'https://x.com/arcshield_',
    title: '@arcshield_ on X',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    key: 'discord',
    label: 'ArShield on Discord — coming soon',
    href: null,
    title: 'Discord — coming soon',
    path: 'M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
  },
  {
    key: 'telegram',
    label: 'ArShield on Telegram — coming soon',
    href: null,
    title: 'Telegram — coming soon',
    path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  },
];

export function SocialLinks({
  tone = 'bright',
  showSoon = true,
}: {
  tone?: 'quiet' | 'bright';
  /**
   * Whether the not-yet-live accounts render. The footer shows all three so the
   * full set is visible; the header shows only X, because the top bar is a
   * navigation surface and two dead icons there are clutter competing with the
   * actual links.
   */
  showSoon?: boolean;
}) {
  const list = showSoon ? SOCIALS : SOCIALS.filter((s) => s.href);
  const base =
    'grid h-9 w-9 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50';

  const enabled =
    tone === 'bright'
      ? 'text-[#c8cedb] border-white/[0.16] bg-white/[0.05] hover:border-brand-gold/50 hover:bg-brand-gold/[0.10] hover:text-brand-gold'
      : 'text-[#9aa3b2] border-white/[0.10] bg-white/[0.02] hover:border-brand-gold/40 hover:bg-brand-gold/[0.08] hover:text-brand-gold';

  // Muted but still legible. A glyph faded to near-invisible reads as a
  // rendering bug; this reads as "not open yet", which is the intent. No hover
  // change and a not-allowed cursor, so it never implies it will respond.
  const soon = 'text-[#5f6878] border-white/[0.07] bg-white/[0.015] cursor-not-allowed';

  return (
    <div className="flex items-center gap-3">
      {list.map((s) =>
        s.href ? (
          <a
            key={s.key}
            href={s.href}
            target="_blank"
            // `me` marks a profile the site owner controls; the other two stop
            // the opened tab reaching back through window.opener.
            rel="me noopener noreferrer"
            aria-label={s.label}
            title={s.title}
            className={`${base} ${enabled}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px]" fill="currentColor">
              <path d={s.path} />
            </svg>
          </a>
        ) : (
          <span
            key={s.key}
            aria-disabled="true"
            aria-label={s.label}
            title={s.title}
            className={`${base} ${soon}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px]" fill="currentColor">
              <path d={s.path} />
            </svg>
          </span>
        ),
      )}
    </div>
  );
}
