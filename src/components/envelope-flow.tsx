'use client';

import { useEffect, useRef, useState } from 'react';
import { BRAND_MARK_PATH } from '@/lib/brand-mark';

/**
 * ArShield's signature visual: the mark travelling a route through the five
 * stages of an envelope.
 *
 * Everything here is driven by one shared timeline. The stations, the crypto
 * labels and the travelling mark all read from the same 8-second period, so a
 * station lights up exactly as the mark arrives at it — the pieces are not
 * three separate animations that happen to overlap.
 *
 * Design notes:
 * - the route is a smooth bezier, not a polyline. A zigzag reads as a
 *   flowchart; a curve reads as flow.
 * - each station pulses on when the mark reaches it and stays lit behind it,
 *   so the section accumulates a sense of progress instead of looping flat.
 * - each station carries the primitive that acts there, which both fills the
 *   empty canvas and explains the crypto without a paragraph.
 * - a fading trail follows the mark so movement has direction and weight.
 */

const CYCLE = 8; // seconds for one full pass
const N = 5;

type Station = {
  x: number;
  y: number;
  label: string;
  primitive: string;
  /** fraction of the cycle at which the mark arrives here */
  at: number;
};

const STATIONS: Station[] = [
  { x: 90, y: 208, label: 'FILE', primitive: 'plaintext', at: 0.0 },
  { x: 340, y: 108, label: 'SEAL', primitive: 'ML-KEM-768 + X25519', at: 0.2 },
  { x: 630, y: 216, label: 'AGENT', primitive: 'MCP · stdio', at: 0.4 },
  { x: 925, y: 118, label: 'VERIFY', primitive: 'ML-DSA-65', at: 0.6 },
  { x: 1160, y: 276, label: 'SEALED', primitive: '.arshield', at: 0.85 },
];

/**
 * Smooth path through the stations. Quadratics through the midpoints keep the
 * curve from overshooting the nodes the way a naive Catmull-Rom can.
 */
function smoothRoute(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const mx = (prev.x + cur.x) / 2;
    const my = (prev.y + cur.y) / 2 - (i % 2 === 0 ? 46 : -40);
    d += ` Q${mx} ${my} ${cur.x} ${cur.y}`;
  }
  return d;
}

const ROUTE = smoothRoute(STATIONS);

export function EnvelopeFlow() {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [t, setT] = useState(0); // 0..1 position through the cycle
  const ref = useRef<SVGSVGElement>(null);
  const visible = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One clock for the whole composition. rAF rather than CSS keyframes so the
  // station states and the mark position cannot drift apart.
  useEffect(() => {
    if (reduced) { setT(1); return; }
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      if (visible.current) {
        const elapsed = (now - start) / 1000;
        setT((elapsed % CYCLE) / CYCLE);
      } else {
        start = now - (t * CYCLE * 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const GLYPH = 84;
  const TRAIL = 7; // trail samples behind the mark

  // Station is "lit" once the mark has reached it, and stays lit.
  const lit = STATIONS.map((s) => t >= s.at);
  // The station the mark is currently at or approaching.
  const activeIdx = STATIONS.reduce((best, s, i) => (t >= s.at ? i : best), 0);

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox="0 0 1250 400"
        className="w-full"
        role="img"
        aria-label="The ArShield mark travels from a file through key agreement, the agent, signature verification and out as a sealed .arshield envelope."
      >
        <defs>
          <linearGradient id="env-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d1a413" />
            <stop offset="0.5" stopColor="#f0a13a" />
            <stop offset="1" stopColor="#4ade9b" />
          </linearGradient>
          <linearGradient id="env-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFD86B" />
            <stop offset="0.55" stopColor="#F6B621" />
            <stop offset="1" stopColor="#C98A10" />
          </linearGradient>
          <radialGradient id="env-node-off">
            <stop offset="0" stopColor="#6b5a2a" />
            <stop offset="1" stopColor="#3d3318" />
          </radialGradient>
          <filter id="env-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id="env-tight" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>

          <g id="arshield-glyph">
            <g transform={`scale(${GLYPH / 32}) translate(-16 -16)`}>
              <g transform="translate(0 32) scale(0.00625 -0.00625)">
                <path d={BRAND_MARK_PATH} fill="url(#env-mark)" fillRule="evenodd" />
              </g>
            </g>
          </g>
        </defs>

        {/* ---- route ---------------------------------------------------- */}
        {/* faint base so the whole journey is legible even before it is walked */}
        <path d={ROUTE} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
        {/* the drawn-on portion, dash-animated by the same clock */}
        <path
          d={ROUTE}
          fill="none"
          stroke="url(#env-gold)"
          strokeWidth="1.6"
          strokeDasharray="1000"
          strokeDashoffset={1000 - Math.min(1, t / 0.85) * 1000}
          opacity="0.85"
        />

        {/* ---- crypto labels, one per station --------------------------- */}
        {STATIONS.map((s, i) => {
          const show = lit[i];
          return (
            <text
              key={`p-${s.label}`}
              x={s.x}
              y={s.y + 38}
              textAnchor="middle"
              fontSize="10.5"
              fill={i === N - 1 ? 'rgba(74,222,155,0.85)' : 'rgba(209,164,19,0.8)'}
              fontFamily="ui-monospace, SFMono-Regular, monospace"
              letterSpacing="1.1"
              style={{
                opacity: show ? 1 : 0,
                transition: 'opacity 520ms ease-out',
              }}
            >
              {s.primitive}
            </text>
          );
        })}

        {/* ---- stations ------------------------------------------------- */}
        {STATIONS.map((s, i) => {
          const isLast = i === N - 1;
          const on = lit[i];
          const active = i === activeIdx && t < 0.92;
          const color = isLast ? '#4ade9b' : '#f6b621';
          return (
            <g key={s.label}>
              {/* halo, brightest on the station being reached */}
              {(on || active) && (
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={active ? 30 : 20}
                  fill={isLast ? 'rgba(74,222,155,0.20)' : 'rgba(246,182,33,0.16)'}
                  filter="url(#env-soft)"
                  style={{ transition: 'r 400ms ease-out' }}
                />
              )}
              <circle cx={s.x} cy={s.y} r={on ? 7 : 5} fill={on ? color : 'url(#env-node-off)'}
                style={{ transition: 'r 380ms ease-out, fill 380ms ease-out' }} />
              <circle
                cx={s.x}
                cy={s.y}
                r={on ? 15 : 10}
                fill="none"
                stroke={on ? color : 'rgba(245,218,162,0.22)'}
                strokeWidth={on ? 1.6 : 0.8}
                style={{ transition: 'r 380ms ease-out, stroke 380ms ease-out' }}
              />
              {/* active ring pulse */}
              {active && (
                <circle cx={s.x} cy={s.y} r="15" fill="none" stroke={color} strokeWidth="1.4">
                  <animate attributeName="r" from="15" to="34" dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.7" to="0" dur="1.1s" repeatCount="indefinite" />
                </circle>
              )}
              <text
                x={s.x}
                y={s.y - 28}
                textAnchor="middle"
                fontSize="11"
                fill={on ? (isLast ? 'rgba(74,222,155,0.95)' : 'rgba(246,203,110,0.95)') : 'rgba(150,158,172,0.55)'}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                letterSpacing="1.6"
                style={{ transition: 'fill 380ms ease-out' }}
              >
                {s.label}
              </text>
            </g>
          );
        })}

        {/* ---- trail + travelling mark ---------------------------------- */}
        {!reduced && (
          <>
            <path
              d={ROUTE}
              fill="none"
              stroke="url(#env-mark)"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${1 / TRAIL} ${1 - 1 / TRAIL}`}
              strokeDashoffset={-(t * (1 - 1 / TRAIL))}
              opacity="0.5"
              filter="url(#env-tight)"
            />
            <circle r="46" fill="rgba(246,182,33,0.16)" filter="url(#env-soft)">
              <animateMotion dur={`${CYCLE}s`} repeatCount="indefinite" path={ROUTE} rotate="0" />
            </circle>
            <use href="#arshield-glyph">
              <animateMotion dur={`${CYCLE}s`} repeatCount="indefinite" path={ROUTE} rotate="0" />
            </use>
          </>
        )}

        {reduced && (
          <g transform={`translate(${STATIONS[N - 1].x} ${STATIONS[N - 1].y})`}>
            <use href="#arshield-glyph" />
          </g>
        )}
      </svg>
    </div>
  );
}
