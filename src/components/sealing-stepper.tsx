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

  const title = mode === 'encrypt' ? 'SEALING' : 'UNSEALING';
  const footerLabel = mode === 'encrypt' ? 'Sealing layers' : 'Unsealing layers';

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-action)]">
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
                'flex items-center gap-3 px-4 py-2.5 transition-all duration-300',
                state === 'active'
                  ? 'border-l-2 border-l-[var(--color-action)] bg-[var(--color-action)]/[0.06]'
                  : 'border-l-2 border-l-transparent',
                state === 'pending' ? 'opacity-55' : '',
              ].join(' ')}
            >
              {/* status glyph: check when done, spinner when active, number when queued */}
              <Glyph state={state} index={i} />

              <div className="min-w-0 flex-1">
                <div
                  className={[
                    'truncate text-[13px] transition-colors duration-300',
                    state === 'done'
                      ? 'text-[#9aa3b2]'
                      : state === 'active'
                        ? 'text-[#eef1f6]'
                        : 'text-[#8b93a3]',
                  ].join(' ')}
                >
                  {step.name}
                </div>
                <div className="truncate text-[11.5px] text-[#5b6474]">{step.detail}</div>
              </div>

              <Badge state={state} isLast={isLast && state === 'done'} />
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
        <span className="text-[11px] text-[#5b6474]">
          {footerLabel} ·{' '}
          <span className="text-[var(--color-action)]/80">
            {finished} / {total}
          </span>
        </span>
        <span className="font-mono text-[11px] text-[#4a5262]">NIST FIPS 203 · 204 · SP 800-56C</span>
      </div>

      {error && (
        <div className="border-t border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-[12px] text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

function Glyph({ state, index }: { state: string; index: number }) {
  const base = 'relative flex h-7 w-7 flex-none items-center justify-center rounded-full';

  if (state === 'done') {
    return (
      <span className={`${base} bg-[var(--color-verified)]/15 text-[var(--color-verified)]`}>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }

  if (state === 'active') {
    return (
      <span className={`${base} bg-[var(--color-action)]/15 text-[var(--color-action)]`}>
        {/*
          The ping ring draws the eye to the step that is moving.
          Durations are set inline rather than through Tailwind classes: the
          animate-* utilities write the `animation` shorthand, and a class-based
          [animation-duration:…] override loses to it in the cascade, so the
          animation kept running at the default 1s. Inline style wins.
        */}
        <span
          className="absolute inset-0 rounded-full bg-[var(--color-action)]/30 motion-safe:animate-ping"
          style={{ animationDuration: '3s' }}
        />
        <span className="relative inline-flex motion-safe:animate-spin" style={{ animationDuration: '2.6s' }}>
          <Loader2 className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`${base} border border-white/10 bg-white/[0.03] font-mono text-[11px] text-[#6b7383]`}
    >
      {index + 1}
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
        : 'border-white/10 bg-white/[0.02] text-[#5b6474]';

  return (
    <span
      className={`flex-none rounded-md border px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.14em] transition-colors duration-300 ${tone}`}
    >
      {label}
    </span>
  );
}
