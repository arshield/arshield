'use client';

import { Reveal } from './reveal';

/**
 * The crypto pipeline as a real flow diagram.
 *
 * Layout: a fixed 5-column stretch grid; every cell is a flex column so the
 * cards share one height and their bottom metadata lines up.
 *
 * Color follows the semantic tokens: the two "work" steps (key agreement,
 * signature) read amber-ish gold, and the OUTPUT card — the one that
 * represents a passed check — is teal, never gold.
 */

const NODES = [
  {
    tag: 'INPUT',
    title: 'Your file',
    body: 'Read in the browser. Never uploaded.',
    detail: 'plaintext bytes',
    tone: 'plain' as const,
  },
  {
    tag: 'KEY AGREEMENT',
    title: 'ML-KEM-768 + X25519',
    body: 'Two independent KEMs run side by side, then their secrets are combined.',
    detail: 'HKDF-SHA256 → 32-byte key',
    tone: 'work' as const,
  },
  {
    tag: 'ENCRYPTION',
    title: 'AES-256-GCM',
    body: 'Payload sealed with the derived key and a random 96-bit nonce.',
    detail: 'authenticated ciphertext',
    tone: 'plain' as const,
  },
  {
    tag: 'SIGNATURE',
    title: 'ML-DSA-65',
    body: 'The whole envelope is signed, header included, so tampering is detectable.',
    detail: '3,309-byte signature',
    tone: 'work' as const,
  },
  {
    tag: 'OUTPUT',
    title: '.arshield',
    body: 'One portable container. Opens anywhere with your wallet or key file.',
    detail: 'stored on your device',
    tone: 'verified' as const,
  },
];

const TONE = {
  plain: {
    card: 'border-white/[0.08] bg-white/[0.02] hover:border-white/20',
    badge: 'border-white/15 bg-white/[0.03] text-[var(--color-idle)]',
    title: 'text-[#eef1f6]',
  },
  work: {
    card: 'border-[var(--color-progress)]/20 bg-[var(--color-progress-soft)] hover:border-[var(--color-progress)]/40',
    badge: 'border-[var(--color-progress)]/45 bg-[var(--color-progress-soft)] text-[var(--color-progress)]',
    title: 'text-[#f6e7cf]',
  },
  verified: {
    card: 'border-[var(--color-verified)]/25 bg-[var(--color-verified-soft)] hover:border-[var(--color-verified)]/45',
    badge: 'border-[var(--color-verified)]/45 bg-[var(--color-verified-soft)] text-[var(--color-verified)]',
    title: 'text-[#d9f7e8]',
  },
};

export function ProtocolDiagram() {
  return (
    <div className="relative">
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {NODES.map((n, i) => {
          const t = TONE[n.tone];
          return (
            <Reveal key={n.title} delay={i * 0.08} className="h-full">
              <div className="relative flex h-full flex-col">
                <div className="mb-3 flex h-6 items-center gap-2">
                  <span className={'grid h-6 w-6 flex-none place-items-center rounded-full border font-mono text-[10px] font-semibold ' + t.badge}>
                    {i + 1}
                  </span>
                  <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b6474]">
                    {n.tag}
                  </span>
                </div>

                <div className={'flex flex-1 flex-col rounded-2xl border p-4 transition-colors duration-300 ' + t.card}>
                  <h3 className={'text-[14.5px] font-semibold leading-snug ' + t.title}>{n.title}</h3>
                  <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-[#8a93a3]">{n.body}</p>
                  <div className="mt-4 border-t border-white/[0.07] pt-2.5 font-mono text-[10.5px] leading-relaxed text-[#6b7484]">
                    {n.detail}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.5}>
        <p className="mt-8 text-center font-mono text-[11px] leading-relaxed tracking-wide text-[#5b6474]">
          an attacker must break <span className="text-[var(--color-progress)]">ML-KEM-768</span> ·{' '}
          <span className="text-[var(--color-progress)]">X25519</span> ·{' '}
          <span className="text-[var(--color-progress)]">ML-DSA-65</span> ·{' '}
          <span className="text-[var(--color-progress)]">AES-256-GCM</span> — every one of them to open a single file.
        </p>
      </Reveal>
    </div>
  );
}