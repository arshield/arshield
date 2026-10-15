'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/button';

/**
 * Download button with a visible outcome.
 *
 * Before this, clicking download created a blob and clicked an anchor — and
 * nothing on screen changed. For a file that may be hundreds of megabytes, or
 * slower than a desktop once the save dialog is involved, the button being
 * inert makes the user click it again. Which queues a second download.
 *
 * Three states, one control:
 *
 * - idle     the label it always had
 * - working  for saves slow enough to notice (the seal PNG is built on a canvas
 *            first, so it is not instant) — a spinner replaces the icon
 * - done     a tick and "Saved" for a beat, then back to idle
 *
 * The "done" state is deliberately short and reverts on its own. It reports what
 * happened; it is not a mode to dismiss.
 */

type Phase = 'idle' | 'working' | 'done';

export function DownloadButton({
  onDownload,
  label,
  doneLabel,
  className,
}: {
  /** Runs the actual save. May be async (the seal is generated first). */
  onDownload: () => void | Promise<void>;
  label: string;
  /** Shown in place of `label` once the save has been kicked off. */
  doneLabel?: string;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const run = async () => {
    if (phase !== 'idle') return;
    setPhase('working');
    try {
      await onDownload();
      setPhase('done');
      // Revert on its own. Long enough to read, short enough that a second
      // download is still one click away.
      timers.current.push(setTimeout(() => setPhase('idle'), 1600));
    } catch {
      // A failed save is not something this component can fix; putting the
      // button back is better than leaving it stuck mid-state.
      setPhase('idle');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={run}
      // Not disabled while working: the browser owns the save dialog and may hold
      // the promise open, so locking the button would strand it.
      className={className}
      aria-live="polite"
    >
      {phase === 'working' ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {label}
        </>
      ) : phase === 'done' ? (
        <>
          <Check className="h-3.5 w-3.5 text-[var(--color-verified)]" />
          {doneLabel ?? 'Saved'}
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}
