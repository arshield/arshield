/**
 * Play the stage list in order, then return.
 *
 * The cryptographic work finishes in a few milliseconds — faster than a single
 * animation frame — so the busy flag alone would flash on and off and the user
 * would never see which primitive ran. This walks the rows at a readable pace
 * and resolves once the last one is marked, so the caller can await it before
 * showing the result.
 *
 * Pacing rules:
 *   - every step is held for stepMs, uniformly. An earlier version divided the
 *     remaining budget across the rows, which made the later ones visibly
 *     quicker; a fixed beat per row reads as a steady walk instead
 *   - a slow operation extends the list rather than compressing it, so no row
 *     is ever rushed to keep within a total
 *   - the last row is held for one extra beat before the caller proceeds, so
 *     the eye lands on the finished list before the result appears
 *
 * It never marks a step the operation did not reach.
 */
export function playSteps(
  setStep: (n: number) => void,
  total: number,
  cryptoMs: number,
  stepMs = 1500,
): Promise<void> {
  return new Promise((resolve) => {
    let current = 0;

    const advance = () => {
      current += 1;
      setStep(current);

      if (current >= total) {
        setTimeout(resolve, stepMs);
        return;
      }

      // One even beat per row. If the real work is still going when the list
      // is done, the caller simply waits for it — the display is never
      // compressed to fit.
      setTimeout(advance, stepMs);
    };

    // A beat before the first row is marked, so the whole list is on screen and
    // the first spinner is seen rather than skipped.
    setTimeout(advance, stepMs);
  });
}

/** Total wall time `playSteps` will take, for callers that need to plan around it. */
export function stepBudget(total: number, cryptoMs: number, stepMs = 1500): number {
  return Math.max((total + 1) * stepMs, cryptoMs + stepMs);
}
