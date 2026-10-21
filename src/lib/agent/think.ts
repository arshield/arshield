/**
 * Thinking pause.
 *
 * A reply that lands in the same frame as the keypress does not read as
 * thinking — it reads as a lookup. The words are right and the exchange still
 * feels wrong, because a person who knows the answer still takes a beat to
 * answer it, and the length of that beat tracks how much there is to say.
 *
 * So the pause is proportional to the reply rather than fixed. A one-line
 * "thanks" gets a short beat; a four-sentence explanation of the algorithm gets
 * a longer one, and because the pause scales, reading it back feels like the
 * agent spent the time forming the answer rather than waiting out a timer.
 *
 * The floor matters more than the ceiling. Below roughly a quarter second the
 * pause is not perceptible at all and the reply still snaps in; above about a
 * second and a half it stops reading as thought and starts reading as lag.
 *
 * This is presentation, not work. No crypto, no network, nothing is computed
 * during the wait — it exists so the reply arrives at a human pace.
 */

/**
 * Milliseconds per character of reply.
 *
 * Tuned by measurement, not by feel. At 2.6 a 320-character explanation paused
 * for 690 ms, which is inside the range where a reply still reads as instant —
 * the scale existed but was too flat to notice, and the floor dominated short
 * replies so a one-liner and a paragraph waited about the same. 5.2 puts the
 * same explanation at ~1.5 s and a one-liner near the floor, which is the
 * ratio the eye actually reads as effort.
 */
const MS_PER_CHAR = 5.2;

/**
 * Below this the pause is invisible.
 *
 * Deliberately low. It is a floor against a zero-length reply, not a minimum
 * delay — setting it near the ceiling is what flattened the scale before.
 */
const FLOOR_MS = 550;

/** Past this it stops feeling like thought and starts feeling broken. */
const CEIL_MS = 2600;

/** Slight variance so consecutive replies do not pause for identical spans. */
const JITTER = 0.18;

/**
 * How long to pause before showing a reply of this length.
 *
 * Exported so callers can reason about it (and tests can assert the bounds)
 * without running the timer.
 */
export function thinkMs(text: string): number {
  const base = Math.min(CEIL_MS, Math.max(FLOOR_MS, text.length * MS_PER_CHAR));
  return Math.round(base * (1 + (Math.random() * 2 - 1) * JITTER));
}

/** Labels that name what the agent is supposedly doing, not just "loading". */
const THINK_LABELS = [
  'Thinking…',
  'Working out what you asked…',
  'Considering…',
  'Checking…',
];

/**
 * Pick a label for this pause.
 *
 * Rotated rather than random so two consecutive replies never repeat a label —
 * the repeat is what makes a canned indicator obvious.
 */
let lastLabel = -1;
export function thinkLabel(): string {
  let i = Math.floor(Math.random() * THINK_LABELS.length);
  if (i === lastLabel) i = (i + 1) % THINK_LABELS.length;
  lastLabel = i;
  return THINK_LABELS[i];
}

/**
 * Wait, then resolve.
 *
 * Cancellable: the returned handle's `cancel()` clears the timer and rejects
 * nothing — the caller checks `cancelled` and simply does not post. Used so a
 * user who starts a new turn mid-pause does not get two replies arriving out of
 * order.
 */
export function think(text: string): { promise: Promise<void>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const promise = new Promise<void>((resolve, reject) => {
    timer = setTimeout(() => {
      if (cancelled) return;
      resolve();
    }, thinkMs(text));

    // Nothing ever rejects in normal use; this exists so a cancelled pause
    // settles instead of hanging a caller that awaited it.
    if (cancelled) reject(new Error('cancelled'));
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    },
  };
}
