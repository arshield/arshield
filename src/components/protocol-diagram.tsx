'use client';

import { Reveal } from './reveal';

/**
 * The crypto pipeline, drawn as a real flow diagram. This is the section the
 * page was missing: it explains *how* the envelope is built instead of just
 * claiming it. Left-to-right on desktop, stacked on mobile.
 */

const NODES = [
  {
    tag: 'INPUT',
    title: 'Your file',
    body: 'Read in the browser. Never uploaded.',
    detail: 'plaintext bytes',
  },
  {
    tag: 'KEY AGREEMENT',
    title: 'ML-KEM-768 + X25519',
    body: 'Two independent KEMs run side by side, then their secrets are combined.',
    detail: 'HKDF-SHA256 → 32-byte key',
    accent: true,
  },
  {
    tag: 'ENCRYPTION',
    title: 'AES-256-GCM',
    body: 'Payload sealed with the derived key and a random 96-bit nonce.',
    detail: 'authenticated ciphertext',
  },
  {
    tag: 'SIGNATURE',
    title: 'ML-DSA-65',
    body: 'The whole envelope is signed, header included, so tampering is detectable.',
    detail: '3,309-byte signature',
    accent: true,
  },
  {
    tag: 'OUTPUT',
    title: '.arshield',
    body: 'One portable container. Opens anywhere with your wallet or key file.',
    detail: 'stored on your device',
    good: true,
  },
];

export function ProtocolDiagram() {
  return (
    <div className="relative">
      {/* connector track behind the nodes */}
      <div className="pointer-events-none absolute left-[10%] right-[10%] top-[3.15rem] hidden h-px bg-gradient-to-r from-brand-gold/10 via-brand-gold/35 to-[#6ee7a8]/25 lg:block" />

      <div className="grid gap-3 lg:grid-cols-5">
        {NODES.map((n, i) => (
          <Reveal key={n.title} delay={i * 0.08}>
            <div className="group relative h-full">
              {/* connector chevron between nodes */}
              {i < NODES.length - 1 && (
                <span className="pointer-events-none absolute -right-[0.72rem] top-[2.65rem] hidden h-2.5 w-2.5 rotate-45 border-r border-t border-brand-gold/40 lg:block" aria-hidden />
              )}
              {/* step index */}
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={
                    'relative grid h-6 w-6 place-items-center rounded-full border font-mono text-[10px] font-semibold ' +
                    (n.good
                      ? 'border-[#6ee7a8]/40 bg-[#6ee7a8]/10 text-[#6ee7a8]'
                      : n.accent
                        ? 'border-brand-gold/40 bg-brand-gold/10 text-brand-gold'
                        : 'border-white/12 bg-white/[0.03] text-[#8a93a3]')
                  }
                >
                  {i + 1}
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b6474]">{n.tag}</span>
              </div>

              <div
                className={
                  'h-full rounded-2xl border p-4 transition-colors duration-300 ' +
                  (n.good
                    ? 'border-[#6ee7a8]/25 bg-[#6ee7a8]/[0.04] hover:border-[#6ee7a8]/40'
                    : n.accent
                      ? 'border-brand-gold/20 bg-brand-gold/[0.035] hover:border-brand-gold/35'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15')
                }
              >
                <h3 className={'text-[14.5px] font-semibold ' + (n.good ? 'text-[#a7f3c9]' : 'text-[#eef1f6]')}>{n.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8a93a3]">{n.body}</p>
                <div className="mt-3 border-t border-white/[0.06] pt-2.5 font-mono text-[10.5px] text-[#6b7484]">{n.detail}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.5}>
        <p className="mt-6 text-center font-mono text-[11px] tracking-wide text-[#5b6474]">
          trust <span className="text-brand-gold">ML-KEM-768</span> · <span className="text-brand-gold">X25519</span> ·{' '}
          <span className="text-brand-gold">ML-DSA-65</span> · <span className="text-brand-gold">AES-256-GCM</span> — each
          one has to hold for the file to open.
        </p>
      </Reveal>
    </div>
  );
}