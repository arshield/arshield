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
  KeyRound,
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
import type { FileReport } from '@/lib/agent/inspect';

/* ────────────────────────────── file report card ────────────────────────────── */

/**
 * The card the agent produces when it reads a file.
 *
 * This is the answer to "decrypt file": before any button is pressed, the agent
 * says what the file is, how big it is, what is inside it, and which action
 * applies — with that action as a button. The user never has to know the rule
 * about which files can be opened; the report states it.
 */
export function FileReportCard({
  report,
  onRun,
  onInspectSeal,
  busy,
}: {
  report: FileReport;
  onRun: (action: 'encrypt' | 'decrypt') => void;
  onInspectSeal?: () => void;
  busy?: boolean;
}) {
  const kindLabel =
    report.kind === 'container'
      ? 'Envelope'
      : report.kind === 'plain'
        ? 'Plain file'
        : report.kind === 'keyfile'
          ? 'Key file'
          : report.kind === 'seal-png'
            ? 'Seal receipt'
            : 'Unknown';

  const ring =
    report.kind === 'container'
      ? 'ring-[var(--color-action)]/28'
      : report.kind === 'plain'
        ? 'ring-[var(--color-hairline)]'
        : 'ring-[var(--color-verified)]/25';

  const wash =
    report.kind === 'container'
      ? 'linear-gradient(180deg, rgba(209,164,19,0.07), rgba(209,164,19,0.015)), var(--color-card)'
      : report.kind === 'plain'
        ? 'var(--color-card)'
        : 'linear-gradient(180deg, rgba(74,222,155,0.06), rgba(74,222,155,0.015)), var(--color-card)';

  return (
    <div
      className={cn('mt-2.5 space-y-3.5 rounded-2xl p-4 ring-1', ring)}
      style={{ background: wash, boxShadow: 'var(--elevation-2), var(--highlight-top)' }}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[var(--color-card-inset)] ring-1 ring-[var(--color-hairline)]">
          <FileText className="h-4 w-4 text-[#aab3c1]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-[#eef1f6]" title={report.name}>
            {report.name}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#8a93a3]">
            {kindLabel}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 text-[13px]">
        <Fact label="size" value={formatBytes(report.bytes)} mono />
        {report.container?.plaintextBytes != null && (
          <Fact label="plaintext inside" value={`~${formatBytes(report.container.plaintextBytes)}`} mono />
        )}
        {report.container && (
          <Fact
            label="format"
            value={`v${report.container.version} · hybrid post-quantum`}
            tone="verified"
          />
        )}
        {report.seal?.file_hash && (
          <Fact label="claims hash" value={shortHash(report.seal.file_hash)} mono />
        )}
        {report.seal?.algo && <Fact label="algorithm" value={report.seal.algo} />}
        <Fact label="sha256" value={shortHash(report.sha256)} mono tone="idle" />
      </div>

      {report.warnings.length > 0 && (
        <ul className="space-y-1">
          {report.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--color-progress)]">
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" />
              {w}
            </li>
          ))}
        </ul>
      )}

      {/* The action, as a button. This is the part that replaces "say the magic
          word" — the report already knows what applies. */}
      {report.action && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-2.5">
          <Button size="sm" onClick={() => onRun(report.action!)} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : report.action === 'encrypt' ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            {report.action === 'encrypt' ? 'Encrypt' : 'Decrypt'}
          </Button>
          <span className="text-[11.5px] text-[#8a93a3]">
            {report.action === 'encrypt'
              ? 'seals it into a .arshield container'
              : 'verifies the signature, then decrypts'}
          </span>
        </div>
      )}

      {report.kind === 'seal-png' && onInspectSeal && (
        <div className="border-t border-white/[0.07] pt-2.5">
          <Button size="sm" variant="ghost" onClick={onInspectSeal}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Open in verifier
          </Button>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────── messages ────────────────────────────── */

export type ChatRole = 'agent' | 'user';

export function Bubble({
  role,
  wide = false,
  settled = false,
  children,
}: {
  role: ChatRole;
  /**
   * Let this bubble exceed the usual cap.
   *
   * The stage list is a five-row table with a progress bar — at 85% the crypto
   * names and the detail text underneath them collapse into ellipses, which
   * defeats the point of showing the sequence at all.
   */
  wide?: boolean;
  /**
   * Render as a bare container rather than a chat bubble.
   *
   * Cards the agent produces — identity, file report, results — are objects, not
   * speech. Putting them inside another bubble nested a raised surface in a
   * raised surface, which is where the flatness came from: the card and its
   * container ended up the same colour with two nearly identical outlines.
   */
  settled?: boolean;
  children: React.ReactNode;
}) {
  const isUser = role === 'user';

  if (settled) {
    return <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>{children}</div>;
  }

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-2xl px-4 py-3 text-[13.5px] leading-[1.6]',
          wide ? 'w-full' : 'max-w-[78%]',
          isUser
            ? // The user's own words: a flat gold-tinted plate. No shadow — it is
              // the lightest thing in the column so it carries no elevation.
              'rounded-br-md bg-[var(--color-action-soft)] text-[#f0f3f8] ring-1 ring-[var(--color-action)]/25'
            : // The agent's words: a real surface, one step up from the page, with
              // a warm hairline. This is the difference between a panel and a
              // dark rectangle with a border.
              'rounded-bl-md bg-[var(--color-card)] text-[#dde3ec] ring-1 ring-[var(--color-hairline)]',
        )}
        style={isUser ? undefined : { boxShadow: 'var(--elevation-1)' }}
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
  // The tint rides on top of the card colour rather than replacing it, so the
  // surface stays a raised pane and the tint only says which kind of outcome it
  // is. A flat wash made the card read as a coloured div rather than an object.
  const wash =
    tone === 'verified'
      ? 'linear-gradient(180deg, rgba(74,222,155,0.07), rgba(74,222,155,0.02)), var(--color-card)'
      : 'linear-gradient(180deg, rgba(240,161,58,0.07), rgba(240,161,58,0.02)), var(--color-card)';

  return (
    <div
      className={cn(
        'mt-2.5 space-y-3.5 rounded-2xl p-4 ring-1',
        tone === 'verified'
          ? 'ring-[var(--color-verified)]/22'
          : 'ring-[var(--color-progress)]/25',
      )}
      style={{ background: wash, boxShadow: 'var(--elevation-2), var(--highlight-top)' }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex h-7 w-7 flex-none items-center justify-center rounded-lg',
            tone === 'verified' ? 'bg-[var(--color-verified-soft)]' : 'bg-[var(--color-progress-soft)]',
          )}
        >
          {mark}
        </span>
        <span className="text-[13.5px] font-medium text-[#eef1f6]">{title}</span>
      </div>
      <div className="space-y-2 text-[13px] text-[#98a2b3]">{children}</div>
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

/* ────────────────────────────── identity ────────────────────────────── */

/** Small monospace address, both ends kept so two addresses stay comparable. */
function shortAddr(a: string): string {
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

/**
 * The identity card.
 *
 * Two states, and the difference between them is the whole point:
 *
 *   open      a choice. Wallet or key file, side by side, each stating what it
 *             needs and what it costs. Shown only while there is no key.
 *   settled   a fact. One key, what kind it is, where it lives, and what that
 *             implies about recovery. Shown once a key exists.
 *
 * The previous version drew the choice card again after a successful connect,
 * so the answer to "how do you want to hold your keys" stayed on screen after
 * the user had answered it — and the two live buttons sitting there implied the
 * setup had not taken. A settled state has no competing buttons: the only
 * control is changing the key, which is an escape hatch, not a peer option.
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
    <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
      {/* Wallet path. The requirement is stated before the button, not after it
          fails — a wallet that cannot derive keys should not look like the
          default recommendation. */}
      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl p-4 transition-colors',
          recommended === 'keyfile'
            ? 'bg-[var(--color-card-inset)] ring-1 ring-[var(--color-hairline)]'
            : 'bg-[var(--color-card)] ring-1 ring-[var(--color-hairline-warm)]',
        )}
        style={{ boxShadow: 'var(--elevation-2), var(--highlight-top)' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex h-8 w-8 flex-none items-center justify-center rounded-xl',
              recommended === 'keyfile'
                ? 'bg-white/[0.05] text-[#8a93a3]'
                : 'bg-[var(--color-action-soft)] text-[var(--color-action)]',
            )}
          >
            <Wallet className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-medium leading-tight text-[#eef1f6]">
              Wallet signature
            </p>
            <p className="text-[11.5px] leading-tight text-[#7f8a9b]">
              Same keys on any device, from one signature
            </p>
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-[#98a2b3]">
          No passphrase to remember and nothing to back up. Needs a standard EOA
          wallet — smart-contract wallets sign in a format that cannot derive keys.
        </p>

        <Button
          size="sm"
          variant={recommended === 'keyfile' ? 'ghost' : 'primary'}
          onClick={onWallet}
          disabled={busy}
          className="mt-auto w-full"
        >
          Connect wallet
        </Button>
      </div>

      {/* Key-file path. Always available, which is what makes the "everyone can
          use this" claim true — no wallet, no chain, no extension. */}
      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl p-4 transition-colors',
          recommended === 'keyfile'
            ? 'bg-[var(--color-card-raised)] ring-1 ring-[var(--color-verified)]/30'
            : 'bg-[var(--color-card)] ring-1 ring-[var(--color-hairline)]',
        )}
        style={{ boxShadow: 'var(--elevation-2), var(--highlight-top)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-[var(--color-verified-soft)] text-[var(--color-verified)]">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-medium leading-tight text-[#eef1f6]">Key file</p>
            <p className="text-[11.5px] leading-tight text-[#7f8a9b]">
              Works with no wallet at all
            </p>
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-[#98a2b3]">
          Keys are random and locked under a passphrase you choose. The file is the
          only copy — lose it and sealed data cannot be recovered, by anyone.
        </p>

        <div className="mt-auto flex gap-2">
          <Button
            size="sm"
            variant={recommended === 'keyfile' ? 'primary' : 'ghost'}
            onClick={onCreateKeyfile}
            disabled={busy}
            className="flex-1"
          >
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

/**
 * The settled identity, shown once a key exists.
 *
 * States what the key is, not how it was chosen. Designed to sit in the
 * conversation as a receipt: the user should be able to scroll back later and
 * see which key sealed which file.
 */
export function IdentitySettled({
  identity,
  detail,
  onChangeKey,
}: {
  identity: { kind: 'wallet' | 'keyfile'; address?: string; label: string };
  /** One line on what this key means for recovery — different per kind. */
  detail?: string;
  onChangeKey: () => void;
}) {
  const isWallet = identity.kind === 'wallet';
  return (
    <div
      className="mt-2.5 flex items-start gap-3.5 rounded-2xl p-4 ring-1 ring-[var(--color-verified)]/22"
      style={{
        background:
          'linear-gradient(180deg, rgba(74,222,155,0.055), rgba(74,222,155,0.015)), var(--color-card)',
        boxShadow: 'var(--elevation-2), var(--highlight-top)',
      }}
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[var(--color-verified-soft)] text-[var(--color-verified)] ring-1 ring-[var(--color-verified)]/25">
        <ShieldCheck className="h-4.5 w-4.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <p className="text-[14px] font-medium text-[#eef1f6]">
            {isWallet ? 'Wallet connected' : 'Key file loaded'}
          </p>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-verified)]">
            <Check className="h-3 w-3" />
            ready
          </span>
        </div>

        <p className="mt-1 font-mono text-[12px] text-[#aab3c1]">
          {identity.address ? shortAddr(identity.address) : identity.label}
        </p>

        {detail && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#8a93a3]">{detail}</p>
        )}

        <button
          onClick={onChangeKey}
          className="mt-2 text-[11.5px] text-[#7f8a9b] underline-offset-2 transition-colors hover:text-[#e6e9ef] hover:underline"
        >
          Use a different key
        </button>
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
