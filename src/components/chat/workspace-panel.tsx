'use client';

/**
 * The right-hand workspace panel.
 *
 * Chat alone can only describe. This panel is where a file is actually handled:
 * a drop target, everything the agent read about the file, the one action that
 * applies to it, and the record of what has been done. Both surfaces drive the
 * same state — dropping here tells chat, and a chat instruction updates here —
 * so there is one file and one truth, not two.
 *
 * The information density is deliberate and mirrors /app: a user about to seal
 * an irreversible-to-undo container should be able to see the algorithm, the
 * hash, the size, and which key will sign it, without asking.
 */

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  FileText,
  Fingerprint,
  History,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import type { FileReport } from '@/lib/agent/inspect';
import type { Identity } from '@/lib/agent/actions';
import { SealingStepper } from '@/components/sealing-stepper';

/* ────────────────────────────── helpers ────────────────────────────── */

function kb(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Hash displayed in two chunks so both ends stay comparable by eye. */
function hash2(h: string): string {
  return `${h.slice(0, 24)}…${h.slice(-8)}`;
}

export type HistoryEntry = {
  id: number;
  kind: 'sealed' | 'opened' | 'message' | 'failed';
  name: string;
  bytes: number;
  at: Date;
  hash?: string;
  note?: string;
};

const KIND_META = {
  sealed: { label: 'Sealed', icon: ShieldCheck, tone: 'verified' },
  opened: { label: 'Opened', icon: Lock, tone: 'action' },
  message: { label: 'Message', icon: FileText, tone: 'progress' },
  failed: { label: 'Failed', icon: AlertTriangle, tone: 'danger' },
} as const;

/* ────────────────────────────── section shell ────────────────────────────── */

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border-b border-white/[0.06] px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6d7787]">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ────────────────────────────── drop zone ────────────────────────────── */

function DropZone({
  onFile,
  busy,
  hasFile,
}: {
  onFile: (f: File) => void;
  busy?: boolean;
  hasFile?: boolean;
}) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        'rounded-xl border border-dashed p-5 text-center transition-colors',
        over
          ? 'border-[var(--color-action)] bg-[var(--color-action-soft)]'
          : 'border-white/[0.12] bg-white/[0.015]',
      )}
    >
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <Upload
        className={cn(
          'mx-auto mb-2 h-5 w-5',
          over ? 'text-[var(--color-action)]' : 'text-[#6d7787]',
        )}
      />
      <p className="text-[13px] text-[#c3cad6]">
        {hasFile ? 'Drop another file to replace' : 'Drop a file here'}
      </p>
      <p className="mt-0.5 text-[11.5px] text-[#6d7787]">or</p>
      <Button
        size="sm"
        variant="ghost"
        className="mt-2"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        Browse files
      </Button>
    </div>
  );
}

/* ────────────────────────────── file detail ────────────────────────────── */

/**
 * Everything read from the file, before any key is involved.
 *
 * The hash is shown because it is the one value the user can check against
 * something else later — a seal receipt, a message, another machine. Sizes are
 * shown together because the difference between "on disk" and "inside" is what
 * tells the user whether a container is plausible.
 */
function FileDetail({ report }: { report: FileReport }) {
  const kindLabel =
    report.kind === 'container'
      ? 'Envelope (.arshield)'
      : report.kind === 'plain'
        ? 'Plain file'
        : report.kind === 'keyfile'
          ? 'Key file'
          : report.kind === 'seal-png'
            ? 'Seal receipt'
            : 'Unknown';

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/[0.05]">
          <FileText className="h-4 w-4 text-[#9aa3b2]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-[#e6e9ef]" title={report.name}>
            {report.name}
          </p>
          <p className="text-[11.5px] text-[#6d7787]">{kindLabel}</p>
        </div>
      </div>

      <dl className="space-y-1.5 font-mono text-[11.5px]">
        <Row label="size">{kb(report.bytes)}</Row>
        {report.container && (
          <>
            <Row label="wire">v{report.container.version} · hybrid-v1</Row>
            {report.container.plaintextBytes !== null && (
              <Row label="inside">{kb(report.container.plaintextBytes)}</Row>
            )}
            <Row label="payload">{report.container.payloadBytes.toLocaleString()} B</Row>
          </>
        )}
        {report.seal?.file_hash && (
          <Row label="claims">{hash2(report.seal.file_hash)}</Row>
        )}
        {report.seal?.algo && <Row label="algo">{report.seal.algo}</Row>}
        {report.seal?.timestamp && (
          <Row label="sealed">{new Date(report.seal.timestamp).toLocaleString()}</Row>
        )}
        <Row label="sha256">{hash2(report.sha256)}</Row>
      </dl>

      <div className="flex items-start gap-2 rounded-lg bg-white/[0.025] p-2.5">
        <Fingerprint className="mt-0.5 h-3.5 w-3.5 flex-none text-[#6d7787]" />
        <p className="text-[11.5px] leading-relaxed text-[#9aa3b2]">{report.summary}</p>
      </div>

      {report.warnings.length > 0 && (
        <ul className="space-y-1">
          {report.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[var(--color-progress)]">
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" />
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex-none text-[#6d7787]">{label}</dt>
      <dd className="truncate text-right text-[#c3cad6]">{children}</dd>
    </div>
  );
}

/* ────────────────────────────── identity ────────────────────────────── */

function IdentityCard({ identity }: { identity: Identity | null }) {
  if (!identity) {
    return (
      <p className="text-[12px] leading-relaxed text-[#6d7787]">
        No key yet. Choose how to hold one in the conversation.
      </p>
    );
  }
  const isWallet = identity.kind === 'wallet';
  const address = isWallet ? identity.label.split('· ')[1] : null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isWallet ? (
          <Wallet className="h-3.5 w-3.5 text-[var(--color-action)]" />
        ) : (
          <KeyRound className="h-3.5 w-3.5 text-[var(--color-verified)]" />
        )}
        <span className="text-[12.5px] text-[#dfe3ea]">
          {isWallet ? 'Wallet signature' : 'Key file'}
        </span>
      </div>
      <p className="truncate font-mono text-[11.5px] text-[#9aa3b2]">
        {address ? `${address.slice(0, 10)}…${address.slice(-8)}` : identity.label}
      </p>
      <p className="text-[11px] leading-relaxed text-[#6d7787]">
        {isWallet
          ? 'Keys are derived from this wallet’s signature. Same wallet, same keys, anywhere.'
          : 'Keys live in the key file you downloaded. Lose it and sealed data cannot be recovered.'}
      </p>
    </div>
  );
}

/* ────────────────────────────── history ────────────────────────────── */

function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-[12px] text-[#6d7787]">Nothing done yet in this session.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {entries.map((e) => {
        const meta = KIND_META[e.kind];
        const Icon = meta.icon;
        const tone =
          meta.tone === 'verified'
            ? 'text-[var(--color-verified)]'
            : meta.tone === 'action'
              ? 'text-[var(--color-action)]'
              : meta.tone === 'progress'
                ? 'text-[var(--color-progress)]'
                : 'text-[var(--color-danger)]';
        return (
          <li key={e.id} className="flex items-start gap-2 rounded-lg bg-white/[0.02] px-2.5 py-2">
            <Icon className={cn('mt-0.5 h-3.5 w-3.5 flex-none', tone)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-[#dfe3ea]" title={e.name}>
                {e.name}
              </p>
              <p className="text-[10.5px] text-[#6d7787]">
                {meta.label} · {kb(e.bytes)} · {e.at.toLocaleTimeString()}
              </p>
              {e.note && <p className="text-[10.5px] text-[#8a93a3]">{e.note}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ────────────────────────────── the panel ────────────────────────────── */

export function WorkspacePanel({
  identity,
  report,
  busy,
  stage,
  history,
  lastResult,
  onFile,
  onClearFile,
  onRun,
  onDownload,
  tierName,
  quota,
}: {
  identity: Identity | null;
  report: FileReport | null;
  busy: boolean;
  /** Live sealing stage list, when a run is in flight. */
  stage: { mode: 'encrypt' | 'decrypt'; done: number } | null;
  history: HistoryEntry[];
  /** Most recent output, for the download controls. */
  lastResult:
    | { kind: 'sealed'; name: string; bytes: Uint8Array; seal: Uint8Array; hash: string }
    | { kind: 'opened'; name: string; bytes: Uint8Array }
    | { kind: 'message'; url: string }
    | null;
  onFile: (f: File) => void;
  onClearFile: () => void;
  onRun: (action: 'encrypt' | 'decrypt') => void;
  onDownload: (target: 'envelope' | 'seal' | 'file') => void;
  tierName: string;
  quota: string;
}) {
  const canRun = !!report?.action && !!identity && !busy;

  return (
    <aside className="flex h-full flex-col overflow-y-auto rounded-2xl border border-white/[0.07] bg-[#04070f]/60 backdrop-blur-xl">
      {/* Header strip: what this panel is, and the quota behind it. */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-action-soft)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-action)]" />
          </div>
          <div>
            <p className="text-[12.5px] font-medium leading-tight text-[#e6e9ef]">Workspace</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7787]">
              {tierName} · {quota}
            </p>
          </div>
        </div>
        {report && (
          <button
            onClick={onClearFile}
            disabled={busy}
            aria-label="Clear file"
            className="rounded-md p-1 text-[#6d7787] transition-colors hover:bg-white/[0.06] hover:text-[#e6e9ef] disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 1. The file in play. */}
      <Section title="File" icon={FileText}>
        {report ? <FileDetail report={report} /> : (
          <DropZone onFile={onFile} busy={busy} hasFile={!!report} />
        )}
      </Section>

      {/* 2. The one action this file admits. */}
      <Section title="Action" icon={Lock}>
        {!report ? (
          <p className="text-[12px] leading-relaxed text-[#6d7787]">
            Drop a file and the agent reads it first. It will only ever offer the action that
            applies — an envelope can be opened, a plain file can be sealed.
          </p>
        ) : report.action === null ? (
          <p className="text-[12px] leading-relaxed text-[#6d7787]">
            Nothing to run on this file. {report.kind === 'keyfile' ? 'It is your key material.' : 'It is a receipt, not an envelope.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            <Button
              size="sm"
              className="w-full"
              disabled={!canRun}
              onClick={() => onRun(report.action!)}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : report.action === 'encrypt' ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" />
              )}
              {report.action === 'encrypt' ? 'Encrypt this file' : 'Decrypt this file'}
            </Button>
            {report.kind === 'container' && (
              <p className="text-[11px] leading-relaxed text-[#6d7787]">
                Opening verifies the ML-DSA-65 signature before anything is decrypted. A wrong
                key reveals nothing and costs no quota.
              </p>
            )}
            {!identity && (
              <p className="text-[11px] text-[var(--color-progress)]">
                Set up a key first — the conversation will walk you through it.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* 3. Live stage list, when running. */}
      {stage && (
        <Section title="Running" icon={Clock}>
          <SealingStepper mode={stage.mode} done={stage.done} running={stage.done < 5} />
        </Section>
      )}

      {/* 4. Output controls. A message has no file to save — it lives in its
          link, which the conversation already shows — so only file results get
          a download section. */}
      {lastResult && lastResult.kind !== 'message' && !busy && (
        <Section title="Output" icon={Download}>
          <div className="space-y-2">
            <p className="truncate text-[12px] text-[#c3cad6]" title={lastResult.name}>
              {lastResult.name}
            </p>
            {lastResult.kind === 'sealed' && (
              <p className="truncate font-mono text-[10.5px] text-[#6d7787]">
                {hash2(lastResult.hash)}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {lastResult.kind === 'sealed' && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => onDownload('envelope')}>
                    <Download className="h-3 w-3" />
                    Envelope
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDownload('seal')}>
                    <Download className="h-3 w-3" />
                    Seal PNG
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => onDownload('file')}>
                <Download className="h-3 w-3" />
                File
              </Button>
            </div>
          </div>
        </Section>
      )}

      {/* 5. Which key will sign. */}
      <Section title="Signing key" icon={KeyRound}>
        <IdentityCard identity={identity} />
      </Section>

      {/* 6. What has been done. */}
      <Section
        title="History"
        icon={History}
        action={
          history.length > 0 ? (
            <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--color-verified)]">
              <Check className="h-3 w-3" />
              {history.length}
            </span>
          ) : undefined
        }
      >
        <HistoryList entries={history} />
      </Section>

      {/* Standing claim, kept visible rather than in a footer footnote. */}
      <div className="mt-auto border-t border-white/[0.06] px-4 py-3">
        <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[#5c6675]">
          <ShieldCheck className="mt-0.5 h-3 w-3 flex-none text-[var(--color-verified)]/60" />
          Parsing, hashing and sealing all run in this tab. Nothing here is uploaded.
        </p>
      </div>
    </aside>
  );
}
