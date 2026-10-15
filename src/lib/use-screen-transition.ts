'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cross-fade between two screens without either one popping, and without a gap.
 *
 * The problem: React unmounts the outgoing screen in the same frame it mounts
 * the incoming one, so a switch between the key source picker and the workspace
 * reads as a hard cut.
 *
 * Two earlier approaches and why they were wrong:
 *
 * 1. Inline styles with a transition property. Driving opacity through inline
 *    style plus a CSS transition needs the element to exist at one value and
 *    then be repainted at another. When the element is mounted at opacity 0 and
 *    the phase flips in the next tick, React coalesces both writes into one
 *    commit and the browser never sees a change to transition — the screen pops
 *    in instead of fading. It looked fine in the trace as a 400ms stretch at
 *    opacity 0, which was actually a blank page, not a fade.
 *
 * 2. Keeping the outgoing screen mounted for the full exit duration. That is
 *    what produced the blank stretch: the outgoing screen had already finished
 *    fading, the incoming one had not started, and for a few hundred
 *    milliseconds there was nothing on screen.
 *
 * The current approach animates with CSS keyframes instead of a transition.
 * A keyframe animation runs from its own `from` to `to` the moment the element
 * is mounted, with no dependence on a prior paint, so there is nothing to
 * coalesce. Both screens are mounted at the same time and their animations
 * overlap by design, so the outgoing screen is still partly visible as the
 * incoming one starts.
 *
 * Element stagger lives here too, as keyframes on the children. It used to be a
 * set of `Reveal` wrappers inside the picker, which was a bug: the screen fade
 * and the element fades animated the same properties on nested nodes, so one
 * navigation looked like two animations fighting. Reveal is a scroll affordance
 * and has no business running during a screen swap.
 *
 * Reduced motion skips all of it.
 */

type Phase = 'idle' | 'swapping';

export function useScreenTransition<T>(value: T, durMs = 380) {
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
    clear();

    if (reduced.current) {
      setShown(value);
      return;
    }

    // Swap immediately and let both screens animate at once: the new one fades
    // up, the old one is still on screen fading out underneath. No wait, so no
    // window where the page is empty.
    setShown(value);
    setPhase('swapping');
    timers.current.push(setTimeout(() => setPhase('idle'), durMs));

    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durMs]);

  return {
    shown,
    phase,
    /** Class for the screen that is arriving. */
    enteringClass: phase === 'swapping' ? 'as-screen-in' : undefined,
    /** Class for the screen that is leaving — render it during the swap only. */
    leavingClass: phase === 'swapping' ? 'as-screen-out' : undefined,
    isSwapping: phase === 'swapping',
  };
}

/**
 * Keyframes for the screen swap and the child stagger.
 *
 * Both screens are positioned absolutely during the swap so they overlap
 * instead of stacking, which is what keeps the background stable and stops a
 * blank frame appearing between them.
 */
export const SWAP_CSS = `
@keyframes as-screen-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.992); }
  to   { opacity: 1; transform: none; }
}
@keyframes as-screen-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translateY(8px) scale(0.992); }
}
@keyframes as-child-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}

.as-screen-in {
  animation: as-screen-in 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
/* The outgoing screen is held in place over the incoming one and fades out
   faster, so it is gone before the incoming one finishes rather than fighting
   it for attention at the end. */
.as-screen-out {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  animation: as-screen-out 300ms cubic-bezier(0.4, 0, 1, 1) both;
}

/* Children arrive in sequence. Capped at six — past that the offsets read as
   loading rather than arriving. */
.as-stagger > * {
  animation: as-child-in 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.as-stagger > *:nth-child(1) { animation-delay: 60ms; }
.as-stagger > *:nth-child(2) { animation-delay: 130ms; }
.as-stagger > *:nth-child(3) { animation-delay: 200ms; }
.as-stagger > *:nth-child(4) { animation-delay: 270ms; }
.as-stagger > *:nth-child(5) { animation-delay: 340ms; }
.as-stagger > *:nth-child(n+6) { animation-delay: 380ms; }

@media (prefers-reduced-motion: reduce) {
  .as-screen-in, .as-screen-out, .as-stagger > * { animation: none !important; }
  .as-stagger > * { opacity: 1 !important; transform: none !important; }
}
`;
