'use client';

import { Check, Loader2 } from 'lucide-react';

/**
 * The five stages of sealing or opening an envelope, shown as a live list.
 *
 * This is the piece that makes a long operation legible: instead of one
 * "working…" line, the user watches each primitive run in order and sees
 * which one is moving, which are done, and which are still queued.
 *
 * The order is not cosmetic. Sealing builds up: encapsulate, agree, combine,
 * encrypt, sign. Opening verifies first — if the signature is wrong nothing is
 * decrypted at all — so the opening list leads with ML-DSA-65.
 *
 * Transitions between states are staged rather than swapped. When a row
 * finishes, the spinner does not vanish and reappear as a tick: both glyphs are
 * mounted and cross-fade, and the tick eases in from slightly small so the eye
 * catches the change. Without that the list reads as flicker, because the
 * three states change colour, icon and badge in the same frame.
 */

type Step = {
  id: string;
  name: string;
  detail: string;
};

const SEAL_STEPS: Step[] = [
  { id: 'mlkem', name: 'ML-KEM-768', detail: 'Post-quantum KEM encapsulation' },
  { id: 'x25519', name: 'X25519', detail: 'Classical ECDH encapsulation' },
  { id: 'hkdf', name: 'HKDF-SHA256', detail: 'Hybrid secret combine' },
  { id: 'aead', name: 'AES-256-GCM', detail: 'Seal payload + filename' },
  { id: 'mldsa', name: 'ML-DSA-65', detail: 'Sign header + ciphertext' },
];

const OPEN_STEPS: Step[] = [
  { id: 'mldsa', name: 'ML-DSA-65', detail: 'Verify signature' },
  { id: 'mlkem', name: 'ML-KEM-768', detail: 'Post-quantum decapsulation' },
  { id: 'x25519', name: 'X25519', detail: 'Classical ECDH decapsulation' },
  { id: 'hkdf', name: 'HKDF-SHA256', detail: 'Recombine hybrid secret' },
  { id: 'aead', name: 'AES-256-GCM', detail: 'Unseal and parse' },
];

/** How long a state change takes to settle. Matches the CSS below. */
const SETTLE_MS = 620;

export function stepsFor(mode: 'encrypt' | 'decrypt'): Step[] {
  return mode === 'encrypt' ? SEAL_STEPS : OPEN_STEPS;
}

export function SealingStepper({
  mode,
  /** How many steps have completed. */
  done,
  /** Whether the operation is still running. */
  running,
  /** Shown only once every step is done. */
  error,
}: {
  mode: 'encrypt' | 'decrypt';
  done: number;
  running: boolean;
  error?: string | null;
}) {
  const steps = stepsFor(mode);
  const total = steps.length;
  const finished = Math.min(done, total);
  // The bar counts the running step as half done, so it moves the moment work
  // starts rather than sitting at zero while the first row spins.
  const barPct = Math.round((Math.min(finished + (running && finished < total ? 0.5 : 0), total) / total) * 100);

  const title = mode === 'encrypt' ? 'SEALING' : 'UNSEALING';
  const footerLabel = mode === 'encrypt' ? 'Sealing layers' : 'Unsealing layers';

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <style>{KEYFRAMES}</style>

      <div className="border-b border-white/[0.06] px-5 py-3">
        <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--color-action)]">
          {title}
        </span>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {steps.map((step, i) => {
          const state = i < finished ? 'done' : i === finished && running ? 'active' : 'pending';
          const isLast = i === total - 1;

          return (
            <li
              key={step.id}
              className={[
                'flex items-center gap-3.5 px-5 py-3',
                'transition-[background-color,border-color,opacity] duration-[620ms] ease-out',
                state === 'active'
                  ? 'border-l-2 border-l-[var(--color-action)] bg-[var(--color-action)]/[0.06]'
                  : 'border-l-2 border-l-transparent',
                state === 'pending' ? 'opacity-55' : 'opacity-100',
              ].join(' ')}
            >
              <Glyph state={state} index={i} />

              <div className="min-w-0 flex-1">
                <div
                  className={[
                    'truncate text-[14px] transition-colors duration-[620ms] ease-out',
                    state === 'done'
                      ? 'text-[#aab3c1]'
                      : state === 'active'
                        ? 'text-[#eef1f6]'
                        : 'text-[#9ba4b3]',
                  ].join(' ')}
                >
                  {step.name}
                </div>
                <div className="truncate text-[12.5px] text-[#7a8494]">{step.detail}</div>
              </div>

              <Badge state={state} isLast={isLast && state === 'done'} />
            </li>
          );
        })}
      </ul>

      {/* Progress bar. The row list says which step is running; this says how
          far through the whole sequence we are, at a glance, without reading.
          The active step counts as partly done so the bar is never stuck at
          zero while work is visibly happening. */}
      <div className="h-[3px] w-full overflow-hidden bg-white/[0.05]">
        <div
          className={[
            'h-full rounded-r-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            // On completion the bar turns teal and pulses once. A bar that
            // simply arrives at full width has no finish; the single pulse is
            // what marks the end of the sequence.
            finished >= total
              ? 'bg-[var(--color-verified)] motion-safe:animate-[as-bar-done_900ms_cubic-bezier(0.22,1,0.36,1)_1]'
              : 'bg-[var(--color-action)]',
          ].join(' ')}
          style={{ width: `${barPct}%` }}
          role="progressbar"
          aria-valuenow={finished}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={footerLabel}
        />
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
        <span className="text-[12px] text-[#7a8494]">
          {footerLabel} ·{' '}
          <span className="text-[var(--color-action)]/80">
            {finished} / {total}
          </span>
        </span>
        <span className="font-mono text-[12px] text-[#6a7385]">NIST FIPS 203 · 204 · SP 800-56C</span>
      </div>

      {error && (
        <div className="border-t border-red-500/20 bg-red-500/[0.06] px-5 py-3 text-[13px] text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Keyframes for the two staged transitions. Kept in the component rather than
 * globals.css because nothing else uses them.
 */
const KEYFRAMES = `
@keyframes as-tick-in {
  0%   { opacity: 0; transform: scale(0.4); }
  55%  { opacity: 1; transform: scale(1.14); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes as-spin-out {
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.55); }
}
@keyframes as-ring-out {
  0%   { opacity: 0.6; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.5); }
}
@media (prefers-reduced-motion: reduce) {
  .as-tick, .as-spin-out, .as-ring-out { animation: none !important; }
}
`;

function Glyph({ state, index }: { state: string; index: number }) {
  const base = 'relative flex h-7 w-7 flex-none items-center justify-center rounded-full';

  // Tone for the disc itself, animated on the same duration as everything else
  // so the row settles as one object rather than three separate flips.
  const disc =
    state === 'done'
      ? 'bg-[var(--color-verified)]/15 text-[var(--color-verified)]'
      : state === 'active'
        ? 'bg-[var(--color-action)]/15 text-[var(--color-action)]'
        : 'border border-white/10 bg-white/[0.03] text-[#848d9c]';

  return (
    <span
      className={`${base} ${disc} transition-colors duration-[620ms] ease-out ${
        state === 'pending' ? 'font-mono text-[12px]' : ''
      }`}
    >
      {/* The number is always present underneath. It fades out as the row
          lights up, so the disc is never empty mid-transition. */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-[420ms] ease-out"
        style={{ opacity: state === 'pending' ? 1 : 0 }}
        aria-hidden={state !== 'pending'}
      >
        {index + 1}
      </span>

      {/* Spinner + ping, mounted while active and easing out on completion
          rather than unmounting in the same frame the tick arrives. */}
      {(state === 'active' || state === 'done') && (
        <span
          className={`absolute inset-0 flex items-center justify-center ${
            state === 'done' ? 'as-spin-out' : ''
          }`}
          style={state === 'done' ? { animation: `as-spin-out ${SETTLE_MS}ms ease-out forwards` } : undefined}
        >
          <span
            className="absolute inset-0 rounded-full bg-[var(--color-action)]/30 motion-safe:animate-ping"
            style={
              state === 'done'
                ? { animation: `as-ring-out ${SETTLE_MS}ms ease-out forwards` }
                : { animationDuration: '3s' }
            }
          />
          <span
            className="relative inline-flex motion-safe:animate-spin"
            style={
              state === 'done'
                ? { animation: `as-spin-out ${SETTLE_MS}ms ease-out forwards` }
                : { animationDuration: '2.6s' }
            }
          >
            <Loader2 className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        </span>
      )}

      {/* The tick eases in with a small overshoot, which is what makes the
          completion feel like something landed rather than swapped. */}
      {state === 'done' && (
        <span className="as-tick relative" style={{ animation: `as-tick-in ${SETTLE_MS}ms ease-out both` }}>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

function Badge({ state, isLast }: { state: string; isLast: boolean }) {
  const label = state === 'done' ? (isLast ? 'SEALED' : 'DONE') : state === 'active' ? 'RUNNING' : 'QUEUED';

  const tone =
    state === 'done'
      ? 'border-[var(--color-verified)]/25 bg-[var(--color-verified)]/10 text-[var(--color-verified)]'
      : state === 'active'
        ? 'border-[var(--color-action)]/40 bg-[var(--color-action)]/12 text-[var(--color-action)]'
        : 'border-white/10 bg-white/[0.02] text-[#7a8494]';

  return (
    // Keyed on the label so React remounts on change, which lets the fade-in
    // run every time rather than only on first paint.
    <span className="relative flex-none">
      <span
        key={label}
        className={`inline-block rounded-md border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-[620ms] ease-out ${tone}`}
        style={{ animation: `as-tick-in ${SETTLE_MS}ms ease-out both` }}
      >
        {label}
      </span>
    </span>
  );
}
