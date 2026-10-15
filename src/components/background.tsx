/**
 * Fixed full-page background: near-black navy with blue + gold radial glows and a
 * faint grid, matching ArShield. Two drifting orbs give the cinematic motion.
 *
 * The grid creeps upward very slowly. At 90s for a 64px tile it is far below the
 * threshold of noticing the movement as movement — the effect is that the
 * surface never reads as a flat image, which is what a static grid looked like
 * next to the drifting glows. The drift is hidden from reduced-motion users.
 */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020610]">
      {/* Blue glow upper-left/center */}
      <div
        className="animate-drift-slow absolute -left-[10%] top-[-8%] h-[52rem] w-[52rem] rounded-full opacity-70"
        style={{
          background:
            'radial-gradient(circle at center, rgba(28,68,140,0.30), rgba(10,26,60,0.12) 45%, transparent 70%)',
        }}
      />
      {/* Gold glow right */}
      <div
        className="animate-drift absolute right-[-12%] top-[6%] h-[44rem] w-[44rem] rounded-full opacity-60"
        style={{
          background:
            'radial-gradient(circle at center, rgba(209,164,19,0.16), rgba(122,95,10,0.06) 50%, transparent 72%)',
        }}
      />
      {/* Deep gold glow lower-center */}
      <div
        className="absolute left-1/2 top-[55%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle at center, rgba(160,120,15,0.12), transparent 70%)',
        }}
      />
      {/* Technical grid, creeping upward. One extra tile of height so the tile
          boundary never scrolls into view. */}
      <div
        className="absolute -top-[64px] left-0 h-[calc(100%+128px)] w-full opacity-[0.16] motion-safe:animate-[as-grid_90s_linear_infinite]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 30%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black, transparent 75%)',
        }}
      />
    </div>
  );
}