'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileKey, Loader2, ShieldCheck, Upload, Wallet } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
import { Button } from '@/components/button';
import { AppWorkspace } from '@/components/app-workspace';
import { useWallet } from '@/lib/use-wallet';
import { ephemeralIdentity, unwrapKeyfile, wrapKeyfile, type ArShieldKeyPair } from '@/lib/arshield';
import { ARGON2ID_PARAMS_PROD } from '@/lib/arshield/constants';
import { KeyfileDialog } from '@/components/keyfile-dialog';
import { useScreenTransition, SWAP_CSS } from '@/lib/use-screen-transition';
import { fetchTierState, TIER_BY_KEY, type Tier, type TierState } from '@/lib/tiers';
import { cn } from '@/lib/utils';

type KeySource = { kind: 'wallet'; label: string; kp: ArShieldKeyPair } | { kind: 'keyfile'; label: string; kp: ArShieldKeyPair } | null;

export function AppClient() {
  const { wallet, deriving, error: walletError, mounted, connect, disconnect, deriveIdentity } = useWallet();
  const [source, setSource] = useState<KeySource>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Which key-file flow is open, if any. Replaces the inline passphrase field
  // and the separate file picker that used to live in the card.
  const [dialog, setDialog] = useState<'create' | 'open' | null>(null);
  // 0..1 while the KDF runs. Argon2id at production params takes ~5s, so the
  // dialog needs to show something moving or it reads as a hang.
  const [kdfProgress, setKdfProgress] = useState<number | null>(null);
  // Cross-fade between the key-source picker and the workspace, so switching
  // reads as moving into the app rather than a page replace.
  const screen = useScreenTransition(source ? 'workspace' : 'picker');
  const [tier, setTier] = useState<Tier>(TIER_BY_KEY.free);
  // Balance and price alongside the tier, so the pill can show what the
  // entitlement was derived from instead of asserting a level with no evidence.
  const [holdings, setHoldings] = useState<{ balance: number; usd: number; priceSource: TierState['priceSource'] } | null>(null);
  const [tierBusy, setTierBusy] = useState(false);

  const tierBadge = tierBusy
    ? 'READING TIER…'
    : wallet
      ? `${tier.name.toUpperCase()} TIER${tier.key === 'free' ? ' · PRE-LAUNCH · SHOWING FREE' : ''}`
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
      // Tier check: read $arshield balance for this address. Falls back to Free
      // pre-launch (no token deployed yet).
      setTierBusy(true);
      try {
        const state = await fetchTierState(wallet.address);
        setTier(state.tier);
        setHoldings({ balance: state.balance, usd: state.usd, priceSource: state.priceSource });
      } finally {
        setTierBusy(false);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Wrap a fresh random keypair as a key file and hand it to the user.
   *
   * The passphrase is required and comes from the dialog. It is never defaulted:
   * a generated file the user cannot open again is worse than no file, because
   * it looks like a backup.
   */
  const generateKeyfile = async (passphrase: string) => {
    setErr(null);
    setBusy(true);
    try {
      const kp = ephemeralIdentity();
      const kf = await wrapKeyfile(kp, passphrase, ARGON2ID_PARAMS_PROD, setKdfProgress);
      const blob = new Blob([JSON.stringify(kf, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arshield-keyfile-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSource({ kind: 'keyfile', label: 'keyfile (generated)', kp });
      setDialog(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setKdfProgress(null);
    }
  };

  /**
   * Unwrap a key file. The two failure modes are separated on purpose — a wrong
   * passphrase and a file that is not a key file need different fixes, so telling
   * the user which one happened is the difference between a retry and a dead end.
   */
  const openKeyfile = async (json: string, passphrase: string) => {
    setErr(null);
    setBusy(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error('That file is not valid JSON, so it cannot be an ArShield key file.');
      }
      const kp = await unwrapKeyfile(parsed as Parameters<typeof unwrapKeyfile>[0], passphrase, setKdfProgress);
      setSource({ kind: 'keyfile', label: 'keyfile (loaded)', kp });
      setDialog(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        /argon2|tag|unwrap|decrypt|oper/i.test(msg)
          ? 'Wrong passphrase, or the key file is corrupted.'
          : msg,
      );
    } finally {
      setBusy(false);
      setKdfProgress(null);
    }
  };

  // The outgoing screen is held for the swap window and animated out on top of
  // Both screens render below; the picker unmounts only once the phase settles
  // back to idle.
  //
  // There is deliberately no early return here. An earlier version returned the
  // workspace as soon as `shown` flipped, which unmounted the picker in the
  // same commit — so its exit animation never ran and there was a frame with
  // nothing on screen. Measured as a 39%-of-normal JPEG, i.e. a blank page.

  const pickerBody = (
    <>
      <Background />
      <div className="relative min-h-screen">
        {/* App header */}
        <header className="border-b border-white/[0.06] bg-[#020610]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="ArShield home"><Logo /></Link>
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
            <div className="mb-6 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
                <ShieldCheck className="h-3 w-3" />
                {tierBadge}
              </span>
            </div>
          
            <h1 className="text-center text-3xl font-bold leading-tight tracking-tight text-[#e6e9ef] sm:text-4xl">
              Quantum-safe encryption,
              <span className="text-gradient-gold mt-1 block">in your browser.</span>
            </h1>
          
            <p className="mx-auto mt-4 max-w-xl text-center text-[14.5px] leading-relaxed text-[#8a93a3]">
              Files never leave your device. ML-KEM-768 + X25519 hybrid · ML-DSA-65 signed.
            </p>
          

          {/* Key source panel */}
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
                  {/* Both flows open a dialog. The passphrase is set or
                      entered there, never inline, so creating a file always
                      means confirming what it was locked with. */}
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button variant="ghost" onClick={() => { setErr(null); setDialog('create'); }} disabled={busy}>
                      Generate new
                    </Button>
                    <Button variant="primary" onClick={() => { setErr(null); setDialog('open'); }} disabled={busy}>
                      <Upload className="h-4 w-4" />
                      Load existing
                    </Button>
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
          
            <div className="mt-6 flex items-center justify-center gap-6 text-[13px]">
              <Link href="/#tiers" className={cn('text-brand-gold transition-colors hover:text-[#e9c35f]')}>
                Holders encrypt more →
              </Link>
              <Link href="/docs/architecture" className="text-[#5b6474] transition-colors hover:text-[#9aa3b2]">
                cryptography spec
              </Link>
            </div>
          
        </main>
      </div>

      {/* One dialog for both key-file flows. `mode` only picks the copy and
          which callback fires; the shell, validation and reset logic are
          shared. */}
      <KeyfileDialog
        key={dialog ?? 'closed'}
        mode={dialog ?? 'create'}
        open={dialog !== null}
        onClose={() => { if (!busy) { setDialog(null); setErr(null); } }}
        onCreate={generateKeyfile}
        onOpen={openKeyfile}
        busy={busy}
        error={err}
        progress={kdfProgress}
      />
    </>
  );



  return (
    <>
      <style>{SWAP_CSS}</style>

      {/* Incoming screen. Mounted as soon as the swap begins so it is already
          painted underneath while the outgoing one fades over it. */}
      {source && (
        <div className={screen.enteringClass}>
          <AppWorkspace
            source={source}
            onReset={() => { setSource(null); setHoldings(null); }}
            tier={tier}
            holdings={holdings}
          />
        </div>
      )}

      {/* Outgoing screen. Stays mounted for the whole swap. `as-screen-out`
          lifts it over the incoming screen so the two are visible at once and
          there is never a frame with nothing on it. Once the phase returns to
          idle this stops rendering. */}
      {(!source || screen.isSwapping) && (
        <div className={source ? screen.leavingClass : screen.enteringClass}>
          {pickerBody}
        </div>
      )}
    </>
  );
}