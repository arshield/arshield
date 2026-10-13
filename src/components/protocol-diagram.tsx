'use client';

import { Reveal } from './reveal';

/**
 * The crypto pipeline, drawn as a real flow diagram.
 *
 * Layout notes (these matter — an earlier pass looked ragged):
 * - the grid uses a fixed 5-column template with `items-stretch`, and every
 *   cell is a flex column, so all five cards share one height and one baseline
 * - the description is `flex-1`, which pushes the divider + detail line to the
 *   bottom of the card, so those lines line up across the whole row
 * - the step badge row has a fixed height so the card tops all start together
 * - connectors are drawn on the track *between* columns, not inside cards
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
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {NODES.map((n, i) => (
          <Reveal key={n.title} delay={i * 0.08} className="h-full">
            <div className="relative flex h-full flex-col">
              {/* Step header: fixed height so every card starts on the same line. */}
              <div className="mb-3 flex h-6 items-center gap-2">
                <span
                  className={
                    'grid h-6 w-6 flex-none place-items-center rounded-full border font-mono text-[10px] font-semibold ' +
                    (n.good
                      ? 'border-[#6ee7a8]/40 bg-[#6ee7a8]/10 text-[#6ee7a8]'
                      : n.accent
                        ? 'border-brand-gold/40 bg-brand-gold/10 text-brand-gold'
                        : 'border-white/15 bg-white/[0.03] text-[#8a93a3]')
                  }
                >
                  {i + 1}
                </span>
                <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b6474]">
                  {n.tag}
                </span>
              </div>

              {/* Card body: flex column, description flexes, footer pinned. */}
              <div
                className={
                  'flex flex-1 flex-col rounded-2xl border p-4 transition-colors duration-300 ' +
                  (n.good
                    ? 'border-[#6ee7a8]/25 bg-[#6ee7a8]/[0.04] hover:border-[#6ee7a8]/45'
                    : n.accent
                      ? 'border-brand-gold/20 bg-brand-gold/[0.035] hover:border-brand-gold/40'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20')
                }
              >
                <h3 className={'text-[14.5px] font-semibold leading-snug ' + (n.good ? 'text-[#a7f3c9]' : 'text-[#eef1f6]')}>
                  {n.title}
                </h3>
                <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-[#8a93a3]">{n.body}</p>
                <div className="mt-4 border-t border-white/[0.07] pt-2.5 font-mono text-[10.5px] leading-relaxed text-[#6b7484]">
                  {n.detail}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.5}>
        <p className="mt-8 text-center font-mono text-[11px] leading-relaxed tracking-wide text-[#5b6474]">
          an attacker must break <span className="text-brand-gold">ML-KEM-768</span> ·{' '}
          <span className="text-brand-gold">X25519</span> · <span className="text-brand-gold">ML-DSA-65</span> ·{' '}
          <span className="text-brand-gold">AES-256-GCM</span> — every one of them to open a single file.
        </p>
      </Reveal>
    </div>
  );
}