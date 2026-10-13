'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FileLock2, FileText, ShieldCheck } from 'lucide-react';

/**
 * Hero's live panel: a looping, real-looking seal → sign → verify cycle.
 * It walks a file through the actual pipeline steps so the hero shows the
 * product working instead of a decorative orbit. Pure CSS/SVG motion, pauses
 * when offscreen, respects prefers-reduced-motion.
 */

const STEPS = [
  { key: 'read', label: 'Plaintext', detail: 'note.txt · 1.2 KB', color: '#c7cdd8' },
  { key: 'kem', label: 'ML-KEM-768 + X25519', detail: 'hybrid key agreement', color: '#D1A413' },
  { key: 'aead', label: 'AES-256-GCM', detail: 'sealed payload', color: '#D1A413' },
  { key: 'sign', label: 'ML-DSA-65', detail: 'signature attached', color: '#F5DA99' },
  { key: 'done', label: '.arshield', detail: 'quantum-sealed', color: '#6ee7a8' },
] as const;

const TOTAL = STEPS.length;

function usePrefersReducedMotion(): boolean {
  // Lazy init from matchMedia — no setState inside the effect body.
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

  // Pause the cycle when the panel scrolls out of view.
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
      setStep((s) => (s + 1) % (TOTAL + 1)); // +1 gives a beat on the finished state
    }, period);
    return () => clearInterval(t);
  }, [reduced]);

  const active = Math.min(step, TOTAL - 1);
  const complete = step >= TOTAL;

  return (
    <div ref={ref} className="relative w-full">
      {/* glow behind the panel */}
      <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-[radial-gradient(60%_60%_at_70%_20%,rgba(209,164,19,0.14),transparent_70%)] blur-2xl" />

      <div className="panel relative overflow-hidden p-5 sm:p-6">
        {/* window chrome */}
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3243]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3243]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3243]" />
          <span className="ml-2 font-mono text-[11px] tracking-wide text-[#5b6474]">arshield · seal</span>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b6474]">
            <span className={complete ? 'h-1.5 w-1.5 rounded-full bg-[#6ee7a8]' : 'h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold'} />
            {complete ? 'sealed' : 'working'}
          </span>
        </div>

        {/* the file travelling through the pipeline */}
        <div className="space-y-2.5">
          {STEPS.map((s, i) => {
            const state = i < active ? 'done' : i === active ? 'active' : 'idle';
            return (
              <div
                key={s.key}
                className={
                  'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ' +
                  (state === 'active'
                    ? 'border-brand-gold/45 bg-brand-gold/[0.09]'
                    : state === 'done'
                      ? 'border-white/[0.1] bg-white/[0.03]'
                      : 'border-white/[0.06] bg-white/[0.01] opacity-70')
                }
              >
                <span
                  className="grid h-8 w-8 flex-none place-items-center rounded-lg border transition-colors duration-500"
                  style={{
                    borderColor: state === 'idle' ? 'rgba(255,255,255,0.1)' : `${s.color}66`,
                    background: state === 'idle' ? 'rgba(255,255,255,0.01)' : `${s.color}18`,
                  }}
                >
                  {state === 'done' ? (
                    <Check className="h-3.5 w-3.5" style={{ color: s.color }} />
                  ) : i === 0 ? (
                    <FileText className="h-3.5 w-3.5" style={{ color: s.color }} />
                  ) : i === TOTAL - 1 ? (
                    <ShieldCheck className="h-3.5 w-3.5" style={{ color: s.color }} />
                  ) : (
                    <FileLock2 className="h-3.5 w-3.5" style={{ color: s.color }} />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={'truncate text-[13px] font-medium ' + (state === 'idle' ? 'text-[#939db0]' : 'text-[#f0f2f6]')}>
                      {s.label}
                    </span>
                  </div>
                  <div className={'truncate font-mono text-[10.5px] ' + (state === 'idle' ? 'text-[#6b7484]' : 'text-[#8a93a3]')}>{s.detail}</div>
                </div>

                {/* progress tick on the active row */}
                {state === 'active' && (
                  <span className="relative h-1 w-10 overflow-hidden rounded-full bg-white/10">
                    <span className="absolute inset-y-0 left-0 w-1/2 animate-[arSlide_1.1s_ease-in-out_infinite] rounded-full bg-brand-gold" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* output line */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#03070f] px-3.5 py-2.5">
          <span className="truncate font-mono text-[10.5px] text-[#5b6474]">
            sha256 · {complete ? '9f2c…a41d' : '·······'}
          </span>
          <span
            className={
              'font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors duration-500 ' +
              (complete ? 'text-[#6ee7a8]' : 'text-[#5b6474]')
            }
          >
            {complete ? 'verified ✓' : 'verifying'}
          </span>
        </div>
      </div>
    </div>
  );
}