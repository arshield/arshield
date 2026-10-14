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
 *   - every step except the last is held for stepMs, so each is legible
 *   - the last step waits out whatever real time the crypto took, so a slow
 *     file still shows the final row as running rather than skipping it
 *   - the operation's own duration is never added on top of the total, so the
 *     list does not get slower just because a file is large
 *
 * It never marks a step the operation did not reach.
 */
export function playSteps(
  setStep: (n: number) => void,
  total: number,
  cryptoMs: number,
  stepMs = 900,
): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    let current = 0;

    // How long the whole list should take. At least the work itself, and at
    // least one readable beat per row.
    const budget = Math.max(total * stepMs, cryptoMs);

    const advance = () => {
      current += 1;
      setStep(current);

      if (current >= total) {
        // Hold the final row on screen so the eye lands on it before the
        // result panel replaces the sense of motion.
        setTimeout(resolve, stepMs);
        return;
      }

      const elapsed = Date.now() - started;
      const remaining = Math.max(0, budget - elapsed);
      const rowsLeft = total - current;
      // Divide the remaining time evenly, but never rush a row below the
      // readable floor.
      const wait = Math.max(stepMs * 0.7, Math.min(stepMs * 1.4, remaining / rowsLeft));
      setTimeout(advance, Math.round(wait));
    };

    // A beat before the first row is marked, so the whole list is visible and
    // the first spinner is seen rather than skipped.
    setTimeout(advance, stepMs);
  });
}

/** Total wall time `playSteps` will take, for callers that need to plan around it. */
export function stepBudget(total: number, cryptoMs: number, stepMs = 900): number {
  return Math.max(total * stepMs, cryptoMs) + stepMs;
}
