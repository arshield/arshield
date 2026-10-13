'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, FileLock2, FileText, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
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
  const [result, setResult] = useState<{ name: string; bytes: Uint8Array; seal?: Uint8Array; hash?: string } | null>(null);
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

  const doEncrypt = async () => {
    if (!file) return;
    if (!canEncrypt(tier)) {
      setStatus(`Daily encryption limit reached${Number.isFinite(tier.encryptionsPerDay) ? ` (${tier.encryptionsPerDay}/24h on ${tier.name})` : ''}. Resets at 00:00 UTC.`);
      return;
    }
    setBusy(true); setStatus(null);
    try {
      const container = await encryptFile(file.bytes, file.name, source.kp.publicKey, source.kp.secretKey);
      incrementEncryptionsUsed();
      const hash = await sha256Hex(container);
      const seal = await buildSealPng(hash, file.name);
      setResult({ name: file.name + '.arshield', bytes: container, seal, hash });
      const left = encryptionsLeft(tier);
      setStatus(`Quantum-Sealed · Ready to download · ${left === 'unlimited' ? 'unlimited' : left + ' left'} today`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const doDecrypt = async () => {
    if (!file) return;
    setBusy(true); setStatus(null);
    try {
      const out = await decryptFile(file.bytes, source.kp.secretKey, source.kp.publicKey);
      setResult({ name: out.filename, bytes: out.fileBytes });
      setStatus('Decrypted · ML-DSA-65 signature verified');
    } catch {
      setStatus('Decryption failed. Wrong key, or the file was tampered with.');
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
              <span className="hidden items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.06] px-3 py-1 text-[11px] font-medium text-brand-gold sm:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5" />
                {tier.name} · {encryptionsLeft(tier) === 'unlimited' ? '∞' : encryptionsLeft(tier) + ' left'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-[11px] font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {source.label}
              </span>
              <button onClick={onReset} className="inline-flex items-center gap-1.5 text-[13px] text-[#9aa3b2] hover:text-white">
                <RotateCcw className="h-3.5 w-3.5" /> Change key
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
            onClick={() => input.current?.click()}
            className="panel cursor-pointer p-10 text-center transition-colors hover:border-brand-gold/30"
          >
            <input ref={input} type="file" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            {file ? (
              <div>
                <FileText className="mx-auto h-8 w-8 text-brand-gold" />
                <div className="mt-3 font-semibold text-[#e6e9ef]">{file.name}</div>
                <div className="mt-1 text-[12.5px] text-[#8a93a3]">
                  {(file.bytes.length / MB).toFixed(2)} MB · {mode === 'decrypt' ? 'ready to decrypt' : 'ready to encrypt'}
                </div>
              </div>
            ) : (
              <div>
                <FileLock2 className="mx-auto h-8 w-8 text-brand-gold" />
                <div className="mt-3 font-semibold text-[#e6e9ef]">Drop a .arshield file to decrypt</div>
                <div className="mt-1 text-[12.5px] text-[#8a93a3]">or any file to encrypt · filename sealed inside</div>
              </div>
            )}
          </div>

          {file && (
            <div className="mt-4 flex gap-3">
              <Button variant="primary" className="flex-1" onClick={doEncrypt} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Encrypt → .arshield
              </Button>
              <Button variant="ghost" className="flex-1" onClick={doDecrypt} disabled={busy}>
                Decrypt
              </Button>
            </div>
          )}

          {status && <p className="mt-4 text-center text-[13px] text-brand-gold">{status}</p>}

          {result && (
            <div className="panel mt-6 p-5">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-emerald-300">
                <Check className="h-4 w-4" />
                {result.seal ? 'Quantum-Sealed' : 'Opened'}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => download(result.bytes, result.name)}>
                  <Download className="h-3.5 w-3.5" />
                  {result.seal ? 'Download .arshield' : 'Download file'}
                </Button>
                {result.seal && (
                  <Button variant="ghost" size="sm" onClick={() => download(result.seal!, result.name.replace(/\.arshield$/, '') + '.seal.png', 'image/png')}>
                    <Download className="h-3.5 w-3.5" /> Download Seal
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResult(null); setStatus(null); setMode('wait'); }}>
                  {result.seal ? 'Encrypt another' : 'Decrypt another'}
                </Button>
              </div>
              {result.hash && (
                <div className="mt-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">Envelope sha256</div>
                  <div className="mt-1 break-all font-mono text-[11px] text-[#8a93a3]">{result.hash}</div>
                </div>
              )}
            </div>
          )}

          {/* Message composer */}
          <div className="panel mt-6 p-5">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b6474]">Compose</div>
            <h3 className="text-[15px] font-semibold text-[#e6e9ef]">Share via .arshield message</h3>
            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value.slice(0, 65536))}
              rows={3}
              placeholder="Type a message to seal into a URL…"
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#03070f] px-3 py-2.5 text-[13px] text-[#e6e9ef] outline-none focus:border-brand-gold/50"
            />
            <div className="mt-1 flex justify-between text-[11px] text-[#5b6474]">
              <span>Encrypted bytes live in the URL fragment, never sent to a server.</span>
              <span>{msgText.length} / 65536 B</span>
            </div>
            <Button variant="primary" className="mt-3 w-full" onClick={doMessage} disabled={busy || !msgText}>
              Encrypt and build link
            </Button>
            {msgUrl && (
              <div className="mt-3 rounded-xl border border-white/[0.08] bg-[#03070f] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold">Message URL</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(msgUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="inline-flex items-center gap-1 text-[11px] text-[#9aa3b2] hover:text-brand-gold"
                  >
                    <Copy className="h-3 w-3" />{copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="mt-2 max-h-24 overflow-y-auto break-all font-mono text-[10.5px] text-[#8a93a3]">{msgUrl}</div>
              </div>
            )}
          </div>

          {/* Back up keys */}
          <div className="mt-6 flex justify-center">
            <Link href="/docs/architecture" className="text-[12.5px] text-[#5b6474] hover:text-[#9aa3b2]">
              Back up keys → save a passphrase-wrapped key file
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}