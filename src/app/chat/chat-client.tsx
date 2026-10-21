'use client';

/**
 * The chat agent, two columns.
 *
 * Left is the conversation; right is the workspace. They are one state, not two
 * views of separate things: dropping a file in the panel makes the agent read it
 * and describe it in the conversation, and pressing a button in the conversation
 * updates the panel. That is what makes the split useful rather than decorative
 * — the agent's reading of a file and the controls over it are never out of sync.
 *
 * The behaviour that makes this more than a text box is that it reads before it
 * asks. Attaching a file produces a report — kind, size, hash, what is inside —
 * and the applicable action as a button. The user never has to know which files
 * can be opened; the report says so.
 *
 * Every action still goes through the same confirmation gate, and the rule about
 * key material is unchanged — nothing here is uploaded, and no server reads the
 * instructions. See lib/agent/router.ts for why the routing is local.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, ShieldCheck } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
import { Button } from '@/components/button';
import { KeyfileDialog } from '@/components/keyfile-dialog';
import { download } from '@/lib/agent/message';
import { greeting, route, type FileRef } from '@/lib/agent/router';
import { openFile, sealFile, sealMessage, type AgentResult, type Identity } from '@/lib/agent/actions';
import { detectWalletKind, isUnsupported, type Detection } from '@/lib/agent/detect';
import {
  describeReport,
  inspectFile,
  type FileReport,
} from '@/lib/agent/inspect';
import { playSteps } from '@/lib/play-steps';
import { SealingStepper } from '@/components/sealing-stepper';
import { ARGON2ID_PARAMS_PROD } from '@/lib/arshield/constants';
import { ephemeralIdentity, unwrapKeyfile, wrapKeyfile, type ArShieldKeyPair } from '@/lib/arshield';
import { canEncrypt, encryptionsLeft, incrementEncryptionsUsed, TIER_BY_KEY, type Tier } from '@/lib/tiers';
import {
  Bubble,
  Composer,
  ConfirmGate,
  Fact,
  FileChip,
  FileReportCard,
  Failure,
  IdentityOffers,
  ResultCard,
  CopyRow,
  StatusStrip,
  Working,
  shortHash,
} from '@/components/chat/chat-parts';
import { WorkspacePanel, type HistoryEntry } from '@/components/chat/workspace-panel';

/* ────────────────────────────── turn model ────────────────────────────── */

type Turn =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'agent'; text: string }
  | { id: number; role: 'agent'; node: React.ReactNode };

/**
 * A turn before it has an id.
 *
 * Written out rather than as Omit<Turn, 'id'>: Omit over a union keeps only the
 * common keys, which drops both `text` and `node` and turns every push() call
 * into an excess-property error.
 */
type TurnInput =
  | { role: 'user'; text: string }
  | { role: 'agent'; text: string }
  | { role: 'agent'; node: React.ReactNode };

/** A pending action waiting on the user's confirmation. */
type Pending =
  | { kind: 'seal'; file: FileRef }
  | { kind: 'open'; file: FileRef };

/** Key-file dialog. Create needs a passphrase out, open needs file + passphrase in. */
type Dialog = 'create' | 'open' | null;

export function ChatClient() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Working…');
  const [attached, setAttached] = useState<FileRef | null>(null);
  const [report, setReport] = useState<FileReport | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastResult, setLastResult] = useState<
    | { kind: 'sealed'; name: string; bytes: Uint8Array; seal: Uint8Array; hash: string }
    | { kind: 'opened'; name: string; bytes: Uint8Array }
    | { kind: 'message'; url: string }
    | null
  >(null);

  /**
   * Tier is read-only here for now.
   *
   * The workspace writes it from a live $arshield balance; chat has no balance
   * read yet, so it runs on Free and the status card reports the real quota
   * rather than a level it cannot substantiate.
   */
  const [tier] = useState<Tier>(TIER_BY_KEY.free);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [kdfProgress, setKdfProgress] = useState<number | null>(null);
  const [keyfileError, setKeyfileError] = useState<string | null>(null);

  /**
   * Live stage list for a sealing or opening run.
   *
   * The crypto finishes in milliseconds, so without this the whole operation is
   * over before a single frame paints. `app` solves this with the same component;
   * chat uses it too so the two surfaces read as the same product.
   */
  const [stage, setStage] = useState<{ mode: 'encrypt' | 'decrypt'; done: number } | null>(null);

  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextId = () => ++idRef.current;

  const push = useCallback((t: TurnInput) => {
    const id = nextId();
    setTurns((prev) => [...prev, { ...t, id } as Turn]);
    return id;
  }, []);

  const say = useCallback((text: string) => push({ role: 'agent', text }), [push]);
  const show = useCallback((node: React.ReactNode) => push({ role: 'agent', node }), [push]);

  const addHistory = useCallback((e: Omit<HistoryEntry, 'id' | 'at'>) => {
    setHistory((prev) => [{ ...e, id: ++idRef.current, at: new Date() }, ...prev].slice(0, 40));
  }, []);

  /** Open the conversation with the greeting, once. */
  useEffect(() => {
    if (turns.length === 0) {
      say(greeting(false));
      show(
        <IdentityOffers
          onWallet={connectWallet}
          onCreateKeyfile={() => openDialog('create')}
          onLoadKeyfile={() => openDialog('open')}
        />,
      );
    }
    // Intentionally runs once: the opening turn must not re-append on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  function openDialog(which: Dialog) {
    setKeyfileError(null);
    setKdfProgress(null);
    setDialog(which);
  }

  /* ───────────────────────── file reading ───────────────────────── */

  /**
   * Read a file and tell the user what it is.
   *
   * This is the turn that makes the agent useful: instead of waiting to be told
   * which verb to apply, it parses the header, hashes the bytes, and states both
   * the identity of the file and the single action it admits.
   */
  const readFile = useCallback(
    async (f: File) => {
      const buf = await f.arrayBuffer();
      const ref: FileRef = { name: f.name, bytes: new Uint8Array(buf), size: buf.byteLength };
      setAttached(ref);
      setBusy(true);
      setBusyLabel('Reading the file…');
      try {
        const rep = await inspectFile(ref);
        setReport(rep);
        say(`Read ${rep.name}.`);
        show(
          <FileReportCard
            report={rep}
            busy={busy}
            onRun={(a) => void runAction(a === 'encrypt' ? { kind: 'seal', file: ref } : { kind: 'open', file: ref })}
          />,
        );
        for (const line of describeReport(rep)) say(line);
        if (rep.action === 'decrypt') {
          say('This is an envelope. The Decrypt button above is the only thing that applies to it.');
        } else if (rep.action === 'encrypt') {
          say('Nothing sealed about it yet. The Encrypt button above will produce a .arshield container and a seal.');
        } else if (rep.kind === 'keyfile') {
          say('I will not seal or open a key file — it is the thing that does the opening. Keep it somewhere safe.');
        } else if (rep.kind === 'seal-png') {
          say('A seal is a receipt, not an envelope. Its hash is what /verify compares against.');
        }
      } catch (e) {
        say(`Could not read that file: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy(false);
        setBusyLabel('Working…');
      }
    },
    // runAction is declared below; the reference is stable per render and this
    // callback is only invoked from an event handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [say, show, busy],
  );

  /* ───────────────────────── identity: wallet ───────────────────────── */

  const connectWallet = useCallback(async () => {
    setWalletError(null);
    const provider = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!provider) {
      say('No wallet found in this browser. The key-file path needs nothing installed — take that one instead.');
      return;
    }
    setBusy(true);
    setBusyLabel('Connecting…');
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts?.[0];
      if (!address) {
        say('The wallet returned no account.');
        return;
      }

      // Check capability *before* asking for a signature. Asking first and
      // failing after is the experience this whole file exists to avoid.
      setBusyLabel('Checking this address on ARC…');
      const det = await detectWalletKind(address);
      setDetection(det);

      if (isUnsupported(det)) {
        say(
          `${det.walletName ?? 'This wallet'} uses smart-contract accounts (${det.reason}). A signature from it cannot derive keys, so the wallet path is closed here — but nothing is lost: a key file does the same job with no wallet involved.`,
        );
        show(
          <IdentityOffers
            onWallet={connectWallet}
            onCreateKeyfile={() => openDialog('create')}
            onLoadKeyfile={() => openDialog('open')}
            recommended="keyfile"
          />,
        );
        return;
      }

      say(`${det.kind === 'eoa' ? 'Standard signing key' : 'Could not check the address type'} — ${det.reason} Ask your wallet to sign, and the keys are derived from it.`);
      setBusyLabel('Waiting for the signature…');
      const { ARSHIELD_DERIVATION_MESSAGE, identityFromWalletSignature } = await import('@/lib/arshield');
      const signatureHex = (await provider.request({
        method: 'personal_sign',
        params: [ARSHIELD_DERIVATION_MESSAGE, address],
      })) as string;
      const kp: ArShieldKeyPair = identityFromWalletSignature(signatureHex);
      setIdentity({ kind: 'wallet', label: `wallet · ${address}`, kp });
      say('Keys derived from that signature. Same wallet, same keys, on any device. Drop a file whenever you are ready.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/reject|denied|User rejected/i.test(msg)) {
        say('Signature request cancelled — that is fine, nothing was derived. Try again whenever, or use a key file.');
      } else if (/65-byte EOA|smart-contract/i.test(msg)) {
        setWalletError(msg);
        say('The wallet signed in a format that cannot be used for key derivation. A key file will work here.');
        show(
          <IdentityOffers
            onWallet={connectWallet}
            onCreateKeyfile={() => openDialog('create')}
            onLoadKeyfile={() => openDialog('open')}
            recommended="keyfile"
          />,
        );
      } else {
        setWalletError(msg);
        say(`Could not connect: ${msg}`);
      }
    } finally {
      setBusy(false);
      setBusyLabel('Working…');
    }
  }, [say, show]);

  /* ───────────────────────── identity: key file ───────────────────────── */

  const createKeyfile = useCallback(
    async (passphrase: string) => {
      setKeyfileError(null);
      setKdfProgress(0.05);
      try {
        setKdfProgress(0.3);
        const kp = ephemeralIdentity();
        const wrapper = await wrapKeyfile(kp, passphrase, ARGON2ID_PARAMS_PROD);
        setKdfProgress(1);
        download(new TextEncoder().encode(JSON.stringify(wrapper, null, 2)), 'arshield-key.json', 'application/json');
        setIdentity({ kind: 'keyfile', label: 'keyfile (generated)', kp });
        setDialog(null);
        say('Key file generated and downloaded. This file is the only copy of your keys — lose it and sealed data cannot be recovered, by anyone, including us. Store it somewhere you would store a passport.');
      } catch (e) {
        setKeyfileError(e instanceof Error ? e.message : String(e));
      } finally {
        setKdfProgress(null);
      }
    },
    [say],
  );

  const loadKeyfile = useCallback(
    async (json: string, passphrase: string) => {
      setKeyfileError(null);
      setKdfProgress(0.05);
      try {
        setKdfProgress(0.4);
        const parsed = JSON.parse(json) as Parameters<typeof unwrapKeyfile>[0];
        const kp = await unwrapKeyfile(parsed, passphrase);
        setKdfProgress(1);
        setIdentity({ kind: 'keyfile', label: 'keyfile (loaded)', kp });
        setDialog(null);
        say('Key file unlocked. You can seal and open with it.');
      } catch (e) {
        setKeyfileError(e instanceof Error ? e.message : String(e));
      } finally {
        setKdfProgress(null);
      }
    },
    [say],
  );

  /* ───────────────────────── result rendering ───────────────────────── */

  const renderResult = useCallback(
    (res: AgentResult, sourceLabel: string) => {
      if (!res.ok) {
        if (res.kind === 'wallet-unsupported') {
          show(
            <Failure
              message="Keys could not be derived from this wallet's signature."
              detail="Its signatures are EIP-1271, which cannot be used as key material. A key file uses random keys instead and works the same way."
              offer="Create a key file instead"
              onOffer={() => openDialog('create')}
            />,
          );
          return;
        }
        addHistory({ kind: 'failed', name: 'operation', bytes: 0, note: res.message });
        show(<Failure message={res.message} />);
        return;
      }

      if (res.kind === 'sealed') {
        setLastResult({ kind: 'sealed', name: res.name, bytes: res.bytes, seal: res.seal, hash: res.hash });
        addHistory({ kind: 'sealed', name: res.name, bytes: res.bytes.length, hash: res.hash });
        show(
          <ResultCard
            title={`Sealed · ${res.name}`}
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => download(res.bytes, res.name)}>
                  Envelope
                </Button>
                <Button size="sm" variant="ghost" onClick={() => download(res.seal, `${res.name}.seal.png`, 'image/png')}>
                  Seal PNG
                </Button>
                <CopyRow value={res.hash} label="Copy hash" />
              </>
            }
          >
            <Fact label="algorithm" value="ML-KEM-768 + X25519 / ML-DSA-65" />
            <Fact label="sha256" value={shortHash(res.hash)} mono />
            <Fact label="signed by" value={sourceLabel} mono tone="idle" />
            <Fact label="stored" value="nowhere — downloads only, from this tab" tone="verified" />
          </ResultCard>,
        );
        return;
      }

      if (res.kind === 'opened') {
        setLastResult({ kind: 'opened', name: res.name, bytes: res.bytes });
        addHistory({ kind: 'opened', name: res.name, bytes: res.bytes.length });
        show(
          <ResultCard
            title={`Opened · ${res.name}`}
            actions={
              <Button size="sm" variant="ghost" onClick={() => download(res.bytes, res.name)}>
                Save file
              </Button>
            }
          >
            <Fact label="signature" value="ML-DSA-65 verified before decrypt" tone="verified" />
            <Fact label="size" value={`${res.bytes.length.toLocaleString()} bytes`} />
          </ResultCard>,
        );
        return;
      }

      setLastResult({ kind: 'message', url: res.url });
      addHistory({ kind: 'message', name: 'secret message', bytes: res.chars });
      show(
        <ResultCard title="Secret message ready" tone="progress">
          <Fact label="characters" value={String(res.chars)} />
          <Fact label="carried in" value="the link itself — nothing is stored server-side" />
          <p className="break-all rounded-lg bg-black/30 p-2 font-mono text-[11.5px] text-[#b9c1cf]">{res.url}</p>
          <div className="flex gap-2">
            <CopyRow value={res.url} label="Copy link" />
          </div>
        </ResultCard>,
      );
    },
    [show, addHistory],
  );

  /* ───────────────────────── the run itself ───────────────────────── */

  /** Execute a confirmed action. Only ever called from a confirm gate. */
  const execute = useCallback(
    async (action: Pending) => {
      if (!identity) return;
      setPending(null);

      // Guards run before the stage list, so a refusal is immediate rather than
      // five animated rows followed by "actually, no".
      if (action.kind === 'seal') {
        if (!canEncrypt(tier)) {
          say(`Daily limit reached on ${tier.name} (${tier.encryptionsPerDay}/24h). Resets at 00:00 UTC — or hold more $arshield for a higher tier.`);
          return;
        }
        if (action.file.size > tier.maxFileBytes) {
          say(`That file is too large for ${tier.name}. The cap is ${Math.round(tier.maxFileBytes / (1024 * 1024))} MB.`);
          return;
        }
      }

      const mode = action.kind === 'seal' ? 'encrypt' : 'decrypt';
      setBusy(true);
      setBusyLabel(action.kind === 'seal' ? 'Sealing…' : 'Opening…');
      setStage({ mode, done: 0 });

      try {
        // Start the real work, and play the stage list at a readable pace in
        // parallel. Both are awaited: the rows must finish, and the crypto must
        // finish, before the result appears. Whichever is slower sets the wait —
        // a fast seal still gets the full walk, a slow one is never rushed.
        const work: Promise<AgentResult> =
          action.kind === 'seal' ? sealFile(action.file, identity) : openFile(action.file, identity);

        const [, res] = await Promise.all([
          playSteps((n) => setStage({ mode, done: n }), 5, 0),
          work,
        ]);

        if (res.ok && res.kind === 'sealed') incrementEncryptionsUsed();
        renderResult(res, identity.label.includes('· ') ? identity.label.split('· ')[1] : identity.label);
      } catch (e) {
        show(<Failure message={e instanceof Error ? e.message : String(e)} />);
      } finally {
        setStage(null);
        setBusy(false);
        setBusyLabel('Working…');
      }
    },
    [identity, tier, say, show, renderResult],
  );

  /**
   * Route an action to the confirmation gate.
   *
   * Both the chat buttons and the panel buttons land here, so there is exactly
   * one path to a run and one place where confirmation is required.
   */
  const runAction = useCallback(
    (action: Pending) => {
      if (!identity) {
        say('Set up a key first — pick wallet or key file above, then this will run.');
        return;
      }
      setPending(action);
    },
    [identity, say],
  );

  /* ───────────────────────── turn handling ───────────────────────── */

  const handleSubmit = useCallback(async () => {
    const raw = input.trim();
    if (!raw && !attached) return;
    if (busy) return;

    setInput('');
    if (raw) push({ role: 'user', text: raw });

    if (!identity && !/^(help|status|connect|wallet|keyfile|generate|load)$/i.test(raw)) {
      // Still allow a file to be read without a key: reading needs no key, and
      // refusing early hides the most useful turn the agent has.
      if (!attached) {
        say('Almost — I need keys before I can seal or open. Pick wallet or key file, or just drop a file and I will read it first.');
        return;
      }
    }

    const intent = route(raw || 'inspect this file', attached);

    switch (intent.kind) {
      case 'inspect':
        if (!intent.fileRef) {
          say('Nothing attached yet. Drop a file in the panel on the right, or use the paperclip — then I will tell you exactly what it is.');
          break;
        }
        await readFile(new File([intent.fileRef.bytes as unknown as BlobPart], intent.fileRef.name));
        break;

      case 'help':
        say(
          'Drop a file and I read it first: type, size, hash, and what is inside. Then I offer the one action that applies — an envelope can be opened, a plain file can be sealed. For a message, put the text in quotes. Ask for status anytime. Everything runs in this tab; nothing is uploaded.',
        );
        break;

      case 'status':
        show(
          <ResultCard title="Status" tone="progress">
            <Fact label="identity" value={identity ? identity.label : 'none yet'} mono />
            <Fact label="tier" value={tier.name} />
            <Fact label="encryptions left today" value={String(encryptionsLeft(tier))} tone="verified" />
            <Fact
              label="max file size"
              value={Number.isFinite(tier.maxFileBytes) ? `${Math.round(tier.maxFileBytes / (1024 * 1024))} MB` : 'unlimited'}
            />
            <Fact label="file in play" value={report ? report.name : 'none'} mono />
            {detection && (
              <Fact label="wallet check" value={detection.kind.toUpperCase()} tone={detection.kind === 'smart' ? 'danger' : 'verified'} />
            )}
          </ResultCard>,
        );
        break;

      case 'history':
        if (history.length === 0) {
          say('Nothing done yet in this session.');
        } else {
          say(`${history.length} operation${history.length === 1 ? '' : 's'} so far — the full list with sizes and timestamps is in the History section on the right.`);
        }
        break;

      case 'download':
        if (!lastResult) {
          say('Nothing to download yet — seal or open something first.');
          break;
        }
        if (intent.target === 'seal' && lastResult.kind === 'sealed') {
          download(lastResult.seal, `${lastResult.name}.seal.png`, 'image/png');
        } else if (intent.target === 'envelope' && lastResult.kind === 'sealed') {
          download(lastResult.bytes, lastResult.name);
        } else if (lastResult.kind !== 'message') {
          download(lastResult.bytes, lastResult.name);
        }
        break;

      case 'seal':
        if (!intent.fileRef) {
          say('Attach the file you want sealed first — the paperclip, or drop it in the panel on the right.');
          break;
        }
        runAction({ kind: 'seal', file: intent.fileRef });
        break;

      case 'open':
        if (!intent.fileRef) {
          say('Attach the .arshield file you want opened, then say open it.');
          break;
        }
        if (report && report.kind !== 'container') {
          // Reading already established this is not an envelope. Say so rather
          // than let the decrypt fail on a file that could never have worked.
          say(`${intent.fileRef.name} is not an envelope (${report.kind === 'plain' ? 'it is a plain file' : 'it is a ' + report.kind}). There is nothing to open — it can be sealed instead.`);
          break;
        }
        runAction({ kind: 'open', file: intent.fileRef });
        break;

      case 'message': {
        if (!identity) {
          say('Need a key before I can build a message.');
          break;
        }
        if (!intent.text) {
          say('Put the text you want sealed in quotes — seal this message "meet at eight".');
          break;
        }
        setBusy(true);
        setBusyLabel('Sealing the message…');
        try {
          const res = await sealMessage(intent.text, identity);
          renderResult(res, identity.label);
        } finally {
          setBusy(false);
          setBusyLabel('Working…');
        }
        break;
      }

      case 'identity':
        if (intent.action === 'keyfile-create') openDialog('create');
        else if (intent.action === 'keyfile-load') openDialog('open');
        else void connectWallet();
        break;

      case 'clear':
        setTurns([]);
        setAttached(null);
        setReport(null);
        setPending(null);
        say(greeting(!!identity));
        break;

      default:
        if (attached && !report) {
          await readFile(new File([attached.bytes as unknown as BlobPart], attached.name));
        } else if (report?.action) {
          say(
            `I did not catch a command. ${report.name} can be ${report.action === 'encrypt' ? 'sealed' : 'opened'} — press the button, or say "${report.action === 'encrypt' ? 'encrypt it' : 'decrypt it'}".`,
          );
        } else {
          say('I did not follow that. Try "read this file", "encrypt it", "decrypt it", or ask for help.');
        }
    }
  }, [
    input, attached, busy, identity, tier, detection, report, history, lastResult,
    push, say, show, renderResult, connectWallet, readFile, runAction,
  ]);

  /* ───────────────────────── panel wiring ───────────────────────── */

  const onPanelFile = useCallback((f: File) => void readFile(f), [readFile]);

  const onPanelDownload = useCallback(
    (target: 'envelope' | 'seal' | 'file') => {
      if (!lastResult || lastResult.kind === 'message') return;
      if (target === 'seal' && lastResult.kind === 'sealed') {
        download(lastResult.seal, `${lastResult.name}.seal.png`, 'image/png');
      } else {
        download(lastResult.bytes, lastResult.name);
      }
    },
    [lastResult],
  );

  const onClearFile = useCallback(() => {
    setAttached(null);
    setReport(null);
    say('File cleared. Drop another whenever.');
  }, [say]);

  function resetIdentity() {
    setIdentity(null);
    setDetection(null);
    setAttached(null);
    setReport(null);
    setPending(null);
    say('Key source cleared. Pick how to hold your keys again.');
    show(
      <IdentityOffers
        onWallet={connectWallet}
        onCreateKeyfile={() => openDialog('create')}
        onLoadKeyfile={() => openDialog('open')}
      />,
    );
  }

  /* ───────────────────────── view ───────────────────────── */

  return (
    <>
      <Background />
      <div className="relative flex h-svh flex-col">
        <header className="border-b border-white/[0.06] bg-[#020610]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="ArShield home">
                <Logo />
              </Link>
              <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-[#8a93a3] sm:inline-flex">
                <ShieldCheck className="h-3 w-3 text-[var(--color-verified)]" />
                agent
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="text-[12px] text-[#8a93a3] underline-offset-2 hover:text-[#e6e9ef] hover:underline"
              >
                workspace
              </Link>
              <Link
                href="/mcp"
                className="hidden text-[12px] text-[#8a93a3] underline-offset-2 hover:text-[#e6e9ef] hover:underline sm:inline"
              >
                mcp
              </Link>
              <Link
                href="/verify"
                className="hidden text-[12px] text-[#8a93a3] underline-offset-2 hover:text-[#e6e9ef] hover:underline sm:inline"
              >
                verify
              </Link>
              {history.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTurns([]);
                    setAttached(null);
                    setReport(null);
                    setPending(null);
                    say(greeting(!!identity));
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              )}
            </div>
          </div>
        </header>

        {/*
          Two columns on large screens, one on small.

          The panel is the reason the page can be this wide: a conversation alone
          at 1600px is unreadable, but a conversation next to the artifact it is
          talking about is exactly right. Below lg the panel moves under the
          conversation rather than disappearing — dropping a file is a core
          action, not a large-screen convenience.
        */}
        <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 overflow-hidden px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 xl:grid-cols-[minmax(0,1fr)_480px]">
          {/* ── Column 1: the conversation ── */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#04070f]/40 backdrop-blur-xl">
            {identity && (
              <div className="px-4 pt-3">
                <StatusStrip
                  identity={{
                    kind: identity.kind,
                    label: identity.label,
                    address: identity.kind === 'wallet' ? identity.label.split('· ')[1] : undefined,
                  }}
                  tierName={tier.name}
                  quota={`${encryptionsLeft(tier)} seals left today`}
                  chainNote={detection?.kind === 'eoa' ? 'EOA verified' : undefined}
                  onReset={resetIdentity}
                />
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {turns.map((t) => (
                <Bubble key={t.id} role={t.role}>
                  {'text' in t ? t.text : t.node}
                </Bubble>
              ))}

              {attached && (
                <div className="flex justify-end">
                  <FileChip
                    name={attached.name}
                    size={attached.size}
                    busy={busy}
                    onRemove={onClearFile}
                  />
                </div>
              )}

              {stage && (
                <Bubble role="agent" wide>
                  <SealingStepper mode={stage.mode} done={stage.done} running={stage.done < 5} />
                </Bubble>
              )}

              {busy && !stage && <Working label={busyLabel} />}

              {pending && (
                <Bubble role="agent">
                  <ConfirmGate
                    question={pending.kind === 'seal' ? `Seal ${pending.file.name}?` : `Open ${pending.file.name}?`}
                    detail={
                      pending.kind === 'seal'
                        ? 'Sealing uses one of today’s encryptions and produces a .arshield container plus a seal PNG. The original file is untouched.'
                        : 'Opening verifies the ML-DSA-65 signature first, then decrypts. A wrong key reveals nothing and uses no quota.'
                    }
                    confirmLabel={pending.kind === 'seal' ? 'Seal it' : 'Open it'}
                    busy={busy}
                    onConfirm={() => void execute(pending)}
                    onCancel={() => {
                      setPending(null);
                      say('Cancelled — nothing was done.');
                    }}
                  />
                </Bubble>
              )}
            </div>

            <div className="px-4 pb-4 pt-1">
              <Composer
                value={input}
                onChange={setInput}
                onSubmit={() => void handleSubmit()}
                onAttach={(f) => void readFile(f)}
                onDropFile={(f) => void readFile(f)}
                disabled={false}
                busy={busy}
                attached={attached}
              />
              <p className="px-1 pt-2 text-[11.5px] text-[#5c6675]">
                Runs entirely in your browser. No file, message, or key is sent anywhere.
                {walletError && <span className="text-[var(--color-danger)]"> · wallet note recorded</span>}
              </p>
            </div>
          </div>

          {/* ── Column 2: the workspace ── */}
          <div className="min-h-0 max-lg:h-[560px]">
            <WorkspacePanel
              identity={identity}
              report={report}
              busy={busy}
              stage={stage}
              history={history}
              lastResult={lastResult}
              onFile={onPanelFile}
              onClearFile={onClearFile}
              onRun={(a) => (attached ? runAction(a === 'encrypt' ? { kind: 'seal', file: attached } : { kind: 'open', file: attached }) : say('Drop a file into the panel first.'))}
              onDownload={onPanelDownload}
              tierName={tier.name}
              quota={`${encryptionsLeft(tier)} seals left`}
            />
          </div>
        </div>
      </div>

      <KeyfileDialog
        key={dialog ?? 'closed'}
        mode={dialog === 'create' ? 'create' : 'open'}
        open={dialog !== null}
        onClose={() => {
          setDialog(null);
          setKeyfileError(null);
        }}
        onCreate={createKeyfile}
        onOpen={loadKeyfile}
        busy={kdfProgress !== null}
        error={keyfileError}
        progress={kdfProgress}
      />
    </>
  );
}
