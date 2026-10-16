'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Copy, Shield as ShieldIcon, ShieldCheck, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Background } from '@/components/background';
import { HeroOrbit } from '@/components/hero-orbit';
import { HeroPanel } from '@/components/hero-panel';
import { EnvelopeFlow } from '@/components/envelope-flow';
import { ProtocolDiagram } from '@/components/protocol-diagram';
import { BentoFeatures } from '@/components/bento-features';
import { PaperBand } from '@/components/paper-band';
import { Magnetic } from '@/components/motion-bits';
import { useParallax } from '@/lib/use-parallax';
import { Reveal, HeroItem } from '@/components/reveal';
import { Section } from '@/components/section';
import { cn } from '@/lib/utils';

/* ---------- Data ---------- */
const STANDARDS = [
  ['NIST FIPS 203', 'ML-KEM-768'],
  ['NIST FIPS 204', 'ML-DSA-65'],
  ['RFC 7748', 'X25519'],
  ['NIST SP 800-38D', 'AES-256-GCM'],
  ['MCP', 'AGENT INTERFACE'],
  ['x402', 'AGENT PAYMENTS'],
  ['ARC', '$ARSHIELD TIERS'],
  ['@noble', 'OPEN-SOURCE CRYPTO'],
];

const TIERS = [
  { name: 'Free', req: 'No $arshield needed', blurb: 'For first envelopes and the occasional file.', enc: '3 / 24h', size: '25 MB', cta: 'Start free' },
  { name: 'Holder', req: '≥ $20 in $arshield', blurb: 'For daily use: more files a day, and bigger ones.', enc: '25 / 24h', size: '100 MB', badge: 'FIRST HOLDER TIER', cta: 'How tiers work' },
  { name: 'Pro', req: '≥ $100 in $arshield', blurb: 'For heavy daily use and large archives.', enc: '250 / 24h', size: '1 GB', cta: 'How tiers work' },
  { name: 'Whale', req: '≥ $1,000 in $arshield', blurb: 'No daily cap and no tier cap on file size.', enc: 'Unlimited', size: 'No tier cap', cta: 'How tiers work' },
];

const FAQS = [
  { q: 'Who is ArShield for, humans or agents?', a: "Both. Humans use the web app at /app: drag a file, get a .arshield envelope. Agents use the MCP server, a local stdio process that Claude Desktop, Cursor or your own runtime calls as arshield_encrypt_file, arshield_sign_x402 and four more tools. Same crypto, same envelope, same .arshield binary format." },
  { q: 'What is bunker mode, and where does ArShield fit?', a: 'Bunker mode is a plan being discussed across crypto: move coins to addresses whose public key has never been revealed, in case elliptic curves fall early, to AI or to quantum computers. It protects coins. It does nothing for data: a file copied today stays copied. ArShield seals your files post-quantum, on your device. Seal them to a freshly generated key file and a copy taken today still needs ML-KEM-768 broken to open.' },
  { q: 'What’s x402?', a: 'HTTP 402 Payment Required, brought back by Coinbase as a protocol for agents to pay APIs in stablecoins. The MCP tool arshield_sign_x402 signs any x402 payment payload with ML-DSA-65 under its own context, so anyone holding the agent’s public key and the payload can check which key signed a receipt; /mcp documents the exact bytes that are signed and where the signing key sits in the public key. Sealing every paid call on its own is what Shield is for, and Shield is on the roadmap.' },
  { q: 'How do I use the MCP server?', a: 'The server runs over stdio inside your own agent runtime and exposes six tools: arshield_encrypt_file, arshield_decrypt_file, arshield_send_message, arshield_decrypt_message, arshield_verify_seal and arshield_sign_x402. Keys come from a passphrase-protected key file (keyfile_path, which the server reads from disk, or keyfile_json, plus its passphrase), or from signature_hex plus the address that made it: your EOA wallet’s 65-byte signature of the ArShield derivation message, passed only over local stdio. So a file you encrypt in /app with your wallet opens in your agent with that wallet’s signature, no key export needed.' },
  { q: 'What does quantum-safe actually mean?', a: 'It means the cryptography is designed to resist attacks from both classical and quantum computers. ArShield uses ML-KEM-768 and ML-DSA-65, the standards chosen by NIST in FIPS 203 and 204. To guard against unknown weaknesses in any single algorithm, we combine ML-KEM with classical X25519 in a hybrid scheme, an attacker has to break both.' },
  { q: 'Do I need a wallet?', a: 'No. A wallet is the fastest path, and it’s what powers token-gated tiers and Seal anchoring on ARC. Your keys come from one wallet signature, so they can be reproduced only if the wallet signs the same way every time — the app reads the signature back and refuses if it does not recover to the connected address. MPC and threshold signers that produce a different signature each time will fail that check, which is the intended behaviour. For files that must outlast your wallet’s curve, generate a passphrase-protected key file instead: its keys are random and never touch your wallet’s signature, so if curves fall, an attacker still has to break ML-KEM-768 too. Agents pass a key file, or the same wallet signature, to the MCP server.' },
  { q: 'Can ArShield read my files?', a: 'No. The web app is a static site and the MCP server runs in your own agent runtime. Every byte is encrypted and decrypted on your device, and no server of ours ever receives your files, their names or your keys. We hold no plaintext and no keys, so there is nothing to hand over. Like any web app, the browser side is only as safe as the code our site serves.' },
  { q: 'What happens if I lose my wallet or key?', a: 'Without the wallet or the key file, your files are unrecoverable. There is no server copy and no reset, that’s the whole point of zero-knowledge. A wallet-derived key comes back from the same wallet signature, so the practical backup of the wallet path is the wallet itself. If you would rather not depend on that, generate a passphrase-protected key file from the key-source screen: it holds random keys and opens your files on its own. Store the file and its passphrase somewhere safe.' },
  { q: 'Why a token?', a: 'Holding $arshield on ARC raises the two limits the web app enforces: from 3 encryptions a day on Free to 25, 250 or no daily cap, and from 25 MB files to 100 MB, 1 GB or no tier cap. Encryption, Quantum Seals, messages, the MCP server and wallet or key file mode are open to every tier. No subscriptions, no accounts, just a wallet balance. Until the token launches, every wallet is on the Free tier.' },
];

/* ---------- Page ---------- */
export default function HomePage() {
  return (
    <>
      <Background />
      <Header />
      <main className="relative">
        <Hero />
        <Standards />
        <WhyNow />
        <Protocol />
        <PaperBand />
        <ThreeSurfaces />
        <Bento />
        <Tiers />
        <McpInstall />
        <Shield />
        <Faq />
      </main>
      <Footer />
    </>
  );
}

/* ---------- Sections ---------- */
function ParallaxWrap({ children }: { children: React.ReactNode }) {
  const ref = useParallax(14);
  return (
    <div ref={ref} className="will-change-transform">
      {children}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <HeroOrbit />
      {/* Asymmetric hero: copy on the left, a live sealing panel on the right. */}
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-16 lg:pt-20">
        <div className="text-center lg:text-left">
          <HeroItem delay={0}>
            <Link
              href="/docs/security"
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold transition-colors hover:bg-brand-gold/10"
            >
              <ShieldCheck className="h-3.5 w-3.5 flex-none" />
              Post-Quantum Security Infrastructure on ARC
              <ArrowRight className="h-3 w-3" />
            </Link>
          </HeroItem>

          <HeroItem delay={0.15}>
            <h1 className="text-balance text-4xl font-light leading-[1.08] tracking-tight text-[#d9dbe1] sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              Seal a file today
              <span className="text-gradient-gold mt-1 block font-bold">that only opens if both curves fall.</span>
            </h1>
          </HeroItem>

          <HeroItem delay={0.3}>
            <p className="mx-auto mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-[#8a93a3] sm:text-base lg:mx-0">
              A coin can move to a fresh address when the maths gets shaky. A file can’t. ArShield wraps it in
              ML-KEM-768 + X25519 on your device, signs it, and hands you something you can store anywhere.
            </p>
          </HeroItem>

          <HeroItem delay={0.45}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Magnetic strength={5}>
                <Link href="/app" className={cn('group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-7 text-base font-medium transition-all duration-300', 'bg-gold-gradient text-brand-ink shadow-gold-glow hover:shadow-gold-glow-lg')}>
                  Seal a file
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
              <Magnetic strength={4}>
                <Link href="/mcp" className={cn('group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-7 text-base font-medium transition-all duration-300', 'border border-white/10 bg-white/[0.02] text-[#e6e9ef] hover:border-white/20 hover:bg-white/[0.05]')}>
                  <Terminal className="h-4 w-4" />
                  Use it from an agent
                </Link>
              </Magnetic>
            </div>
          </HeroItem>

          <HeroItem delay={0.6}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 lg:justify-start">
              {[
                'FIPS 203 + 204',
                'no account, no upload',
                'runs on your machine',
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-2 text-[12.5px] text-[#8a93a3]">
                  <span className="h-1 w-1 rounded-full bg-[var(--color-verified)]" />
                  {t}
                </span>
              ))}
            </div>
          </HeroItem>
        </div>

        {/* Right column: the product working, not decoration. */}
        <HeroItem delay={0.5} className="w-full">
          <ParallaxWrap>
            <HeroPanel />
          </ParallaxWrap>
        </HeroItem>
      </div>
    </section>
  );
}

function Standards() {
  return (
    <section id="standards" className="border-y border-white/[0.06] bg-[#03070f]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <Reveal>
          <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5b6474]">
            Built on proven standards
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
          {STANDARDS.map((s, i) => (
            <Reveal key={s[0]} delay={i * 0.04}>
              <div className="text-center">
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#6f7a8c]">{s[0]}</div>
                <div className="mt-2 font-mono text-[13px] font-medium text-[#c7cdd8]">{s[1]}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyNow() {
  return (
    <Section eyebrow="Why now" title={<>Coins can run.<br className="hidden sm:block" /> Data can&apos;t.</>}>
      <div className="grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-gold">Bunker mode</div>
          <p className="text-[15px] leading-relaxed text-[#8a93a3]">
            Crypto is planning for bunker mode: move coins to fresh addresses, in case elliptic curves
            fall early, to AI or to quantum computers.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[#8a93a3]">
            A coin can run to a fresh address. A file can&apos;t. Anything sealed with curves alone can be
            copied today and opened the day those curves fall. Nearly every signature agents and wallets
            emit rides on the same math.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="panel p-6">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-gold">
              The bunker for your data
            </div>
            <p className="text-[15px] leading-relaxed text-[#8a93a3]">
              ArShield seals what you can&apos;t move. Every .arshield envelope is sealed with ML-KEM-768, the
              NIST post-quantum standard, on top of X25519, and signed with ML-DSA-65. On your device.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#8a93a3]">
              Going full bunker? Seal to a freshly generated key file. Its keys are random and never touch
              your wallet&apos;s signature, so if curves fall, an attacker still has to break ML-KEM-768 too.
            </p>
            <Link href="/app" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-gold hover:gap-2.5 transition-all">
              Generate a key file in the app
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#9aa3b2] transition-colors hover:border-brand-gold/40 hover:text-brand-gold"
      aria-label="Copy to clipboard"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function ThreeSurfaces() {
  const items = [
    { n: '01', t: 'Humans', tag: 'WEB APP · /APP', b: 'Drop a file in the browser. Out comes a .arshield envelope that only your wallet or your key file can open, plus a Quantum Seal receipt. Store it anywhere and open it on any device with the same keys.', cta: 'Launch app', href: '/app' },
    { n: '02', t: 'Agents (MCP)', tag: 'MCP · STDIO', b: 'Call arshield_encrypt_file from Claude, Cursor, or any MCP-aware agent. Same envelope, same crypto, same signer model. Zero browser.', cta: 'MCP server', href: '/mcp' },
    { n: '03', t: 'Payments (x402)', tag: 'MCP · arshield_sign_x402', b: 'Agents sign x402 payment payloads with ML-DSA-65 over MCP, under their own context, so anyone holding the agent’s post-quantum public key can check which key signed. Every paid call gets its own Seal once Shield ships.', cta: 'See arshield_sign_x402', href: '/mcp' },
  ];
  return (
    // Full-bleed: this section breaks out of the shared container and puts the
    // heading on the left with the cards in a wide rail, so it does not read
    // as the same "centred heading + three cards" beat as everything else.
    <section id="surfaces" className="relative my-10 border-y border-white/[0.05] bg-white/[0.012] py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-14">
          <div>
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-gold">
              One envelope, three surfaces
            </div>
            <h2 className="text-balance text-3xl font-bold leading-[1.15] tracking-tight text-[#e6e9ef] sm:text-[2.35rem]">
              Humans drop files. Agents call tools. Receipts get signed.
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-[#8a93a3]">
              ArShield runs entirely in your browser or in your agent runtime. There is no backend that
              sees plaintext, not ours, not anyone&apos;s.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((it, i) => (
              <Reveal key={it.n} delay={i * 0.08} className="h-full">
                <div className="panel flex h-full flex-col p-6">
                  <div className="mb-4 font-mono text-3xl font-bold text-white/10">{it.n}</div>
                  <h3 className="text-lg font-semibold text-[#e6e9ef]">{it.t}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[#8a93a3]">{it.b}</p>
                  <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b6474]">{it.tag}</div>
                  <Link href={it.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-gold transition-all hover:gap-2.5">
                    {it.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function McpInstall() {
  const tools = ['arshield_encrypt_file', 'arshield_decrypt_file', 'arshield_send_message', 'arshield_decrypt_message', 'arshield_verify_seal', 'arshield_sign_x402'];
  return (
    <Section
      id="mcp"
      align="left"
      eyebrow="Live on npm"
      title="Bunker mode for agents."
      subtitle="The same post-quantum envelope, shipped as six MCP tools for Claude, Cursor and any MCP client. It runs on your machine, so the keys never enter the chat."
    >
      <Reveal>
        <div className="panel p-6">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5b6474]">Install</div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#03070f] px-4 py-3">
            <code className="font-mono text-sm text-brand-gold">$ npx -y arshield-mcp</code>
            <CopyButton text="npx -y arshield-mcp" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tools.map((t) => (
              <div key={t} className="truncate rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[10.5px] text-[#9aa3b2]">
                {t}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/mcp" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-gold transition-colors hover:text-[#e9c35f]">
              See the MCP server
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <a href="https://www.npmjs.com/package/arshield-mcp" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#5b6474] transition-colors hover:text-[#9aa3b2]">
              npm · v0.1.2
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function Tiers() {
  return (
    <Section
      id="tiers"
      eyebrow="$ARSHIELD"
      title={<>Holders encrypt more.<br className="hidden sm:block" /> The quantum-safe token on ARC.</>}
      subtitle="The envelope is post-quantum. Once $arshield is live, your balance on ARC will set how much you seal: its USD value raises encryptions per day and maximum file size in the web app. Seals, messages and the MCP server are the same on every tier. No subscriptions, no accounts: your balance will be your tier."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.06}>
            <div className={cn('panel relative h-full p-6', t.name === 'Holder' && 'border-brand-gold/40')}>
              {t.badge && (
                <div className="absolute right-4 top-4 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-gold">
                  {t.badge}
                </div>
              )}
              <h3 className="text-lg font-semibold text-[#e6e9ef]">{t.name}</h3>
              <div className="mt-1 text-[13px] text-brand-gold">{t.req}</div>
              <p className="mt-3 min-h-[2.5rem] text-[13px] leading-relaxed text-[#8a93a3]">{t.blurb}</p>
              <div className="my-4 h-px bg-white/[0.06]" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">Encryptions</div>
              <div className="text-2xl font-bold text-[#e6e9ef]">{t.enc}</div>
              <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">Max file size</div>
              <div className="text-2xl font-bold text-[#e6e9ef]">{t.size}</div>
              <ul className="mt-5 space-y-2 text-[12.5px] text-[#8a93a3]">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-gold" />Quantum Seal on every encrypted file</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-gold" />Wallet or key file mode</li>
              </ul>
              <Link href={t.name === 'Free' ? '/app' : '/docs/tokenomics'} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-gold transition-all hover:gap-2.5">
                {t.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-[13px] text-[#5b6474]">
          <span>The only $arshield that sets your tier:</span>
          <span className="inline-flex items-center gap-2 rounded-md border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold">
            <span className="animate-soft-pulse h-1.5 w-1.5 rounded-full bg-brand-gold" />
            Coming soon
          </span>
          <span>on ARC</span>
        </div>
      </Reveal>
    </Section>
  );
}

function Shield() {
  return (
    <Section
      id="shield"
      eyebrow="On the roadmap"
      title="ArShield Shield: PQ Gateway for x402."
    >
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <Reveal>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-gold">
            <ShieldIcon className="h-3 w-3" />
            ArShield Shield
          </div>
          <h3 className="text-2xl font-bold text-[#e6e9ef]">
            A post-quantum tunnel for every x402 endpoint your agents pay.
          </h3>
          <p className="mt-4 text-[15px] leading-relaxed text-[#8a93a3]">
            Front any HTTP 402 Payment Required endpoint with a Shield URL. Requests and receipts tunnel
            inside a post-quantum envelope, and every paid call emits a Quantum Seal that can be anchored on
            ARC. Every receipt deserves a Quantum Seal.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-[#8a93a3]">
            {[
              'Hybrid ML-KEM + X25519 tunnel: drop-in proxy in front of any x402 endpoint.',
              'Every paid call emits a Quantum Seal PNG with endpoint, amount, and transaction hash.',
              'Reserved capacity for $arshield holders: Pro and Whale tiers get priority lanes.',
              'One endpoint swap. No code rewrites. MCP-native. Agent-ready.',
            ].map((li) => (
              <li key={li} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand-gold" />
                {li}
              </li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b6474]">
            X402 · Quantum Seal receipts · ARC anchors
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="panel p-6">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5b6474]">Also on the roadmap</h4>
            <ul className="mt-4 space-y-3 text-sm text-[#8a93a3]">
              {[
                'Seal anchoring on ARC, from the app and the MCP server',
                'Gas-free anchoring on ARC',
                'Encrypt for any address through an on-chain key directory',
                'Sealed receipts for agents that trade Stock Tokens',
              ].map((li) => (
                <li key={li} className="flex items-start gap-2.5 border-b border-white/[0.05] pb-3 last:border-0">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-white/20" />
                  {li}
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold">Opens by application</div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#8a93a3]">
                A first cohort of x402 endpoints, chosen from applications. No date set. The application form
                goes up when the gateway is ready for that cohort. Questions until then:{' '}
                <a href="mailto:hello@arc-shield.xyz" className="text-brand-gold hover:underline">write to us</a>.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Protocol() {
  return (
    <Section
      id="protocol"
      align="left"
      eyebrow="How it works"
      title="A file goes in. An unopenable envelope comes out."
      subtitle="Five steps, one primitive at a time, all in your browser. Nothing in the chain is optional: a copy taken today needs every one of them broken to open."
    >
      <Reveal>
        <div className="mb-10 rounded-[1.5rem] border border-white/[0.07] bg-[#03070f]/60 p-4 sm:p-8">
          <EnvelopeFlow />
        </div>
      </Reveal>
      <ProtocolDiagram />
    </Section>
  );
}

function Bento() {
  return (
    <Section
      align="left"
      eyebrow="Why ArShield"
      title="Built to keep working when the rest doesn't."
      subtitle="Post-quantum by default, portable by design, and verifiable offline."
    >
      <BentoFeatures />
    </Section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section
      id="faq"
      eyebrow="Questions"
      title="Things people ask."
      subtitle="Can't find what you're looking for? Browse the docs."
    >
      <Reveal>
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08]">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span className="text-[15px] text-[#d9dbe1]">{f.q}</span>
                  <span className={cn('grid h-6 w-6 flex-none place-items-center text-[#5b6474] transition-transform duration-200', isOpen && 'rotate-180 text-brand-gold')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </span>
                </button>
                <div
                  className={cn('grid overflow-hidden transition-all duration-300 ease-out', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-[14px] leading-relaxed text-[#8a93a3]">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </Section>
  );
}