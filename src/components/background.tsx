/**
 * Fixed full-page background: near-black navy with blue + gold radial glows and a
 * faint grid, matching QuantSafe. Two drifting orbs give the cinematic motion.
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
      {/* Faint technical grid */}
      <div
        className="absolute inset-0 opacity-[0.16]"
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