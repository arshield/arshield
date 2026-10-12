'use client';

import { useMemo } from 'react';

/**
 * Hero orbital backdrop: elliptical data-route curves with gold particles ("neutrons")
 * sitting along them, over a faint dotted orbital grid. Matches QuantSafe's hero SVG
 * (viewBox 0 0 1200 640, circles filled with a gold radial gradient).
 */
export function HeroOrbit() {
  const particles = useMemo(() => {
    const out: { cx: number; cy: number; r: number; o: number }[] = [];
    // Deterministic pseudo-random so SSR and client render identically (no hydration drift).
    const rnd = (n: number) => {
      const s = Math.sin(n * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    };
    let k = 0;
    const ellipses = [
      { rx: 560, ry: 190, rot: 0, count: 16, cy: 320 },
      { rx: 430, ry: 150, rot: -8, count: 10, cy: 300 },
      { rx: 300, ry: 110, rot: 10, count: 6, cy: 350 },
    ];
    for (const e of ellipses) {
      for (let i = 0; i < e.count; i++) {
        const t = (i / e.count) * Math.PI * 2 + e.rot * 0.05;
        const x = 600 + e.rx * Math.cos(t);
        const y = e.cy + e.ry * Math.sin(t);
        out.push({ cx: x, cy: y, r: 2.6 + rnd(k++) * 1.6, o: 0.35 + rnd(k++) * 0.6 });
      }
    }
    return out;
  }, []);

  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] w-full opacity-[0.55] mix-blend-screen"
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
          <stop stopColor="#3B82F6" stopOpacity="0.10" />
          <stop offset="0.5" stopColor="#D1A413" stopOpacity="0.10" />
          <stop offset="1" stopColor="#D1A413" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Elliptical route curves */}
      <g fill="none" stroke="url(#route-line)" strokeWidth="1">
        <ellipse cx="600" cy="320" rx="560" ry="190" />
        <ellipse cx="600" cy="300" rx="430" ry="150" transform="rotate(-8 600 300)" />
        <ellipse cx="600" cy="350" rx="300" ry="110" transform="rotate(10 600 350)" />
      </g>

      {/* Dotted orbital grid arcs */}
      <g fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 6">
        <ellipse cx="600" cy="330" rx="640" ry="240" />
        <ellipse cx="600" cy="330" rx="720" ry="300" />
      </g>

      {/* Gold particles */}
      <g>
        {particles.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="url(#neutron-gold)" opacity={p.o} />
        ))}
      </g>
    </svg>
  );
}