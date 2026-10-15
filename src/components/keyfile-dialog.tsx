'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Eye, EyeOff, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { Button } from '@/components/button';

/**
 * Modal for creating or opening a passphrase-protected key file.
 *
 * Two things this exists to prevent:
 *
 * 1. Generating a file the user cannot reopen. An earlier version fell back to
 *    a hardcoded passphrase when the field was empty, so the download succeeded
 *    and the file was useless — nothing told the user what it had been locked
 *    with. The passphrase is now required and confirmed before anything is
 *    written.
 *
 * 2. Silent failures on load. A wrong passphrase and a file that is not a key
 *    file at all both surfaced as the same generic error. They are different
 *    problems with different fixes, so they are detected and reported apart.
 *
 * The strength meter is advisory — it never blocks a submission, it just tells
 * the user what they are choosing. The only hard rule is the 12-character floor,
 * which matches what the format and the reference implementation use.
 */

const MIN_LEN = 12;

type Mode = 'create' | 'open';

export function KeyfileDialog({
  mode,
  open,
  onClose,
  /** create: receive the passphrase the user chose. open: receive file + passphrase. */
  onCreate,
  onOpen,
  busy,
  error,
}: {
  mode: Mode;
  open: boolean;
  onClose: () => void;
  onCreate?: (passphrase: string) => void | Promise<void>;
  onOpen?: (json: string, passphrase: string) => void | Promise<void>;
  busy?: boolean;
  error?: string | null;
}) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileJson, setFileJson] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Escape closes, and the body stops scrolling while the modal is up.
  // The parent remounts this component per open (via `key`), so no reset
  // effect is needed — which also avoids a cascading render on every open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  const strength = useMemo(() => scorePassphrase(pass), [pass]);
  const tooShort = pass.length > 0 && pass.length < MIN_LEN;
  const mismatch = confirm.length > 0 && pass !== confirm;

  const createReady = pass.length >= MIN_LEN && pass === confirm && !busy;
  const openReady = !!fileJson && pass.length > 0 && !busy;

  async function pickFile(f: File | undefined | null) {
    setFileError(null);
    setFileJson(null);
    setFileName('');
    if (!f) return;
    setFileName(f.name);
    let text: string;
    try {
      text = await f.text();
    } catch {
      setFileError('Could not read that file.');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setFileError('That is not a JSON file. Pick the .json key file you downloaded.');
      return;
    }
    const looksRight =
      typeof parsed === 'object' && parsed !== null &&
      (parsed as Record<string, unknown>).kdf === 'argon2id';
    if (!looksRight) {
      setFileError('That JSON is not an ArShield key file. It should name argon2id as its KDF.');
      return;
    }
    setFileJson(text);
  }

  if (!open) return null;

  const title = mode === 'create' ? 'Protect your key file' : 'Open your key file';
  const blurb =
    mode === 'create'
      ? 'Your keypair is wrapped with Argon2id and AES-256-GCM. The passphrase is the only thing that opens it — there is no reset and no recovery.'
      : 'Pick the .json key file and enter its passphrase. Nothing is uploaded; the file is read here in the browser.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.10] bg-[#080d18] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#eef1f6]">{title}</h2>
            <p className="mt-1 max-w-[36ch] text-[12.5px] leading-relaxed text-[#8b94a4]">{blurb}</p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="ml-4 flex-none rounded-lg p-1.5 text-[#7a8494] transition-colors hover:bg-white/[0.06] hover:text-[#e6e9ef] disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {mode === 'open' && (
            <div>
              <label className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#8b94a4]">
                Key file
              </label>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-50"
              >
                <Upload className="h-4 w-4 flex-none text-[#8b94a4]" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[#aab3c1]">
                  {fileName || 'Choose a .json key file'}
                </span>
                {fileJson && <Check className="h-4 w-4 flex-none text-[var(--color-verified)]" />}
              </button>
              {fileError && (
                <p className="mt-2 flex items-start gap-1.5 text-[12px] text-red-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  {fileError}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#8b94a4]">
              Passphrase{' '}
              {mode === 'create' && (
                <span className="font-normal normal-case tracking-normal text-[#6f7889]">
                  (min {MIN_LEN} characters)
                </span>
              )}
            </label>
            <div className="relative mt-2">
              <input
                type={reveal ? 'text' : 'password'}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder={mode === 'create' ? 'choose a strong passphrase' : 'enter your passphrase'}
                autoFocus
                autoComplete="new-password"
                disabled={busy}
                className="w-full rounded-xl border border-white/12 bg-[#03070f] px-3.5 py-2.5 pr-11 text-[13.5px] text-[#eef1f6] outline-none placeholder:text-[#6f7889] focus:border-brand-gold/50 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                disabled={busy}
                aria-label={reveal ? 'Hide passphrase' : 'Show passphrase'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#7a8494] transition-colors hover:text-[#c8cedb] disabled:opacity-40"
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === 'create' && tooShort && (
              <p className="mt-2 text-[12px] text-[#e5a23c]">
                At least {MIN_LEN} characters. Length matters more than symbols.
              </p>
            )}

            {mode === 'create' && pass.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={[
                        'h-1 flex-1 rounded-full transition-colors duration-300',
                        i < strength.score ? strength.tone : 'bg-white/[0.08]',
                      ].join(' ')}
                    />
                  ))}
                </div>
                <span className={`text-[11.5px] ${strength.text}`}>{strength.label}</span>
              </div>
            )}
          </div>

          {mode === 'create' && (
            <div>
              <label className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#8b94a4]">
                Confirm passphrase
              </label>
              <input
                type={reveal ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="type it again"
                autoComplete="new-password"
                disabled={busy}
                className="mt-2 w-full rounded-xl border border-white/12 bg-[#03070f] px-3.5 py-2.5 text-[13.5px] text-[#eef1f6] outline-none placeholder:text-[#6f7889] focus:border-brand-gold/50 disabled:opacity-60"
              />
              {mismatch && (
                <p className="mt-2 text-[12px] text-red-300">Passphrases do not match.</p>
              )}
            </div>
          )}

          {mode === 'create' && (
            <p className="rounded-xl border border-[var(--color-progress)]/25 bg-[var(--color-progress)]/[0.06] px-3.5 py-3 text-[12px] leading-relaxed text-[#c9b28a]">
              Write this passphrase down somewhere separate from the file. If you lose both, the
              files sealed to this key are unrecoverable — no server holds a copy.
            </p>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3.5 py-3 text-[12.5px] leading-relaxed text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.07] px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {mode === 'create' ? (
            <Button
              variant="primary"
              onClick={() => onCreate?.(pass)}
              disabled={!createReady}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Wrapping…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Generate &amp; download
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => fileJson && onOpen?.(fileJson, pass)}
              disabled={!openReady}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Unlocking…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Unlock key file
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Rough passphrase strength. Length dominates, then variety; this is a hint,
 * never a gate. A long plain sentence scores well, which is the intent.
 */
function scorePassphrase(p: string): { score: number; label: string; tone: string; text: string } {
  if (p.length === 0) return { score: 0, label: '', tone: '', text: '' };

  let score = 0;
  if (p.length >= 12) score += 1;
  if (p.length >= 16) score += 1;
  if (p.length >= 24) score += 1;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  if (classes >= 2) score += 1;
  if (classes >= 3 && p.length >= 16) score += 1;

  const capped = Math.min(4, Math.max(1, score));
  if (capped <= 1) return { score: 1, label: 'Weak', tone: 'bg-red-400/70', text: 'text-red-300' };
  if (capped === 2) return { score: 2, label: 'Fair', tone: 'bg-[var(--color-progress)]', text: 'text-[#e5a23c]' };
  if (capped === 3) return { score: 3, label: 'Good', tone: 'bg-[var(--color-action)]', text: 'text-[var(--color-action)]' };
  return { score: 4, label: 'Strong', tone: 'bg-[var(--color-verified)]', text: 'text-[var(--color-verified)]' };
}
