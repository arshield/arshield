'use client';

import { FileLock2, Fingerprint, Radio, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { Reveal } from './reveal';

/**
 * Bento grid — deliberately uneven cells so the section doesn't read as
 * another 3-identical-cards block. Two wide tiles carry the product story,
 * the rest are compact facts.
 */

export function BentoFeatures() {
  return (
    <div className="grid gap-3.5 md:grid-cols-6">
      {/* Wide: the two-door identity */}
      <Reveal className="md:col-span-4">
        <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors duration-300 hover:border-brand-gold/25">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(209,164,19,0.12),transparent_70%)] blur-2xl" />
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-brand-gold/25 bg-brand-gold/[0.07]">
            <Fingerprint className="h-4.5 w-4.5 text-brand-gold" />
          </span>
          <h3 className="mt-4 text-[17px] font-semibold text-[#eef1f6]">One identity, two doors</h3>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-[#8a93a3]">
            A wallet signature derives your keypair deterministically; a passphrase-wrapped key file holds a random one.
            Seal in the browser, open in your agent — same keys, same <span className="font-mono text-[12.5px] text-[#c7cdd8]">.arshield</span> format, no export step.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['EIP-191 personal_sign', 'Argon2id t=3 m=64MB', 'same core as MCP'].map((t) => (
              <span key={t} className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 font-mono text-[10.5px] text-[#8a93a3]">
                {t}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Tall: zero backend */}
      <Reveal delay={0.06} className="md:col-span-2">
        <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors duration-300 hover:border-white/15">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/[0.03]">
            <ShieldCheck className="h-4.5 w-4.5 text-[#6ee7a8]" />
          </span>
          <h3 className="mt-4 text-[17px] font-semibold text-[#eef1f6]">No server, no plaintext</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#8a93a3]">
            The web app is a static export. The MCP server runs on your machine. There is no ArShield backend to breach,
            subpoena, or leak.
          </p>
          <div className="mt-5 font-mono text-[11px] text-[#5b6474]">
            0 requests to our servers
          </div>
        </div>
      </Reveal>

      {/* Compact tiles */}
      {[
        { icon: FileLock2, title: 'Post-quantum by default', body: 'Not an opt-in mode. Every envelope is hybrid from the first byte.' },
        { icon: Terminal, title: 'MCP-native', body: 'Six tools over stdio for Claude, Cursor, and any MCP client.' },
        { icon: Zap, title: 'In-browser speed', body: 'ML-KEM-768 + X25519 run client-side in pure JS/WASM-free code.' },
        { icon: Radio, title: 'Seals you can verify', body: 'A Quantum Seal PNG carries the envelope digest for offline checking.' },
      ].map((c, i) => (
        <Reveal key={c.title} delay={0.1 + i * 0.05} className="md:col-span-3 lg:col-span-3">
          <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors duration-300 hover:border-white/15">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-white/10 bg-white/[0.03]">
                <c.icon className="h-4 w-4 text-[#c7cdd8]" />
              </span>
              <div>
                <h3 className="text-[14.5px] font-semibold text-[#eef1f6]">{c.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8a93a3]">{c.body}</p>
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}