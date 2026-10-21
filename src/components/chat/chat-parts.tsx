'use client';

/**
 * Chat surface primitives.
 *
 * Visual rules this file is held to, and why:
 *
 * - Colour carries meaning, never decoration. Gold is reserved for actions the
 *   user can take; green marks something verified; amber marks work in progress;
 *   red marks a failure. The workspace used to print its guard message in the
 *   brand gold at 12.5px, which made an error read as a caption — that is the
 *   exact mistake these components exist to not repeat.
 * - Errors are the loudest text on screen, not the quietest. A failure the user
 *   cannot see is a failure they will blame on the app.
 * - Nothing animates that does not mean something. Motion is used for arrival
 *   and for "still working", and nothing else.
 */

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  Copy,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';

/* ────────────────────────────── messages ────────────────────────────── */

export type ChatRole = 'agent' | 'user';

export function Bubble({
  role,
  children,
}: {
  role: ChatRole;
  children: React.ReactNode;
}) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-[var(--color-action-soft)] text-[#e6e9ef] ring-1 ring-[var(--color-action)]/25'
            : 'rounded-bl-sm bg-white/[0.04] text-[#dfe3ea] ring-1 ring-white/[0.07]',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** The agent is working. Named so the wait says what it is waiting on. */
export function Working({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[var(--color-progress)]">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

/**
 * A failure with a next step.
 *
 * When there is an offer attached, the message says what happened and the button
 * says what to do about it. Without the button this is just an apology, which is
 * what the old guard message was.
 */
export function Failure({
  message,
  detail,
  offer,
  onOffer,
}: {
  message: string;
  detail?: string;
  offer?: string;
  onOffer?: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" />
        <div className="space-y-1">
          {/* 14px, full-strength foreground: readable at a glance, not tucked
              below the fold in a footnote weight. */}
          <p className="text-sm font-medium text-[#f3d4d4]">{message}</p>
          {detail && <p className="text-[13px] leading-relaxed text-[#9aa3b2]">{detail}</p>}
        </div>
      </div>
      {offer && onOffer && (
        <Button size="sm" variant="outline" onClick={onOffer}>
          <FileText className="h-3.5 w-3.5" />
          {offer}
        </Button>
      )}
    </div>
  );
}

/* ────────────────────────────── file chip ────────────────────────────── */

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** A file the user attached, before anything has been done to it. */
export function FileChip({
  name,
  size,
  onRemove,
  busy,
}: {
  name: string;
  size: number;
  onRemove: () => void;
  busy?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[13px] text-[#dfe3ea]">
      <FileText className="h-3.5 w-3.5 text-[var(--color-idle)]" />
      <span className="max-w-[220px] truncate">{name}</span>
      <span className="text-[var(--color-idle)]">{formatBytes(size)}</span>
      <button
        onClick={onRemove}
        disabled={busy}
        aria-label={`Remove ${name}`}
        className="ml-0.5 rounded-full p-0.5 text-[var(--color-idle)] transition-colors hover:bg-white/10 hover:text-[#e6e9ef] disabled:opacity-40"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ────────────────────────────── result card ────────────────────────────── */

/** Two lines of hash, middle elided so both ends stay comparable by eye. */
function shortHash(h: string): string {
  return `${h.slice(0, 20)}…${h.slice(-16)}`;
}

export function ResultCard({
  title,
  children,
  actions,
  tone = 'verified',
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  tone?: 'verified' | 'progress';
}) {
  const mark =
    tone === 'verified' ? (
      <ShieldCheck className="h-4 w-4 text-[var(--color-verified)]" />
    ) : (
      <Lock className="h-4 w-4 text-[var(--color-progress)]" />
    );
  return (
    <div
      className={cn(
        'mt-2 space-y-3 rounded-xl border p-3.5',
        tone === 'verified'
          ? 'border-[var(--color-verified)]/25 bg-[var(--color-verified-soft)]'
          : 'border-[var(--color-progress)]/25 bg-[var(--color-progress-soft)]',
      )}
    >
      <div className="flex items-center gap-2">
        {mark}
        <span className="text-sm font-medium text-[#e9edf3]">{title}</span>
      </div>
      <div className="space-y-2 text-[13px] text-[#9aa3b2]">{children}</div>
      {actions && <div className="flex flex-wrap gap-2 pt-0.5">{actions}</div>}
    </div>
  );
}

/** A labelled fact row inside a result card. Monospace for anything machine-made. */
export function Fact({
  label,
  value,
  mono = false,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'verified' | 'danger' | 'idle';
}) {
  const colour =
    tone === 'verified'
      ? 'text-[var(--color-verified)]'
      : tone === 'danger'
        ? 'text-[var(--color-danger)]'
        : tone === 'idle'
          ? 'text-[var(--color-idle)]'
          : 'text-[#dfe3ea]';
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-[var(--color-idle)]">{label}</span>
      <span className={cn('truncate text-right', mono && 'font-mono text-[12px]', colour)}>
        {value}
      </span>
    </div>
  );
}

/** Copy-to-clipboard with a visible confirmation. */
export function CopyRow({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setDone(true);
          timer.current = setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? (
        <>
          <Check className="h-3.5 w-3.5 text-[var(--color-verified)]" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}

/* ────────────────────────────── confirmation ────────────────────────────── */

/**
 * The gate in front of a destructive or irreversible action.
 *
 * Opening an envelope with the wrong key burns a decrypt attempt and reveals
 * nothing; sealing a file the user meant to open produces a container they now
 * have to undo. Both are cheap to get wrong and neither is obviously wrong at
 * the moment of the mistake, which is exactly when a one-line confirm earns its
 * place. Kept inline rather than modal so the conversation stays in view.
 */
export function ConfirmGate({
  question,
  detail,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy,
}: {
  question: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="mt-2 space-y-3 rounded-xl border border-[var(--color-progress)]/25 bg-[var(--color-progress-soft)] p-3.5">
      <div className="flex items-start gap-2.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-progress)]" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#f0e2cc]">{question}</p>
          {detail && <p className="text-[13px] leading-relaxed text-[#9aa3b2]">{detail}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onConfirm} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {confirmLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}

/* ────────────────────────────── identity offers ────────────────────────────── */

/**
 * The two key paths, offered together.
 *
 * Both are always shown. The old picker presented "Wallet — FASTEST" as the
 * default, so the path that fails for smart-contract wallets looked like the
 * recommended one. Here the wallet path states its own requirement up front, and
 * the key-file path states that it has none.
 */
export function IdentityOffers({
  onWallet,
  onCreateKeyfile,
  onLoadKeyfile,
  busy,
  recommended,
}: {
  onWallet: () => void;
  onCreateKeyfile: () => void;
  onLoadKeyfile: () => void;
  busy?: boolean;
  /** Set when detection has already ruled the wallet path out. */
  recommended?: 'keyfile' | null;
}) {
  return (
    <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
      {/* Wallet path */}
      <div
        className={cn(
          'space-y-2.5 rounded-xl border p-3.5',
          recommended === 'keyfile'
            ? 'border-white/[0.07] bg-white/[0.02] opacity-70'
            : 'border-[var(--color-action)]/30 bg-[var(--color-action-soft)]',
        )}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[var(--color-action)]" />
          <span className="text-sm font-medium text-[#e9edf3]">Wallet signature</span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-[#9aa3b2]">
          Derives the same keys on every device from one signature. Needs a standard
          EOA wallet — smart-contract wallets cannot be used for key derivation.
        </p>
        <Button size="sm" variant="outline" onClick={onWallet} disabled={busy} className="w-full">
          Connect wallet
        </Button>
      </div>

      {/* Key-file path */}
      <div
        className={cn(
          'space-y-2.5 rounded-xl border p-3.5',
          recommended === 'keyfile'
            ? 'border-[var(--color-verified)]/30 bg-[var(--color-verified-soft)]'
            : 'border-white/[0.07] bg-white/[0.02]',
        )}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--color-verified)]" />
          <span className="text-sm font-medium text-[#e9edf3]">Key file</span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-[#9aa3b2]">
          Random keys locked under a passphrase. Works with no wallet at all. The file
          is the only copy — lose it and the data is gone for good.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCreateKeyfile} disabled={busy} className="flex-1">
            Generate
          </Button>
          <Button size="sm" variant="ghost" onClick={onLoadKeyfile} disabled={busy} className="flex-1">
            Load
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── composer ────────────────────────────── */

/**
 * The input row.
 *
 * The attach button lives inside the composer rather than as a separate drop
 * zone above it, because the user's mental model is a conversation: they bring a
 * file into the conversation first, then say what to do with it. A bare "seal
 * it" is a complete instruction once a file is attached — route() relies on that.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  onAttach,
  onDropFile,
  disabled,
  busy,
  attached,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onAttach: (f: File) => void;
  onDropFile: (f: File) => void;
  disabled?: boolean;
  busy?: boolean;
  attached?: { name: string; size: number } | null;
}) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onDropFile(f);
      }}
      className={cn(
        'relative rounded-2xl border bg-[#04070f]/80 p-2 backdrop-blur-xl transition-colors',
        dragging
          ? 'border-[var(--color-action)] bg-[var(--color-action-soft)]'
          : 'border-white/[0.08]',
      )}
    >
      {attached && (
        <div className="px-1 pb-2 pt-1">
          <span className="text-[12px] text-[var(--color-idle)]">Attached · </span>
          <span className="text-[12px] text-[#dfe3ea]">{attached.name}</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled}
          aria-label="Attach a file"
          className="mb-0.5 rounded-full p-2 text-[var(--color-idle)] transition-colors hover:bg-white/[0.06] hover:text-[#e6e9ef] disabled:opacity-40"
        >
          <Upload className="h-4 w-4" />
        </button>
        <input
          ref={input}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAttach(f);
            e.target.value = '';
          }}
        />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={disabled ? 'Set up your keys to begin…' : 'Seal this file, or ask for a message…'}
          // Auto-grow: fixed two rows leaves a gap under a one-line message, and
          // one row scrolls a long instruction out of sight while it is typed.
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
          className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm text-[#e6e9ef] outline-none placeholder:text-[var(--color-idle)] disabled:opacity-50"
        />
        <Button type="submit" size="sm" disabled={disabled || busy || value.trim().length === 0}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
          Send
        </Button>
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-[#04070f]/85">
          <span className="text-sm font-medium text-[var(--color-action)]">Drop to attach</span>
        </div>
      )}
    </form>
  );
}

/* ────────────────────────────── status strip ────────────────────────────── */

/**
 * Identity + tier, stated as evidence rather than as a badge.
 *
 * Shows the quota and what the entitlement rests on. A pill that just says
 * "FREE" invites the question it should have answered.
 */
export function StatusStrip({
  identity,
  tierName,
  quota,
  onReset,
  chainNote,
}: {
  identity: { kind: 'wallet' | 'keyfile'; label: string; address?: string };
  tierName: string;
  quota: string;
  onReset: () => void;
  chainNote?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/[0.06] px-1 pb-3 text-[12px]">
      <span className="flex items-center gap-1.5 text-[#dfe3ea]">
        {identity.kind === 'wallet' ? (
          <Wallet className="h-3.5 w-3.5 text-[var(--color-action)]" />
        ) : (
          <Unlock className="h-3.5 w-3.5 text-[var(--color-verified)]" />
        )}
        {identity.address ? `${identity.address.slice(0, 6)}…${identity.address.slice(-4)}` : identity.label}
      </span>
      <span className="text-[var(--color-idle)]">·</span>
      <span className="text-[var(--color-idle)]">{tierName}</span>
      <span className="text-[var(--color-idle)]">·</span>
      <span className="text-[var(--color-idle)]">{quota}</span>
      {chainNote && (
        <>
          <span className="text-[var(--color-idle)]">·</span>
          <span className="text-[var(--color-verified)]">{chainNote}</span>
        </>
      )}
      <button
        onClick={onReset}
        className="ml-auto text-[var(--color-idle)] underline-offset-2 transition-colors hover:text-[#e6e9ef] hover:underline"
      >
        change key
      </button>
    </div>
  );
}

export { shortHash };
