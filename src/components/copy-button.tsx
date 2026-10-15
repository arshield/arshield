'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Copy to clipboard with a visible outcome.
 *
 * `navigator.clipboard` returns a promise and can reject — a page without a
 * secure context, a browser that gates the permission, an unfocused document.
 * The old inline version in this app awaited nothing and showed nothing, so a
 * copy that silently failed looked exactly like one that worked. Here the label
 * only confirms once the write actually resolved.
 *
 * The failure branch says so instead of staying quiet, because "nothing
 * happened" is the one message a copy button must never send.
 */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    // Self-reverting. Long enough to read, short enough that copying again is
    // still one click away.
    timer.current = setTimeout(() => setState('idle'), 1800);
  };

  return (
    <button
      type="button"
      onClick={run}
      aria-live="polite"
      title={state === 'failed' ? 'Copy failed — select and copy manually' : undefined}
      className={[
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
        state === 'copied'
          ? 'border-[var(--color-verified)]/40 bg-[var(--color-verified)]/[0.10] text-[var(--color-verified)]'
          : state === 'failed'
            ? 'border-red-500/35 bg-red-500/[0.08] text-red-300'
            : 'border-white/[0.12] bg-white/[0.02] text-[#9ba4b3] hover:border-white/[0.25] hover:text-[#e6e9ef]',
        className ?? '',
      ].join(' ')}
    >
      {state === 'copied' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {state === 'copied' ? copiedLabel : state === 'failed' ? 'Copy failed' : label}
    </button>
  );
}
