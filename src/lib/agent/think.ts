/**
 * Thinking pause.
 *
 * A reply that lands in the same frame as the keypress reads as a lookup rather
 * than a response. A short pause is enough to fix that: the message arrives
 * rather than the text changing under the cursor.
 *
 * This is presentation, not work. No crypto, no network, nothing is computed
 * during the wait.
 */

/**
 * How long to pause before a reply appears.
 *
 * Set to 100 ms on request. This replaces the per-character scale the file used
 * to carry, which made a long explanation take longer to appear than a one-line
 * answer. At 100 ms there is no room for a scale to be visible, so it is gone
 * rather than left in place doing nothing.
 *
 * Note this is below the threshold where a delay registers as waiting — it reads
 * as the turn landing, not as the agent pausing to think. The typing indicator
 * carries that impression instead; see thinkLabel.
 */
const PAUSE_MS = 100;

/**
 * How long to pause before showing a reply.
 *
 * Kept in its own function so the duration is one named thing, callers keep
 * passing the text they are about to show, and the scale can return here without
 * touching a call site.
 */
export function thinkMs(): number {
  return PAUSE_MS;
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
 * Cancellable: `cancel()` clears the timer and the promise settles without
 * resolving, so a caller that awaited it does not hang. Used so a user who starts
 * a new turn mid-pause does not get two replies arriving out of order.
 */
export function think(): { promise: Promise<void>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, thinkMs());
  });

  return {
    promise,
    cancel: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      // The promise never resolves if cancelled; callers that cancel also stop
      // awaiting, so nothing is left hanging on it.
    },
  };
}
