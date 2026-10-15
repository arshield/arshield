'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cross-fade between two screens without either one popping.
 *
 * The problem this solves: React unmounts the outgoing screen in the same
 * frame it mounts the incoming one, so a switch between the key source picker
 * and the workspace reads as a hard cut — the page blinks from one layout to a
 * completely different one. The eye has nothing to follow.
 *
 * How it works: `phase` walks idle -> out -> in. The outgoing screen is held
 * mounted for the exit duration, then swapped, then the incoming screen
 * animates in. Both screens render during the swap window, stacked, so the
 * background behind them never flashes.
 *
 * Reduced motion skips the whole thing and swaps immediately — the transition
 * is decoration, and for someone who asked for less motion the instant swap is
 * strictly better than a fade they did not want.
 */

type Phase = 'idle' | 'out' | 'in';

export function useScreenTransition<T>(value: T, outMs = 360, inMs = 520) {
  const [shown, setShown] = useState(value);
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (value === shown) return;

    const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

    if (reduced.current) {
      setShown(value);
      return;
    }

    clear();
    setPhase('out');
    timers.current.push(
      setTimeout(() => {
        setShown(value);
        setPhase('in');
        timers.current.push(setTimeout(() => setPhase('idle'), inMs));
      }, outMs),
    );

    return clear;
    // `shown` is intentionally out of the deps: including it would re-run on
    // every swap and cancel the timer that performs it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, outMs, inMs]);

  // A screen that is leaving gets dimmed and pushed back very slightly; one
  // that is arriving comes forward. Small numbers on purpose — at this scale
  // a large move reads as a page slide, which is heavier than a state change
  // deserves.
  const leaving = phase === 'out';
  const entering = phase === 'in';

  return {
    shown,
    phase,
    /** Apply to whichever screen is on its way out. */
    exitStyle: leaving ? { opacity: 0, transform: 'translateY(6px) scale(0.99)' } : undefined,
    /** Apply to whichever screen is arriving. */
    enterStyle: entering ? { opacity: 0, transform: 'translateY(-6px) scale(0.995)' } : undefined,
    /** Shared transition timing. */
    style: {
      transition: `opacity ${leaving ? outMs : inMs}ms cubic-bezier(0.22,1,0.36,1), transform ${leaving ? outMs : inMs}ms cubic-bezier(0.22,1,0.36,1)`,
      willChange: phase === 'idle' ? undefined : 'opacity, transform',
    },
  };
}
