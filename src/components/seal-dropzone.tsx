'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  FileImage,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Quantum Seal drop zone.
 * Drag-and-drop or click to pick a Seal PNG, inspect its unsigned metadata fields,
 * and optionally cross-check the SHA-256 of a companion .arshield envelope.
 *
 * Read-only: everything happens locally in the browser via FileReader.
 */

export type SealMetadata = {
  version?: string;
  timestamp?: string;
  algo?: string;
  file_hash?: string;
  wallet?: string;
  x402?: string;
  anchor?: string;
};

export type SealResult = {
  fileName: string;
  fileSize: number;
  sha256: string;
  metadata: SealMetadata;
  valid: boolean;
  notes: string[];
};

const ACCEPTED = '.png,image/png';

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

function readPngMetadata(bytes: ArrayBuffer): SealMetadata {
  // Parse PNG tEXt / iTXt chunks for the arshield keys we care about.
  //
  // Two shapes exist in the wild and both must read:
  //  1) one JSON blob under the keyword "arshield-seal" (what /app writes)
  //  2) one keyword per field: version, file_hash, ... (hand-authored seals)
  const view = new DataView(bytes);
  const meta: SealMetadata = {};
  const known = new Set([
    'version',
    'timestamp',
    'algo',
    'file_hash',
    'wallet',
    'x402',
    'anchor',
  ]);

  let offset = 8; // skip signature
  const decoder = new TextDecoder('latin1');
  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset);
    const type = decoder.decode(new Uint8Array(bytes, offset + 4, 4));
    const dataStart = offset + 8;
    if (dataStart + length > bytes.byteLength) break;

    if (type === 'tEXt' || type === 'iTXt') {
      const raw = decoder.decode(new Uint8Array(bytes, dataStart, length));
      const sep = raw.indexOf('\u0000');
      if (sep > 0) {
        const key = raw.slice(0, sep).replace(/\0/g, '').trim();
        const value = raw.slice(sep + 1).replace(/\u0000/g, '').trim();

        // Shape 1: a single JSON payload under an arshield keyword.
        // /app writes "arshield"; accept the explicit variants too.
        if (key === 'arshield' || key === 'arshield-seal' || key === 'arshield_seal') {
          try {
            const obj = JSON.parse(value) as Record<string, unknown>;
            for (const k of Object.keys(obj)) {
              if (!known.has(k)) continue;
              const v = obj[k];
              if (v === null || v === undefined) continue;
              (meta as Record<string, string>)[k] = String(v);
            }
          } catch {
            /* not JSON — ignore */
          }
        } else if (known.has(key)) {
          // Shape 2: one keyword per field.
          (meta as Record<string, string>)[key] = value;
        }
      }
    }
    offset = dataStart + length + 4; // + CRC
  }
  return meta;
}

export function SealDropzone({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SealResult | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    if (!file.name.toLowerCase().endsWith('.png')) {
      setError('A Quantum Seal is a PNG. Drop the .png file, not the envelope.');
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const sha256 = await sha256Hex(buf);
      const metadata = readPngMetadata(buf);
      const notes: string[] = [];
      if (!metadata.version) notes.push('No version field found in the Seal metadata.');
      if (!metadata.file_hash) notes.push('No file_hash field found: cannot cross-check an envelope.');
      const valid = Object.keys(metadata).length > 0;
      setResult({ fileName: file.name, fileSize: file.size, sha256, metadata, valid, notes });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the Seal file.');
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const reset = () => {
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('mx-auto max-w-3xl', className)}>
      {!result && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'panel flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-14 text-center transition-colors',
            dragging ? 'border-brand-gold/60 bg-brand-gold/[0.04]' : 'hover:border-white/20',
          )}
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.06]">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand-gold" />
            ) : (
              <Upload className="h-5 w-5 text-brand-gold" />
            )}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-[#e6e9ef]">
              {busy ? 'Reading Seal…' : 'Drop a Quantum Seal PNG'}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-[#8a93a3]">
              Or click to choose a file. The Seal is read locally in your browser: nothing is uploaded.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-xl border',
                  result.valid
                    ? 'border-emerald-400/25 bg-emerald-400/[0.08]'
                    : 'border-amber-400/25 bg-amber-400/[0.08]',
                )}
              >
                {result.valid ? (
                  <BadgeCheck className="h-5 w-5 text-emerald-300" />
                ) : (
                  <FileImage className="h-5 w-5 text-amber-300" />
                )}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#e6e9ef]">{result.fileName}</span>
                  <span
                    className={cn(
                      'rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                      result.valid
                        ? 'border-emerald-400/30 text-emerald-300'
                        : 'border-amber-400/30 text-amber-300',
                    )}
                  >
                    {result.valid ? 'Seal read' : 'Partial'}
                  </span>
                </div>
                <div className="mt-0.5 text-[11.5px] text-[#7b8493]">
                  {(result.fileSize / 1024).toFixed(1)} KB · signed, unsigned fields below
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label="Clear"
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-[#9aa3b2] transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] sm:grid-cols-2">
            {[
              { label: 'VERSION', value: result.metadata.version ?? '—' },
              { label: 'TIMESTAMP', value: result.metadata.timestamp ?? '—' },
              { label: 'ALGO', value: result.metadata.algo ?? '—' },
              { label: 'FILE HASH', value: result.metadata.file_hash ?? '—' },
              { label: 'WALLET', value: result.metadata.wallet ?? '—' },
              { label: 'X402', value: result.metadata.x402 ?? '—' },
              { label: 'ANCHOR', value: result.metadata.anchor ?? '—' },
              { label: 'SHA-256', value: result.sha256 ? result.sha256 : '—' },
            ].map((row) => (
              <div key={row.label} className="bg-[#060c18] px-4 py-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">
                  {row.label}
                </div>
                <div className="mt-1 break-all font-mono text-[11.5px] text-[#e6e9ef]">{row.value}</div>
              </div>
            ))}
          </div>

          {result.notes.length > 0 && (
            <ul className="mt-4 space-y-2">
              {result.notes.map((n) => (
                <li key={n} className="flex items-start gap-2 text-[12.5px] text-[#8a93a3]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-300" />
                  {n}
                </li>
              ))}
            </ul>
          )}

          {result.valid && result.metadata.file_hash && (
            <p className="mt-5 flex items-start gap-2 text-[12.5px] leading-relaxed text-emerald-300/90">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              To confirm integrity, decrypt the matching .arshield envelope: the server checks that the
              envelope&apos;s SHA-256 matches this Seal&apos;s file_hash.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px]">
        <Link
          href="/mcp"
          className="inline-flex items-center gap-1.5 text-brand-gold transition-colors hover:text-[#e9c35f]"
        >
          Verify from your agent
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link href="/app" className="text-[#5b6474] transition-colors hover:text-[#9aa3b2]">
          Create a Seal in the app
        </Link>
        <span className="inline-flex items-center gap-1.5 text-[#5b6474]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Local only · no upload
        </span>
      </div>
    </div>
  );
}

export default SealDropzone;
