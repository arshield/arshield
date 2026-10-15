'use client';

/**
 * Reveals a string progressively.
 *
 * A hash that appears fully formed is a row of grey text the eye skips. Revealing
 * it says "this was computed just now, from your file", which is the fact the
 * result panel exists to communicate.
 *
 * Implementation note, because the obvious version does not work here: this page
 * is a static export, so the component is server-rendered first and hydrated
 * after. Any approach that decides its starting state during render — including
 * `useState(() => ...)` — gets the server's value baked in by hydration and never
 * animates. Similarly, driving it from an effect trips the lint rule against
 * setState in an effect body, and would mean a state write per frame.
 *
 * So the characters are all present in the DOM from the first paint, and each
 * one is faded in by a CSS animation with an index-derived delay. No JavaScript
 * runs per frame, nothing depends on hydration timing, and with JavaScript off
 * the string is simply visible — which is the correct fallback for a digest the
 * user may want to copy.
 *
 * The animation is disabled under reduced-motion, where the text is also
 * immediately visible.
 */

export function TypeOut({
  text,
  durationMs = 900,
  className,
}: {
  text: string;
  /** Time for the whole string to finish appearing. */
  durationMs?: number;
  className?: string;
}) {
  // Spread the total across however many characters there are, so a short digest
  // and a long one both land in about the same time. Capped so a very long string
  // does not end up with per-character delays too small to see.
  const per = Math.max(4, Math.round(durationMs / Math.max(1, text.length)));

  return (
    <span className={className} aria-label={text} title={text}>
      {text.split('').map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          aria-hidden="true"
          className="motion-safe:animate-[as-type-in_1ms_linear_both]"
          style={{ animationDelay: `${i * per}ms` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
