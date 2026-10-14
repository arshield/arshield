/**
 * Drives a stepper forward while a real operation runs in the background.
 *
 * The primitive work here is fast — milliseconds for a small file — so without
 * this the five rows would all flip at once and the sequence would be
 * invisible. This paces the display so each step is legible, while never
 * claiming more progress than actually happened: `finish()` jumps to the end
 * the moment the real work returns, and `cancel()` stops the timer.
 *
 * The tradeoff is deliberate: the UI shows a slightly slower walk than the
 * machine performs, never a faster one.
 */
export function runStepper(
  setStep: (n: number) => void,
  total: number,
  msPerStep = 420,
): { finish: () => void; cancel: () => void } {
  let current = 0;
  let done = false;

  const tick = () => {
    if (done || current >= total) return;
    current += 1;
    setStep(current);
    if (current < total) timer = setTimeout(tick, msPerStep);
  };

  let timer: ReturnType<typeof setTimeout> = setTimeout(tick, msPerStep);

  return {
    /** Snap to the final step — the operation actually completed. */
    finish: () => {
      done = true;
      clearTimeout(timer);
      current = total;
      setStep(total);
    },
    /** Stop without advancing further, e.g. the operation threw. */
    cancel: () => {
      done = true;
      clearTimeout(timer);
    },
  };
}
