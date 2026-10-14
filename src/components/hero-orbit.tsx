'use client';

import { useMemo } from 'react';

/**
 * Hero backdrop, but load-bearing: the curves are data routes and the gold
 * nodes are the actual surfaces (file → seal → agent → verify). A couple of
 * nodes pulse and a packet travels one route, so the graphic reads as the
 * product's flow rather than generic "space" decoration.
 *
 * Deterministic layout (hash-based) so SSR and client agree — no hydration drift.
 */
const LABELLED = [
  { x: 205, y: 214, t: 'file', blink: false },
  { x: 430, y: 128, t: 'seal', blink: true },
  { x: 745, y: 132, t: 'agent', blink: false },
  { x: 985, y: 226, t: 'verify', blink: true },
  { x: 690, y: 470, t: 'key', blink: false },
];

export function HeroOrbit() {
  const particles = useMemo(() => {
    const out: { cx: number; cy: number; r: number; o: number }[] = [];
    const rnd = (n: number) => {
      const s = Math.sin(n * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    };
    let k = 0;
    const ellipses = [
      { rx: 560, ry: 190, rot: 0, count: 18, cy: 320 },
      { rx: 430, ry: 150, rot: -8, count: 11, cy: 300 },
      { rx: 300, ry: 110, rot: 10, count: 7, cy: 350 },
    ];
    for (const e of ellipses) {
      for (let i = 0; i < e.count; i++) {
        const t = (i / e.count) * Math.PI * 2 + e.rot * 0.05;
        const x = 600 + e.rx * Math.cos(t);
        const y = e.cy + e.ry * Math.sin(t);
        out.push({ cx: x, cy: y, r: 2.4 + rnd(k++) * 1.5, o: 0.3 + rnd(k++) * 0.5 });
      }
    }
    return out;
  }, []);

  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] w-full opacity-[0.28] mix-blend-screen"
      viewBox="0 0 1200 640"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="neutron-gold">
          <stop offset="0" stopColor="#F5DAA2" />
          <stop offset="0.6" stopColor="#D1A413" />
          <stop offset="1" stopColor="#D1A413" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="route-line" x1="0" y1="0" x2="1200" y2="640" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#D1A413" stopOpacity="0.12" />
          <stop offset="1" stopColor="#D1A413" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Route curves */}
      <g fill="none" stroke="url(#route-line)" strokeWidth="1">
        <ellipse cx="600" cy="320" rx="560" ry="190" />
        <ellipse cx="600" cy="300" rx="430" ry="150" transform="rotate(-8 600 300)" />
        <ellipse cx="600" cy="350" rx="300" ry="110" transform="rotate(10 600 350)" />
      </g>

      {/* Faint outer grid */}
      <g fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" strokeDasharray="2 6">
        <ellipse cx="600" cy="330" rx="640" ry="240" />
        <ellipse cx="600" cy="330" rx="720" ry="300" />
      </g>

      {/* The travelled route: a packet rides from file → seal → agent → verify. */}
      <path
        id="arshield-route"
        d="M205 214 C300 150 360 130 430 128 S660 130 745 132 S900 170 985 226"
        fill="none"
        stroke="rgba(209,164,19,0.22)"
        strokeWidth="1.25"
      />
      <circle r="3.4" fill="#F5DAA2">
        <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" path="M205 214 C300 150 360 130 430 128 S660 130 745 132 S900 170 985 226" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur="6s" repeatCount="indefinite" />
      </circle>

      {/* Particles */}
      <g>
        {particles.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="url(#neutron-gold)" opacity={p.o} />
        ))}
      </g>

      {/* Functional nodes + labels */}
      <g>
        {LABELLED.map((n) => (
          <g key={n.t}>
            <circle
              cx={n.x}
              cy={n.y}
              r="4"
              fill="#F5DAA2"
              className={n.blink ? 'animate-node-blink' : undefined}
              style={n.blink ? { transformOrigin: `${n.x}px ${n.y}px` } : undefined}
            />
            <circle cx={n.x} cy={n.y} r="9" fill="none" stroke="rgba(245,218,162,0.28)" strokeWidth="0.8" />
            <text
              x={n.x}
              y={n.y - 15}
              textAnchor="middle"
              className="font-mono"
              fontSize="10"
              fill="rgba(199,205,216,0.55)"
              letterSpacing="0.14em"
            >
              {n.t.toUpperCase()}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}