/**
 * Play the stage list in order, then return.
 *
 * The cryptographic work finishes in a few milliseconds — faster than a single
 * animation frame — so `busy` alone would flash on and off and the user would
 * never see which primitive ran. This walks the rows at a readable pace and
 * resolves once the last one is marked, so the caller can await it before
 * showing the result.
 *
 * The budget is honest: if the real operation was slow, that time is spent;
 * if it was instant, each step is held for `stepMs` so the sequence is still
 * legible. It never marks a step the operation did not reach.
 */
export function playSteps(
  setStep: (n: number) => void,
  total: number,
  cryptoMs: number,
  stepMs = 480,
): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    let current = 0;

    const advance = () => {
      current += 1;
      setStep(current);
      if (current >= total) {
        resolve();
        return;
      }
      // Spread however much of the display budget is left across the
      // remaining rows, so a slow operation does not add artificial delay on
      // top of its own runtime.
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, total * stepMs - cryptoMs - elapsed);
      const rowsLeft = total - current;
      const wait = Math.min(stepMs, Math.round(remaining / rowsLeft));
      setTimeout(advance, wait);
    };

    // Give the first row a beat so the list is visible before anything is
    // marked done.
    setTimeout(advance, Math.round(stepMs * 0.6));
  });
}

/** Total time `playSteps` will take for a given run, used for layout hints. */
export function stepBudget(total: number, cryptoMs: number, stepMs = 480): number {
  return Math.max(total * stepMs, cryptoMs + Math.round(stepMs * 0.6));
}
