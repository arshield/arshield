'use client';

/**
 * The chat agent.
 *
 * One text box in front of the same crypto the /app workspace exposes. The
 * difference is that a conversation can ask a question, and the workspace
 * cannot: when a wallet turns out to be unsupported, this surface offers the
 * path that works instead of printing a reason the user has no answer to.
 *
 * Every action still goes through the same confirmation gate, and the rule about
 * key material is unchanged — nothing here is uploaded, and no server reads the
 * instructions. See lib/agent/router.ts for why the routing is local.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
import { Button } from '@/components/button';
import { KeyfileDialog } from '@/components/keyfile-dialog';
import { download } from '@/lib/agent/message';
import { greeting, route, type FileRef } from '@/lib/agent/router';
import { openFile, sealFile, sealMessage, type AgentResult, type Identity } from '@/lib/agent/actions';
import { detectWalletKind, isUnsupported, type Detection } from '@/lib/agent/detect';
import { ARGON2ID_PARAMS_PROD } from '@/lib/arshield/constants';
import { ephemeralIdentity, unwrapKeyfile, wrapKeyfile, type ArShieldKeyPair } from '@/lib/arshield';
import { canEncrypt, encryptionsLeft, incrementEncryptionsUsed, TIER_BY_KEY, type Tier } from '@/lib/tiers';
import {
  Bubble,
  Composer,
  ConfirmGate,
  Fact,
  FileChip,
  Failure,
  IdentityOffers,
  ResultCard,
  CopyRow,
  StatusStrip,
  Working,
  shortHash,
} from '@/components/chat/chat-parts';

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
  /**
   * Tier is read-only here for now.
   *
   * The workspace writes it from a live $arshield balance; chat has no balance
   * read yet, so it runs on Free and the status card reports the real quota
   * rather than a level it cannot substantiate. The setter stays so the token
   * gate can be wired in without reshaping this component.
   */
  const [tier] = useState<Tier>(TIER_BY_KEY.free);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [kdfProgress, setKdfProgress] = useState<number | null>(null);
  const [keyfileError, setKeyfileError] = useState<string | null>(null);

  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextId = () => ++idRef.current;

  /**
   * Append a turn and return its id.
   *
   * Typed as the union without `id` rather than via Omit: Omit over a union
   * collapses it to the shared keys, which erases both `text` and `node` and
   * makes every call site an excess-property error.
   */
  const push = useCallback((t: TurnInput) => {
    const id = nextId();
    setTurns((prev) => [...prev, { ...t, id } as Turn]);
    return id;
  }, []);

  const say = useCallback((text: string) => push({ role: 'agent', text }), [push]);
  const show = useCallback((node: React.ReactNode) => push({ role: 'agent', node }), [push]);

  /** Open the conversation with the greeting, once. */
  useEffect(() => {
    if (turns.length === 0) {
      say(greeting(false));
      show(<IdentityOffers onWallet={connectWallet} onCreateKeyfile={() => openDialog('create')} onLoadKeyfile={() => openDialog('load' as Dialog)} />);
    }
    // Intentionally runs once: the opening turn must not re-append on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Keep the newest turn in view. */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  function openDialog(which: Dialog) {
    setKeyfileError(null);
    setKdfProgress(null);
    setDialog(which);
  }

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
            onLoadKeyfile={() => openDialog('load' as Dialog)}
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
      const id: Identity = {
        kind: 'wallet',
        label: `wallet · ${address}`,
        kp,
      };
      setIdentity(id);
      say('Keys derived from that signature. Same wallet, same keys, on any device. Drop a file, or ask for a message.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // A rejected signature is a decision, not an error. Say so, and leave the
      // door open rather than treating it as a failure to recover from.
      if (/reject|denied|User rejected/i.test(msg)) {
        say('Signature request cancelled — that is fine, nothing was derived. Try again whenever, or use a key file.');
      } else if (/65-byte EOA|smart-contract/i.test(msg)) {
        setWalletError(msg);
        say('The wallet signed in a format that cannot be used for key derivation. A key file will work here.');
        show(
          <IdentityOffers
            onWallet={connectWallet}
            onCreateKeyfile={() => openDialog('create')}
            onLoadKeyfile={() => openDialog('load' as Dialog)}
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
        // Argon2id at production params takes seconds; the dialog shows a bar so
        // the wait does not read as a hang.
        setKdfProgress(0.3);
        const kp = ephemeralIdentity();
        const wrapper = await wrapKeyfile(kp, passphrase, ARGON2ID_PARAMS_PROD);
        setKdfProgress(1);
        const bytes = new TextEncoder().encode(JSON.stringify(wrapper, null, 2));
        download(bytes, 'arshield-key.json', 'application/json');

        const id: Identity = { kind: 'keyfile', label: 'keyfile (generated)', kp };
        setIdentity(id);
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
        const id: Identity = { kind: 'keyfile', label: 'keyfile (loaded)', kp };
        setIdentity(id);
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
          // The guard fired, which means detection was wrong or did not run.
          // Offer the recovery rather than restate the failure.
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
        show(<Failure message={res.message} />);
        return;
      }

      if (res.kind === 'sealed') {
        show(
          <ResultCard
            title={`Sealed · ${res.name}`}
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => download(res.bytes, res.name)}>
                  Envelope
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => download(res.seal, `${res.name}.seal.png`, 'image/png')}
                >
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

      // Message link.
      show(
        <ResultCard title="Secret message ready" tone="progress">
          <Fact label="characters" value={String(res.chars)} />
          <Fact label="carried in" value="the link itself — nothing is stored server-side" />
          <p className="break-all rounded-lg bg-black/30 p-2 font-mono text-[11.5px] text-[#b9c1cf]">
            {res.url}
          </p>
          <div className="flex gap-2">
            <CopyRow value={res.url} label="Copy link" />
          </div>
        </ResultCard>,
      );
    },
    [show],
  );

  /* ───────────────────────── the run itself ───────────────────────── */

  /** Execute a confirmed action. Only ever called from a confirm gate. */
  const execute = useCallback(
    async (action: Pending) => {
      if (!identity) return;
      setPending(null);
      setBusy(true);
      setBusyLabel(action.kind === 'seal' ? 'Sealing…' : 'Opening…');
      try {
        if (action.kind === 'seal') {
          if (!canEncrypt(tier)) {
            say(`Daily limit reached on ${tier.name} (${tier.encryptionsPerDay}/24h). Resets at 00:00 UTC — or hold more $arshield for a higher tier.`);
            return;
          }
          if (action.file.size > tier.maxFileBytes) {
            say(`That file is too large for ${tier.name}. The cap is ${Math.round(tier.maxFileBytes / (1024 * 1024))} MB.`);
            return;
          }
          const res = await sealFile(action.file, identity);
          if (res.ok && res.kind === 'sealed') incrementEncryptionsUsed();
          renderResult(res, identity.label.includes('· ') ? identity.label.split('· ')[1] : identity.label);
        } else {
          const res = await openFile(action.file, identity);
          renderResult(res, identity.label);
        }
      } catch (e) {
        show(<Failure message={e instanceof Error ? e.message : String(e)} />);
      } finally {
        setBusy(false);
        setBusyLabel('Working…');
        setAttached(null);
      }
    },
    [identity, tier, say, show, renderResult],
  );

  /** Route one turn and act on it, or ask before acting. */
  const handleSubmit = useCallback(async () => {
    const raw = input.trim();
    if (!raw && !attached) return;
    if (busy || !identity) return;

    setInput('');
    if (raw) push({ role: 'user', text: raw });

    const intent = route(raw || (attached ? 'seal this' : ''), attached);

    switch (intent.kind) {
      case 'help':
        say(
          'Drop a file and say seal or open it. For a message, put the text in quotes — seal this message "meet at eight". Ask for status anytime to see your tier and remaining quota. Everything runs in this tab; nothing is uploaded.',
        );
        break;

      case 'status':
        show(
          <ResultCard title="Status" tone="progress">
            <Fact label="identity" value={identity.label} mono />
            <Fact label="tier" value={tier.name} />
            <Fact
              label="encryptions left today"
              value={String(encryptionsLeft(tier))}
              tone="verified"
            />
            <Fact
              label="max file size"
              value={Number.isFinite(tier.maxFileBytes) ? `${Math.round(tier.maxFileBytes / (1024 * 1024))} MB` : 'unlimited'}
            />
            {detection && <Fact label="wallet check" value={detection.kind.toUpperCase()} tone={detection.kind === 'smart' ? 'danger' : 'verified'} />}
          </ResultCard>,
        );
        break;

      case 'seal':
        if (!intent.fileRef) {
          say('Attach the file you want sealed first — the paperclip, or drop it on this box — then say seal it.');
          break;
        }
        setPending({ kind: 'seal', file: intent.fileRef });
        break;

      case 'open':
        if (!intent.fileRef) {
          say('Attach the .arshield file you want opened, then say open it.');
          break;
        }
        setPending({ kind: 'open', file: intent.fileRef });
        break;

      case 'message': {
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
        else if (intent.action === 'keyfile-load') openDialog('load' as Dialog);
        else void connectWallet();
        break;

      default:
        if (attached) {
          // A file is waiting; the most useful reading of an unclear turn is
          // "do something with this". Ask which, rather than guessing.
          say('I have your file. Do you want it sealed, or opened?');
        } else {
          say('I did not follow that. Try "seal this file", "open this file", "seal this message \\"…\\"", or ask for help.');
        }
    }
  }, [input, attached, busy, identity, tier, detection, push, say, show, renderResult, connectWallet]);

  /* ───────────────────────── attach handling ───────────────────────── */

  const attachFile = useCallback(
    (f: File) => {
      void f.arrayBuffer().then((b) => {
        const bytes = new Uint8Array(b);
        setAttached({ name: f.name, bytes, size: bytes.length });
        // An .arshield container is unambiguous — say what it is and offer the
        // matching action, so the user does not have to remember the rule.
        if (f.name.endsWith('.arshield')) {
          say(`${f.name} is an envelope. Say open it when you are ready.`);
        } else {
          say(`${f.name} attached. Say seal it when you are ready.`);
        }
      });
    },
    [say],
  );

  function resetIdentity() {
    setIdentity(null);
    setDetection(null);
    setAttached(null);
    setPending(null);
    say('Key source cleared. Pick how to hold your keys again.');
    show(
      <IdentityOffers
        onWallet={connectWallet}
        onCreateKeyfile={() => openDialog('create')}
        onLoadKeyfile={() => openDialog('load' as Dialog)}
      />,
    );
  }

  /* ───────────────────────── view ───────────────────────── */

  return (
    <>
      <Background />
      <div className="relative flex h-svh flex-col">
        <header className="border-b border-white/[0.06] bg-[#020610]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="ArShield home">
                <Logo />
              </Link>
              <span className="hidden text-[12px] text-[var(--color-idle)] sm:inline">
                agent · seals files, opens envelopes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/app"
                className="hidden text-[12px] text-[var(--color-idle)] underline-offset-2 hover:text-[#e6e9ef] hover:underline sm:inline"
              >
                workspace
              </Link>
              {identity && (
                <Link
                  href="/mcp"
                  className="hidden text-[12px] text-[var(--color-idle)] underline-offset-2 hover:text-[#e6e9ef] hover:underline sm:inline"
                >
                  mcp
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 sm:px-6">
          {identity && (
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
          )}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-4">
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
                  onRemove={() => setAttached(null)}
                />
              </div>
            )}

            {busy && <Working label={busyLabel} />}

            {pending && (
              <Bubble role="agent">
                <ConfirmGate
                  question={
                    pending.kind === 'seal'
                      ? `Seal ${pending.file.name}?`
                      : `Open ${pending.file.name}?`
                  }
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

          <div className="pb-5 pt-1">
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => void handleSubmit()}
              onAttach={attachFile}
              onDropFile={attachFile}
              disabled={!identity}
              busy={busy}
              attached={attached}
            />
            <p className="px-1 pt-2 text-[11.5px] text-[var(--color-idle)]">
              Runs entirely in your browser. No file, message, or key is sent anywhere.
              {walletError && <span className="text-[var(--color-danger)]"> · wallet note recorded</span>}
            </p>
          </div>
        </div>
      </div>

      {/* The dialog is remounted per open (via key) so its internal state resets
          without a reset effect — the same pattern the workspace uses. */}
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

      {/* Menu placeholder keeps the header height stable on narrow screens,
          where the two text links are hidden. */}
      <span className="hidden" aria-hidden>
        <Menu className="h-4 w-4" />
      </span>
    </>
  );
}
