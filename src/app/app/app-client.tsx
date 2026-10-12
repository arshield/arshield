'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileKey, Loader2, ShieldCheck, Upload, Wallet } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
import { Reveal } from '@/components/reveal';
import { Button } from '@/components/button';
import { AppWorkspace } from '@/components/app-workspace';
import { useWallet } from '@/lib/use-wallet';
import { ephemeralIdentity, unwrapKeyfile, wrapKeyfile, type QuantSafeKeyPair } from '@/lib/qsafe';
import { cn } from '@/lib/utils';

type KeySource = { kind: 'wallet'; label: string; kp: QuantSafeKeyPair } | { kind: 'keyfile'; label: string; kp: QuantSafeKeyPair } | null;

export function AppClient() {
  const { wallet, deriving, error: walletError, mounted, connect, disconnect, deriveIdentity } = useWallet();
  const [source, setSource] = useState<KeySource>(null);
  const [pass, setPass] = useState('');
  const [keyfileJson, setKeyfileJson] = useState<string | null>(null);
  const [genPass, setGenPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showKeyfile, setShowKeyfile] = useState(false);

  const tierBadge = wallet
    ? 'TIER CHECK PENDING · SHOWING FREE'
    : 'CONNECT WALLET TO VERIFY TIER · SHOWING FREE';

  const pickWallet = async () => {
    setErr(null);
    if (!wallet) {
      await connect();
      return;
    }
    setBusy(true);
    try {
      const kp = await deriveIdentity();
      setSource({ kind: 'wallet', label: `wallet · ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`, kp });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const generateKeyfile = async () => {
    setErr(null);
    setBusy(true);
    try {
      const kp = ephemeralIdentity();
      const pw = genPass || 'quantsafe-generated-key';
      const kf = await wrapKeyfile(kp, pw, { t: 2, m: 16384, p: 1 });
      const blob = new Blob([JSON.stringify(kf, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quantsafe-keyfile.json';
      a.click();
      URL.revokeObjectURL(url);
      setSource({ kind: 'keyfile', label: 'keyfile (generated)', kp });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const loadKeyfile = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (!keyfileJson) throw new Error('Choose a key file first');
      if (!pass) throw new Error('Enter the key file passphrase');
      const kp = await unwrapKeyfile(JSON.parse(keyfileJson), pass);
      setSource({ kind: 'keyfile', label: 'keyfile (loaded)', kp });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (source) {
    return <AppWorkspace source={source} onReset={() => setSource(null)} />;
  }

  return (
    <>
      <Background />
      <div className="relative min-h-screen">
        {/* App header */}
        <header className="border-b border-white/[0.06] bg-[#020610]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="QuantSafe home"><Logo /></Link>
            <div className="flex items-center gap-3">
              <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#9aa3b2] hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to site
              </Link>
              <Button variant="primary" size="sm" onClick={wallet ? disconnect : connect}>
                <Wallet className="h-4 w-4" />
                {mounted && wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : 'Connect wallet'}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Reveal>
            <div className="mb-6 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
                <ShieldCheck className="h-3 w-3" />
                {tierBadge}
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="text-center text-3xl font-bold leading-tight tracking-tight text-[#e6e9ef] sm:text-4xl">
              Quantum-safe encryption,
              <span className="text-gradient-gold mt-1 block">in your browser.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-4 max-w-xl text-center text-[14.5px] leading-relaxed text-[#8a93a3]">
              Files never leave your device. ML-KEM-768 + X25519 hybrid · ML-DSA-65 signed.
            </p>
          </Reveal>

          {/* Key source panel */}
          <Reveal delay={0.15}>
            <div className="panel mt-10 p-6 sm:p-8">
              <div className="mb-1 text-center">
                <h2 className="text-lg font-bold text-[#e6e9ef]">
                  Pick your <span className="text-gradient-gold">key source</span>
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-[#8a93a3]">
                  Two ways to hold your post-quantum keypair. Same envelope either way: what differs is what
                  your keys rest on.
                </p>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {/* Wallet card */}
                <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-brand-gold/20 bg-brand-gold/[0.06]">
                      <Wallet className="h-4.5 w-4.5 text-brand-gold" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#e6e9ef]">Wallet</span>
                        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#7b8493]">
                          Fastest
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-[#7b8493]">EIP-191 signature · deterministic</div>
                    </div>
                  </div>
                  <ul className="mb-5 space-y-2 text-[12.5px] text-[#8a93a3]">
                    {[
                      'Same wallet, same keys, on any device',
                      'No passphrase to remember',
                      'No gas, no on-chain write',
                      "Keys come from your wallet's signature, so they rest on its curve",
                    ].map((li) => (
                      <li key={li} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-brand-gold" />
                        {li}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <Button variant="primary" className="w-full" onClick={pickWallet} disabled={busy || deriving}>
                      {busy || deriving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                      {wallet ? 'Sign to derive' : 'Connect wallet'}
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-[#5b6474]">Connect first, then sign to derive.</p>
                  </div>
                </div>

                {/* Keyfile card */}
                <div className="flex flex-col rounded-2xl border border-brand-gold/30 bg-white/[0.02] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-brand-gold/20 bg-brand-gold/[0.06]">
                      <FileKey className="h-4.5 w-4.5 text-brand-gold" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#e6e9ef]">Key file</span>
                        <span className="rounded-full border border-brand-gold/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-gold">
                          Full bunker
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-[#7b8493]">Argon2id + AES-256-GCM · passphrase-protected</div>
                    </div>
                  </div>
                  <ul className="mb-5 space-y-2 text-[12.5px] text-[#8a93a3]">
                    {[
                      "Generate one and its keys are random, off your wallet's curve",
                      'If curves fall, an attacker still has to break ML-KEM-768',
                      'Works without a wallet. Portable: copy the file',
                      'If you lose both file and passphrase, recovery is impossible',
                    ].map((li) => (
                      <li key={li} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-brand-gold" />
                        {li}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto space-y-2">
                    <input
                      type="password"
                      value={genPass}
                      onChange={(e) => setGenPass(e.target.value)}
                      placeholder="passphrase to protect the file"
                      className="w-full rounded-xl border border-white/10 bg-[#03070f] px-3 py-2.5 text-[13px] text-[#e6e9ef] outline-none focus:border-brand-gold/50"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" onClick={generateKeyfile} disabled={busy}>
                        Generate new
                      </Button>
                      <Button variant="primary" onClick={() => setShowKeyfile((v) => !v)}>
                        <Upload className="h-4 w-4" />
                        Load existing
                      </Button>
                    </div>
                    {showKeyfile && (
                      <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#03070f] p-3">
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => e.target.files?.[0]?.text().then(setKeyfileJson)}
                          className="w-full text-[11px] text-[#8a93a3]"
                        />
                        <input
                          type="password"
                          value={pass}
                          onChange={(e) => setPass(e.target.value)}
                          placeholder="key file passphrase"
                          className="w-full rounded-lg border border-white/10 bg-[#020610] px-3 py-2 text-[13px] text-[#e6e9ef] outline-none focus:border-brand-gold/50"
                        />
                        <Button variant="primary" className="w-full" onClick={loadKeyfile} disabled={busy}>
                          Unlock key file
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(err || walletError) && (
                <p className="mt-4 text-center text-[12.5px] text-red-400">{err || walletError}</p>
              )}

              <p className="mt-6 text-center text-[11.5px] leading-relaxed text-[#5b6474]">
                Both paths seal with the same algorithms: ML-KEM-768 + X25519 hybrid KEM · ML-DSA-65 signatures.
                A wallet derives your keys from its signature; a generated key file holds random ones.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-6 flex items-center justify-center gap-6 text-[13px]">
              <Link href="/#tiers" className={cn('text-brand-gold transition-colors hover:text-[#e9c35f]')}>
                Holders encrypt more →
              </Link>
              <Link href="/docs/architecture" className="text-[#5b6474] transition-colors hover:text-[#9aa3b2]">
                cryptography spec
              </Link>
            </div>
          </Reveal>
        </main>
      </div>
    </>
  );
}