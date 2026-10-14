'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FileLock2, FileText, ShieldCheck } from 'lucide-react';

/**
 * Hero's live panel: a looping seal → sign → verify cycle.
 *
 * Color is semantic here, which is the whole point of this pass:
 *   idle     -> slate, dimmed            (nothing happening yet)
 *   active   -> amber, with a moving tick (work in flight)
 *   done     -> teal, row filled          (check passed)
 *   sealed   -> teal, strong              (the finished envelope)
 * Gold is reserved for the single CTA on the page, not for state.
 */

type State = 'idle' | 'active' | 'done';

const STEPS = [
  { key: 'read', label: 'Plaintext', detail: 'note.txt · 1.2 KB' },
  { key: 'kem', label: 'ML-KEM-768 + X25519', detail: 'hybrid key agreement' },
  { key: 'aead', label: 'AES-256-GCM', detail: 'sealed payload' },
  { key: 'sign', label: 'ML-DSA-65', detail: 'signature attached' },
  { key: 'done', label: '.arshield', detail: 'quantum-sealed' },
] as const;

const TOTAL = STEPS.length;

const ROW: Record<State, string> = {
  idle: 'border-white/[0.06] bg-white/[0.01] opacity-60',
  active: 'border-[var(--color-progress)]/45 bg-[var(--color-progress-soft)]',
  done: 'border-[var(--color-verified)]/30 bg-[var(--color-verified-soft)]',
};

const ICON_BOX: Record<State, string> = {
  idle: 'border-white/10 text-[var(--color-idle)]',
  active: 'border-[var(--color-progress)]/50 text-[var(--color-progress)]',
  done: 'border-[var(--color-verified)]/45 text-[var(--color-verified)]',
};

const LABEL: Record<State, string> = {
  idle: 'text-[#8d97a9]',
  active: 'text-[#f4f6f9]',
  done: 'text-[#dff6ea]',
};

const DETAIL: Record<State, string> = {
  idle: 'text-[#68717f]',
  active: 'text-[#c99a5e]',
  done: 'text-[var(--color-verified)]/80',
};

const STATUS_LABEL = ['READING', 'AGREEING', 'SEALING', 'SIGNING', 'SEALED'] as const;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export function HeroPanel() {
  const [step, setStep] = useState(0);
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const period = reduced ? 2600 : 1150;
    const t = setInterval(() => {
      if (!visible.current) return;
      setStep((s) => (s + 1) % (TOTAL + 1));
    }, period);
    return () => clearInterval(t);
  }, [reduced]);

  const active = Math.min(step, TOTAL - 1);
  const sealed = step >= TOTAL;
  const stateOf = (i: number): State => (i < active || sealed ? 'done' : i === active ? 'active' : 'idle');
  const statusText = sealed ? 'SEALED' : STATUS_LABEL[active];

  return (
    <div ref={ref} className="relative w-full">
      <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-[radial-gradient(60%_60%_at_70%_20%,rgba(209,164,19,0.12),transparent_70%)] blur-2xl" />

      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3243]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3243]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3243]" />
          <span className="ml-2 font-mono text-[11px] tracking-wide text-[#5b6474]">arshield · seal</span>
          <span
            className={
              'ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-500 ' +
              (sealed
                ? 'border-[var(--color-verified)]/45 bg-[var(--color-verified-soft)] text-[var(--color-verified)]'
                : 'border-[var(--color-progress)]/35 bg-[var(--color-progress-soft)] text-[var(--color-progress)]')
            }
          >
            <span
              className={
                'h-1.5 w-1.5 rounded-full ' +
                (sealed ? 'bg-[var(--color-verified)]' : 'animate-pulse bg-[var(--color-progress)]')
              }
            />
            {statusText}
          </span>
        </div>

        <div className="space-y-2.5">
          {STEPS.map((s, i) => {
            const st = stateOf(i);
            return (
              <div key={s.key} className={'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ' + ROW[st]}>
                <span className={'grid h-8 w-8 flex-none place-items-center rounded-lg border transition-colors duration-500 ' + ICON_BOX[st]}>
                  {st === 'done' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : i === 0 ? (
                    <FileText className="h-3.5 w-3.5" />
                  ) : i === TOTAL - 1 ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <FileLock2 className="h-3.5 w-3.5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <span className={'block truncate text-[13px] font-medium transition-colors duration-500 ' + LABEL[st]}>{s.label}</span>
                  <span className={'block truncate font-mono text-[10.5px] transition-colors duration-500 ' + DETAIL[st]}>{s.detail}</span>
                </div>

                {st === 'active' && (
                  <span className="relative h-1 w-10 overflow-hidden rounded-full bg-white/10">
                    <span className="absolute inset-y-0 left-0 w-1/2 animate-[arSlide_1.1s_ease-in-out_infinite] rounded-full bg-[var(--color-progress)]" />
                  </span>
                )}
                {st === 'done' && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-verified)]/70">ok</span>
                )}
              </div>
            );
          })}
        </div>

        <div
          className={
            'mt-4 flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors duration-500 ' +
            (sealed
              ? 'border-[var(--color-verified)]/35 bg-[var(--color-verified-soft)]'
              : 'border-white/[0.06] bg-[#03070f]')
          }
        >
          <span className="truncate font-mono text-[10.5px] text-[#5b6474]">
            sha256 · {sealed ? '9f2c…a41d' : '·······'}
          </span>
          <span
            className={
              'font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors duration-500 ' +
              (sealed ? 'text-[var(--color-verified)]' : 'text-[var(--color-idle)]')
            }
          >
            {sealed ? 'verified ✓' : 'verifying'}
          </span>
        </div>
      </div>
    </div>
  );
}