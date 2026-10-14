'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ArShield's signature visual: a plaintext file travelling through the
 * envelope. This replaces the generic "orbital nodes" backdrop — instead of
 * decoration that could belong to any product, it shows *this* product's one
 * promise: a file goes in, an unopenable envelope comes out.
 *
 * The travelling positions are computed from the real node coordinates so the
 * motion reads as one continuous route, not a random float.
 */

const NODES = [
  { x: 90, y: 200, label: 'file' },
  { x: 330, y: 120, label: 'seal' },
  { x: 640, y: 210, label: 'agent' },
  { x: 950, y: 130, label: 'verify' },
  { x: 1160, y: 290, label: 'sealed' },
];

const ROUTE = NODES.map((n, i) => (i === 0 ? `M${n.x} ${n.y}` : ` L${n.x} ${n.y}`)).join('');

export function EnvelopeFlow() {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
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

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox="0 0 1250 400"
        className="w-full"
        role="img"
        aria-label="A file is wrapped into an encrypted envelope, signed, and verified."
      >
        <defs>
          <linearGradient id="env-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d1a413" />
            <stop offset="1" stopColor="#e5a23c" />
          </linearGradient>
          <linearGradient id="env-teal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4ade9b" stopOpacity="0.9" />
            <stop offset="1" stopColor="#4ade9b" stopOpacity="0.25" />
          </linearGradient>
          <radialGradient id="env-node">
            <stop offset="0" stopColor="#f5daa2" />
            <stop offset="1" stopColor="#d1a413" />
          </radialGradient>
          <filter id="env-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* the route: solid up to the last node so the "travelled" feel is clear */}
        <path d={ROUTE} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
        <path
          d={ROUTE}
          fill="none"
          stroke="url(#env-gold)"
          strokeWidth="1.5"
          strokeDasharray="6 10"
          opacity="0.65"
        >
          {!reduced && <animate attributeName="stroke-dashoffset" from="160" to="0" dur="3.2s" repeatCount="indefinite" />}
        </path>

        {/* the travelling envelope: small rounded rect that visibly closes,
            scaled up + given a glow so the transformation can't be missed */}
        {!reduced && (
          <>
            <circle r="18" fill="rgba(245,218,162,0.16)" filter="url(#env-soft)">
              <animateMotion dur="7s" repeatCount="indefinite" path={ROUTE} />
            </circle>
            <g>
              <rect x="-20" y="-14" width="40" height="28" rx="5" fill="#0a1120" stroke="#f5daa2" strokeWidth="2" />
              <path id="env-flap" d="M-20 -14 L0 3 L20 -14" fill="none" stroke="#f5daa2" strokeWidth="2" />
              <animateMotion dur="7s" repeatCount="indefinite" path={ROUTE} rotate="0" />
            </g>
          </>
        )}

        {/* nodes with labels, each shown as a station on the route */}
        {NODES.map((n, i) => {
          const last = i === NODES.length - 1;
          return (
            <g key={n.label}>
              {last && <circle cx={n.x} cy={n.y} r="20" fill="rgba(74,222,155,0.16)" filter="url(#env-soft)" />}
              <circle cx={n.x} cy={n.y} r={last ? 7 : 5} fill={last ? '#4ade9b' : 'url(#env-node)'} />
              <circle
                cx={n.x}
                cy={n.y}
                r={last ? 13 : 10}
                fill="none"
                stroke={last ? 'rgba(74,222,155,0.5)' : 'rgba(245,218,162,0.3)'}
                strokeWidth="0.8"
              />
              <text
                x={n.x}
                y={n.y - 24}
                textAnchor="middle"
                fontSize="11"
                fill={last ? 'rgba(74,222,155,0.85)' : 'rgba(199,205,216,0.6)'}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                letterSpacing="1.6"
              >
                {n.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
