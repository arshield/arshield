'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, FileText, Loader2, RotateCcw, ShieldCheck, Upload } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
import { AnimatePresence, motion } from 'framer-motion';
import { SealingStepper } from '@/components/sealing-stepper';
import { TypeOut } from '@/components/type-out';
import { DownloadButton } from '@/components/download-button';
import { playSteps } from '@/lib/play-steps';
import { Button } from '@/components/button';
import {
  encryptFile,
  decryptFile,
  buildMessageUrl,
  type ArShieldKeyPair,
} from '@/lib/arshield';
import {
  canEncrypt,
  encryptionsLeft,
  incrementEncryptionsUsed,
  tierLabel,
  type Tier,
} from '@/lib/tiers';

const MB = 1024 * 1024;


function download(bytes: Uint8Array, name: string, type = 'application/octet-stream') {
  const blob = new Blob([bytes as unknown as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/** Build a Quantum Seal PNG that carries the envelope sha256 in a tEXt chunk. */
async function buildSealPng(fileHash: string, filename: string, address?: string): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 720, 480);
  g.addColorStop(0, '#0a1220'); g.addColorStop(1, '#020610');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 720, 480);
  ctx.strokeStyle = 'rgba(209,164,19,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(24, 24, 672, 432);
  ctx.fillStyle = '#d1a413'; ctx.font = 'bold 30px ui-monospace, monospace';
  ctx.fillText('QUANTUM SEAL', 56, 96);
  ctx.fillStyle = '#8a93a3'; ctx.font = '15px ui-monospace, monospace';
  ctx.fillText('ArShield · post-quantum receipt', 56, 128);
  ctx.fillStyle = '#e6e9ef'; ctx.font = '14px ui-monospace, monospace';
  const lines = [
    `file      ${filename}`,
    `algo      ML-KEM-768 + X25519 / ML-DSA-65`,
    `sha256    ${fileHash.slice(0, 40)}`,
    `${fileHash.slice(40, 72)}`,
    `time      ${new Date().toISOString()}`,
    address ? `wallet    ${address}` : `signer    ephemeral`,
    `chain     ARC (5042)`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, 56, 190 + i * 30));
  ctx.fillStyle = 'rgba(209,164,19,0.6)'; ctx.font = '11px ui-monospace, monospace';
  ctx.fillText('those metadata fields are also embedded as PNG tEXt chunks', 56, 420);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  const buf = new Uint8Array(await blob!.arrayBuffer());
  return injectTextChunk(buf, 'arshield', JSON.stringify({ version: 1, timestamp: new Date().toISOString(), algo: 'ML-KEM-768+X25519/ML-DSA-65', file_hash: fileHash, wallet: address ?? null }));
}

/** Insert a tEXt chunk right after IHDR so /verify can parse file_hash. */
function injectTextChunk(png: Uint8Array, keyword: string, text: string): Uint8Array {
  const data = new TextEncoder().encode(keyword + '\0' + text);
  const chunk = new Uint8Array(12 + data.length);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, data.length);
  chunk.set([0x74, 0x45, 0x58, 0x74], 4); // "tEXt"
  chunk.set(data, 8);
  const crc = crc32(chunk.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc);
  // splice after IHDR (8 sig + 25 IHDR chunk)
  const insertAt = 8 + 25;
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(png.subarray(insertAt), insertAt + chunk.length);
  return out;
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function AppWorkspace({
  source,
  onReset,
  tier,
}: {
  source: { kind: 'wallet' | 'keyfile'; label: string; kp: ArShieldKeyPair };
  onReset: () => void;
  tier: Tier;
}) {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [mode, setMode] = useState<'wait' | 'encrypt' | 'decrypt'>('wait');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // How many stepper rows have completed. Advanced on a timer while the
  // operation runs so the primitives read as a sequence rather than a
  // single opaque wait.
  const [step, setStep] = useState(0);
  // Whether the stage list is on screen. Kept separate from `busy` because the
  // crypto finishes in milliseconds — `busy` alone would flash and vanish.
  const [showSteps, setShowSteps] = useState(false);
  const [result, setResult] = useState<{ name: string; bytes: Uint8Array; seal?: Uint8Array; hash?: string } | null>(null);
  // Brief confirmation state on the primary button. Set when a run completes,
  // cleared on a timer — the label flicks to "Sealed" and back so the control
  // the user is already looking at reports the outcome.
  const [justFinished, setJustFinished] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [msgUrl, setMsgUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = (f?: File | null) => {
    if (!f) return;
    void f.arrayBuffer().then((b) => {
      const bytes = new Uint8Array(b);
      setFile({ name: f.name, bytes });
      setResult(null);
      setStatus(null);
      setStep(0);
      setShowSteps(false);
      const isDecrypt = f.name.endsWith('.arshield');
      setMode(isDecrypt ? 'decrypt' : 'encrypt');
      if (!isDecrypt && bytes.length > tier.maxFileBytes) {
        // Hard refuse: file above this tier's cap cannot be encrypted.
        setFile(null);
        setMode('wait');
        setStatus(
          `File too large (${(bytes.length / MB).toFixed(1)} MB). ${tierLabel(tier)} caps at ${
            Number.isFinite(tier.maxFileBytes) ? `${Math.round(tier.maxFileBytes / MB)} MB` : 'unlimited'
          }. See tiers.`,
        );
      }
    });
  };

  /**
   * Flash the primary button into its confirmed state for a beat.
   *
   * Kept deliberately short and self-clearing: this is a receipt, not a mode.
   * Longer than ~1.2s and it starts reading as a state the user has to dismiss.
   */
  const flashDone = () => {
    setJustFinished(true);
    window.setTimeout(() => setJustFinished(false), 1200);
  };

  const doEncrypt = async () => {
    if (!file) return;
    if (!canEncrypt(tier)) {
      setStatus(`Daily encryption limit reached${Number.isFinite(tier.encryptionsPerDay) ? ` (${tier.encryptionsPerDay}/24h on ${tier.name})` : ''}. Resets at 00:00 UTC.`);
      return;
    }
    setBusy(true); setStatus(null); setStep(0); setShowSteps(true);
    // The primitives finish in milliseconds — far faster than a frame — so the
    // display is paced. Each step is held long enough to be read, and the
    // crypto runs in parallel; the final step is only marked once the real
    // work has actually returned.
    try {
      const started = Date.now();
      const container = await encryptFile(file.bytes, file.name, source.kp.publicKey, source.kp.secretKey);
      const cryptoMs = Date.now() - started;

      incrementEncryptionsUsed();
      const hash = await sha256Hex(container);
      const seal = await buildSealPng(hash, file.name);

      // Show the stages in order, spending whatever time is left of the
      // display budget after the real work.
      await playSteps(setStep, 5, cryptoMs);

      setResult({ name: file.name + '.arshield', bytes: container, seal, hash });
      flashDone();
      const left = encryptionsLeft(tier);
      setStatus(`Quantum-Sealed · Ready to download · ${left === 'unlimited' ? 'unlimited' : left + ' left'} today`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
      setShowSteps(false);
    } finally { setBusy(false); }
  };

  const doDecrypt = async () => {
    if (!file) return;
    setBusy(true); setStatus(null); setStep(0); setShowSteps(true);
    // Opening verifies the signature first, so the list leads with ML-DSA-65.
    try {
      const started = Date.now();
      const out = await decryptFile(file.bytes, source.kp.secretKey, source.kp.publicKey);
      const cryptoMs = Date.now() - started;

      await playSteps(setStep, 5, cryptoMs);

      setResult({ name: out.filename, bytes: out.fileBytes });
      flashDone();
      setStatus('Decrypted · ML-DSA-65 signature verified');
    } catch {
      setStatus('Decryption failed. Wrong key, or the file was tampered with.');
      setShowSteps(false);
    } finally { setBusy(false); }
  };

  const doMessage = async () => {
    setBusy(true); setStatus(null);
    try {
      const text = msgText.slice(0, 65536);
      const bytes = new TextEncoder().encode(text);
      const blobBytes = await encryptFile(bytes, 'message.txt', source.kp.publicKey, source.kp.secretKey);
      const isEphemeral = source.kind === 'keyfile' && source.label.includes('generated');
      const url = buildMessageUrl(blobBytes, source.kp.publicKey, isEphemeral ? { sk: source.kp.secretKey, pk: source.kp.publicKey } : undefined);
      setMsgUrl(url);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <>
      <Background />
      <div className="relative min-h-screen">
        <header className="border-b border-white/[0.06] bg-[#020610]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="ArShield home"><Logo /></Link>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 text-[12.5px] font-medium text-brand-gold sm:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5" />
                {tier.name} · {encryptionsLeft(tier) === 'unlimited' ? '∞' : encryptionsLeft(tier) + ' left'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-[12.5px] font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {source.label}
              </span>
              <button onClick={onReset} className="inline-flex items-center gap-1.5 text-[14.5px] text-[#aab3c1] hover:text-white">
                <RotateCcw className="h-3.5 w-3.5" /> Change key
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          {/* Mode switch, above the drop zone.
              Without this the two buttons only appeared after a file was
              picked, so the first thing a visitor did — drop a file — happened
              before they had chosen what to do with it. Choosing first also
              sets the drop zone's own wording, which is what tells them
              whether a file belongs here at all. */}
          <div
            role="tablist"
            aria-label="Operation"
            className="mx-auto mb-5 flex w-fit gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] p-1"
          >
            {(['encrypt', 'decrypt'] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setMode(m);
                    setFile(null);
                    setResult(null);
                    setStatus(null);
                    setStep(0);
                    setShowSteps(false);
                  }}
                  className={[
                    'rounded-full px-5 py-2 text-[14.5px] font-medium transition-colors',
                    active
                      ? 'bg-[#020610] text-[#eef1f6] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'text-[#9ba4b3] hover:text-[#d6dbe5]',
                  ].join(' ')}
                >
                  {m === 'encrypt' ? 'Encrypt' : 'Decrypt'}
                </button>
              );
            })}
          </div>

          {/* Upload card.
              Three states, one card: empty (drop zone), filled (file summary
              with the details of what will happen), and locked (during a run,
              so nothing can be swapped mid-operation). */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0, ease: [0.22, 1, 0.36, 1] }}
            className="as-lift-soft overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.028]"
          >
            {/* header strip: what this card is for, and the current mode */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#8b94a4]">
                {mode === 'decrypt' ? 'Open an envelope' : 'Seal a file'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8b94a4]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-verified)]" />
                {mode === 'decrypt'
                  ? 'signature checked before decryption'
                  : 'ML-KEM-768 + X25519 · ML-DSA-65'}
              </span>
            </div>

            {/* body: drop target when empty, file summary when filled */}
            <div
              onDragOver={(e) => { if (!busy) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (!busy) pick(e.dataTransfer.files?.[0]); }}
              onClick={() => { if (!busy) input.current?.click(); }}
              className={[
                'px-6 py-10 text-center transition-colors',
                busy ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-white/[0.015]',
              ].join(' ')}
            >
              <input
                ref={input}
                type="file"
                className="hidden"
                onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
              />

              {file ? (
                <div className="text-left">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[var(--color-action)]/14 text-[var(--color-action)]">
                      <FileText className="h-[22px] w-[22px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15.5px] font-medium text-[#eef1f6]">{file.name}</div>
                      <div className="mt-0.5 text-[13px]text-[#949dac]">
                        {(file.bytes.length / MB).toFixed(2)} MB
                        {mode === 'decrypt' ? ' · envelope' : ' · plaintext'}
                      </div>
                    </div>
                    {!busy && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null); setResult(null); setStatus(null); setStep(0); setShowSteps(false);
                        }}
                        className="flex-none rounded-lg border border-white/12 px-3 py-1.5 text-[12.5px] font-medium text-[#9ba4b3] transition-colors hover:border-white/25 hover:text-[#e6e9ef]"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* what this file is about to become — the same three facts
                      the real flow will act on. Stacked rather than a two-column
                      table so a long suite string wraps instead of crushing the
                      label column on narrow screens. */}
                  <dl className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="flex-none text-[13px] font-medium text-[#9ba4b3]">
                        {mode === 'decrypt' ? 'Opening with' : 'Sealing to'}
                      </dt>
                      <dd className="truncate text-right font-mono text-[13.5px] text-[#bcc4d0]">{source.label}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="flex-none text-[13px] font-medium text-[#9ba4b3]">Output</dt>
                      <dd className="text-right text-[13.5px] text-[#bcc4d0]">
                        {mode === 'decrypt' ? 'your original file' : 'a .arshield container'}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="flex-none text-[13px] font-medium text-[#9ba4b3]">Suite</dt>
                      <dd className="text-right font-mono text-[13px] leading-relaxed text-[#bcc4d0]">
                        ML-KEM-768 + X25519 · AES-256-GCM · ML-DSA-65
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-action)]/12 text-[var(--color-action)]">
                    <Upload className="h-6 w-6" />
                  </span>
                  <div className="mt-3 text-[15.5px] font-medium text-[#eef1f6]">
                    {mode === 'decrypt' ? 'Drop a .arshield file' : 'Drop a file to seal'}
                  </div>
                  <div className="mt-1 text-[13.5px] font-medium text-[#949dac]">
                    or <span className="text-[var(--color-action)]/80">browse</span>
                    {' · '}
                    {mode === 'decrypt'
                      ? 'filename is read from inside the envelope'
                      : 'filename travels sealed inside'}
                  </div>
                </div>
              )}
            </div>

            {/* footer: one primary action for the chosen mode. The alternative
                is a plain link underneath rather than a second button, so there
                is never a pair of competing actions to pick between. */}
            {file && (
              <div className="border-t border-white/[0.06] bg-white/[0.012] px-6 py-5">
                {/* A short confirmation on the button itself. The result
                    panel animates in below, but the button is where the user's
                    pointer already is, so that is where "it worked" lands
                    first. `justFinished` clears itself after 1.2s. */}
                <Button
                  variant="primary"
                  className={`w-full ${justFinished ? 'as-success-flash' : ''}`}
                  onClick={mode === 'decrypt' ? doDecrypt : doEncrypt}
                  disabled={busy || !canEncrypt(tier) || justFinished}
                >
                  {/* The label carries the state. A spinner alone says "wait"
                      without saying what for, and on a slow Argon2id unwrap the
                      difference between "running" and "frozen" is exactly what
                      the user is trying to read. */}
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === 'decrypt' ? 'Opening…' : 'Sealing…'}
                    </>
                  ) : justFinished ? (
                    <>
                      <Check className="h-4 w-4" />
                      {mode === 'decrypt' ? 'Opened' : 'Sealed'}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      {mode === 'decrypt' ? 'Open envelope' : 'Seal file'}
                    </>
                  )}
                </Button>
                <div className="mt-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const other = mode === 'decrypt' ? 'encrypt' : 'decrypt';
                      setMode(other);
                      setResult(null);
                      setStatus(null);
                      setStep(0);
                      setShowSteps(false);
                    }}
                    disabled={busy}
                    className="text-[13px] font-medium text-[#9ba4b3] underline-offset-4 transition-colors hover:text-[#e6e9ef] hover:underline disabled:opacity-50"
                  >
                    {mode === 'decrypt' ? 'seal it instead' : 'open it instead'}
                  </button>
                </div>
                {!canEncrypt(tier) && (
                  <p className="mt-2.5 text-center text-[13px] text-[#e5a23c]">
                    Daily limit reached on {tier.name}. Resets at 00:00 UTC.
                  </p>
                )}
              </div>
            )}
          </motion.div>


          {status && <p className="mt-4 text-center text-[14.5px] text-brand-gold">{status}</p>}

          {/* Live stage list.
              While a run is in flight it is the only thing here. Once the result
              exists it collapses away instead of staying on screen, because
              leaving both up for the ~7 seconds they used to overlap meant the
              completion had no moment — the page just kept accumulating
              elements. Collapsing it hands the space to the result, so the
              sequence reads as one thing becoming another. */}
          <AnimatePresence initial={false}>
            {showSteps && !result && (
              <motion.div
                key="stepper"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-5">
                  <SealingStepper mode={mode === 'decrypt' ? 'decrypt' : 'encrypt'} done={step} running={busy} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {result && (
            /* The result is the payoff for a multi-second operation, so it
               arrives rather than appears: the panel rises the last few pixels
               and the tick scales in behind it. Keyed on the payload so a
               second run replays the entrance instead of silently swapping
               content into an already-settled panel. */
            <motion.div
              key={`${result.name}-${result.hash ?? ''}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="as-lift-soft as-result-glow panel mt-6 p-5"
            >
              <div className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold text-emerald-300">
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.12, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15"
                >
                  <Check className="h-3.5 w-3.5" />
                </motion.span>
                {result.seal ? 'Quantum-Sealed' : 'Opened'}
              </div>
              <div className="flex flex-wrap gap-2">
                <DownloadButton
                  onDownload={() => download(result.bytes, result.name)}
                  label={result.seal ? 'Download .arshield' : 'Download file'}
                  doneLabel="Saved"
                />
                {result.seal && (
                  <DownloadButton
                    onDownload={() => download(result.seal!, result.name.replace(/\.arshield$/, '') + '.seal.png', 'image/png')}
                    label="Download Seal"
                    doneLabel="Saved"
                  />
                )}
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResult(null); setStatus(null); setMode('wait'); }}>
                  {result.seal ? 'Encrypt another' : 'Decrypt another'}
                </Button>
              </div>
              {result.hash && (
                <div className="mt-4">
                  <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#8b94a4]">Envelope sha256</div>
                  <div className="mt-1 break-all font-mono text-[12.5px] text-[#9ba4b3]">
                    <TypeOut text={result.hash} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Message composer */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="as-lift-soft as-result-glow panel mt-6 p-5"
          >
            <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#8b94a4]">Compose</div>
            <h3 className="text-[16.5px] font-semibold text-[#e6e9ef]">Share via .arshield message</h3>
            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value.slice(0, 65536))}
              rows={3}
              placeholder="Type a message to seal into a URL…"
              className="mt-3 w-full rounded-xl border border-white/12 bg-[#03070f] px-4 py-3 text-[14.5px] text-[#eef1f6] outline-none placeholder:text-[#828b9c] focus:border-brand-gold/50"
            />
            <div className="mt-2 flex justify-between text-[12.5px] text-[#8b94a4]">
              <span>Encrypted bytes live in the URL fragment, never sent to a server.</span>
              <span>{msgText.length} / 65536 B</span>
            </div>
            <Button variant="primary" className="mt-3 w-full" onClick={doMessage} disabled={busy || !msgText}>
              Encrypt and build link
            </Button>
            {msgUrl && (
              <div className="mt-3 rounded-xl border border-white/[0.08] bg-[#03070f] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold uppercase tracking-wider text-brand-gold">Message URL</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(msgUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="inline-flex items-center gap-1 text-[12.5px] text-[#aab3c1] hover:text-brand-gold"
                  >
                    <Copy className="h-3 w-3" />{copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="mt-2 max-h-24 overflow-y-auto break-all font-mono text-[12px] text-[#9ba4b3]">{msgUrl}</div>
              </div>
            )}
          </motion.div>

          {/* Key backup guidance */}
          <div className="mt-6 flex justify-center">
            <Link href="/docs/getting-started" className="text-[13.5px] font-medium text-[#8b94a4] hover:text-[#d6dbe5]">
              Backing up your keys → why a key file outlives your wallet
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}