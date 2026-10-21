'use client';

/**
 * A chat with a file-handling agent. One column, no side panel.
 *
 * The whole surface is the conversation. Anything the agent learns or produces
 * appears in it as a turn: the identity card when a key is set up, the report
 * when a file is read, the result card when an operation finishes. There is no
 * second place to look, which is what makes this read as talking to something
 * rather than operating a form next to a chat log.
 *
 * Two rules about order that the whole interaction depends on:
 *
 *   attaching is not doing
 *     A dropped file lands in the composer as a chip and nothing else happens.
 *     Reading it, hashing it and offering an action all wait for Send — the user
 *     gets to attach, change their mind, attach a different file, and write the
 *     instruction in one go, the way an attachment works in any chat.
 *
 *   reading is not acting
 *     Send makes the agent read the file and describe it. It does not seal or
 *     open it. The operation waits for a button press, because sealing uses a
 *     quota and opening is irreversible in the sense that a wrong key wastes the
 *     attempt.
 *
 * Routing and wording are local and deterministic. See lib/agent/router.ts and
 * lib/agent/converse.ts for why there is no model in the loop.
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
import { converse, confusedReply, replyText, type Reply } from '@/lib/agent/converse';
import { think, thinkLabel } from '@/lib/agent/think';
import { openFile, sealFile, sealMessage, type AgentResult, type Identity } from '@/lib/agent/actions';
import { detectWalletKind, isUnsupported, type Detection } from '@/lib/agent/detect';
import { describeReport, inspectFile, type FileReport } from '@/lib/agent/inspect';
import { playSteps } from '@/lib/play-steps';
import { SealingStepper } from '@/components/sealing-stepper';
import { ARGON2ID_PARAMS_PROD } from '@/lib/arshield/constants';
import { ephemeralIdentity, unwrapKeyfile, wrapKeyfile, type ArShieldKeyPair } from '@/lib/arshield';
import {
  canEncrypt,
  encryptionsLeft,
  fetchTierState,
  incrementEncryptionsUsed,
  TIER_BY_KEY,
  type Tier,
} from '@/lib/tiers';
import {
  Bubble,
  Composer,
  Fact,
  FileReportCard,
  Failure,
  IdentityOffers,
  IdentitySettled,
  ResultCard,
  CopyRow,
  Thinking,
  Working,
  shortHash,
} from '@/components/chat/chat-parts';

/* ────────────────────────────── turn model ────────────────────────────── */

type Turn =
  | { id: number; role: 'user'; text: string; file?: string }
  | { id: number; role: 'agent'; text: string }
  | { id: number; role: 'agent'; node: React.ReactNode; isPicker?: boolean };

/**
 * A turn before it has an id.
 *
 * Written out rather than as Omit<Turn, 'id'>: Omit over a union keeps only the
 * common keys, which drops `text` and `node` and turns every push into an
 * excess-property error.
 */
type TurnInput =
  | { role: 'user'; text: string; file?: string }
  | { role: 'agent'; text: string }
  | { role: 'agent'; node: React.ReactNode; isPicker?: boolean };

type Dialog = 'create' | 'open' | null;

export function ChatClient() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Working…');

  /**
   * The agent is composing a conversational reply.
   *
   * Separate from `busy` because they mean different things: `busy` is a file
   * operation in flight and shows the stage list, while this is the agent
   * finding words and shows typing dots.
   */
  const [composing, setComposing] = useState(false);
  const [thinkLabelText, setThinkLabelText] = useState('Thinking…');

  /**
   * The file sitting in the composer, attached but not yet submitted.
   *
   * Separate from `report` on purpose: this one exists before the agent has
   * looked at anything, which is the state the user spends time in while they
   * decide what to do.
   */
  const [attached, setAttached] = useState<FileRef | null>(null);
  /** The agent's reading of the attached file, produced on Send. */
  const [report, setReport] = useState<FileReport | null>(null);
  /** The file the last operation ran on, so result cards can offer downloads. */
  const [lastResult, setLastResult] = useState<
    | { kind: 'sealed'; name: string; bytes: Uint8Array; seal: Uint8Array; hash: string }
    | { kind: 'opened'; name: string; bytes: Uint8Array }
    | { kind: 'message'; url: string }
    | null
  >(null);

  /**
   * Tier, resolved from the connected address.
   *
   * Chat used to sit on Free permanently, so an address on the unrestricted list
   * still hit the daily cap here — the same address behaved differently in /app
   * and in /chat, and nothing on screen explained the difference. It now reads
   * the same tier source the workspace does.
   */
  const [tier, setTier] = useState<Tier>(TIER_BY_KEY.free);
  /** Balance and price source behind the tier, so the status card shows evidence. */
  const [holdings, setHoldings] = useState<{
    balance: number;
    usd: number;
    priceSource: string;
  } | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [kdfProgress, setKdfProgress] = useState<number | null>(null);
  const [keyfileError, setKeyfileError] = useState<string | null>(null);

  const [stage, setStage] = useState<{ mode: 'encrypt' | 'decrypt'; done: number } | null>(null);

  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resetIdentityRef = useRef<() => void>(() => {});
  const connectWalletRef = useRef<() => Promise<void>>(async () => {});
  /**
   * The current identity, readable from callbacks that were created earlier.
   *
   * Cards rendered into the transcript capture their handlers at render time, so
   * a handler that closed over `identity` state would keep seeing the value from
   * before the key existed.
   */
  const identityRef = useRef<Identity | null>(null);

  const nextId = () => ++idRef.current;

  const push = useCallback((t: TurnInput) => {
    const id = nextId();
    setTurns((prev) => [...prev, { ...t, id } as Turn]);
    return id;
  }, []);

  const say = useCallback((text: string) => push({ role: 'agent', text }), [push]);
  const show = useCallback((node: React.ReactNode) => push({ role: 'agent', node }), [push]);

  /**
   * Say something, but at the pace of someone composing it.
   *
   * A reply that lands in the same frame as the keypress reads as a lookup, not
   * as a response — the words can be right and the exchange still feels wrong.
   * This shows the typing indicator, waits a span proportional to the length of
   * the reply, then posts it. See lib/agent/think.ts for the bounds.
   *
   * Reserved for conversational turns. Results — a report card, a sealed file —
   * must not be delayed: the user asked for something to be done, not to be
   * talked to, and padding that would read as the tool being slow.
   */
  const compose = useCallback(
    async (text: string) => {
      setComposing(true);
      setThinkLabelText(thinkLabel());
      const t = think();
      try {
        await t.promise;
      } catch {
        return;
      } finally {
        setComposing(false);
      }
      say(text);
    },
    [say],
  );

  /**
   * The one function that decides what "signed in" looks like.
   *
   * Called from every setup path, so no path can fall through to the choice card
   * again. Replaces the picker turn in place rather than appending below it —
   * the question should not stay on screen once it is answered.
   */
  const settledIdentity = useCallback(
    (who: { kind: 'wallet' | 'keyfile'; label: string; address?: string }, detail: string) => {
      const card = (
        <IdentitySettled identity={who} detail={detail} onChangeKey={() => resetIdentityRef.current()} />
      );
      setTurns((prev) => {
        const idx = prev.findIndex((t) => 'isPicker' in t && t.isPicker);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { id: next[idx].id, role: 'agent', node: card } as Turn;
        return next;
      });
    },
    [],
  );

  /** Post the key-source picker, replacing any picker already in the transcript. */
  const showPicker = useCallback((keyfileFirst = false) => {
    const node = (
      <IdentityOffers
        onWallet={connectWalletRef.current}
        onCreateKeyfile={() => openDialog('create')}
        onLoadKeyfile={() => openDialog('open')}
        recommended={keyfileFirst ? 'keyfile' : undefined}
      />
    );
    setTurns((prev) => {
      const idx = prev.findIndex((t) => 'isPicker' in t && t.isPicker);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], node, isPicker: true } as Turn;
        return next;
      }
      return [...prev, { id: ++idRef.current, role: 'agent', node, isPicker: true } as Turn];
    });
  }, []);

  /**
   * Open the conversation, once.
   *
   * Guarded by a ref rather than by state: under StrictMode the effect body runs
   * twice before either render commits, so a state read would let both passes
   * post a greeting.
   */
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    say(greeting(false));
    showPicker();
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

  /* ───────────────────────── reading a file ───────────────────────── */

  /**
   * Read the attached file and describe it.
   *
   * Called on Send, never on attach. Produces the report card and the applicable
   * action, and deliberately does not run that action.
   */
  const readAttached = useCallback(
    async (ref: FileRef) => {
      setBusy(true);
      setBusyLabel('Reading the file…');
      try {
        const rep = await inspectFile(ref);
        setReport(rep);
        show(
          <FileReportCard
            report={rep}
            busy={busy}
            onRun={(a) => void runAction(a === 'encrypt' ? { kind: 'seal', file: ref } : { kind: 'open', file: ref })}
          />,
        );
        for (const line of describeReport(rep)) say(line);
        // The file has been read, so it leaves the composer. Keeping the chip
        // would leave it labelled "not read yet", which is no longer true, and
        // would make the next Send re-read a file the agent already described.
        setAttached(null);
        if (rep.action === 'decrypt') {
          say('This one can be opened only. Press Decrypt when you want it done.');
        } else if (rep.action === 'encrypt') {
          say('This one can be sealed. Press Encrypt and it becomes a .arshield container plus a seal.');
        } else if (rep.kind === 'keyfile') {
          say('That is a key file — it does the opening, so I will not seal or open it. Keep it somewhere offline.');
        } else if (rep.kind === 'seal-png') {
          say('That is a seal receipt, not an envelope. Its hash is what /verify compares a download against.');
        }
      } catch (e) {
        say(`I could not read that file: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy(false);
        setBusyLabel('Working…');
      }
    },
    // runAction is defined below and reached through the closure at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [say, show, busy],
  );

  /* ───────────────────────── identity: wallet ───────────────────────── */

  const connectWallet = useCallback(async () => {
    setWalletError(null);
    const provider = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!provider) {
      say('I do not see a wallet in this browser. The key-file path needs nothing installed — that one will work here.');
      return;
    }
    setBusy(true);
    setBusyLabel('Connecting…');
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts?.[0];
      if (!address) {
        say('The wallet gave me no account to work with.');
        return;
      }

      // Capability is checked before the signature is requested, so a wallet that
      // cannot derive keys is caught before the user is asked to sign.
      setBusyLabel('Checking this address on ARC…');
      const det = await detectWalletKind(address);
      setDetection(det);

      if (isUnsupported(det)) {
        say(
          `${det.walletName ?? 'That wallet'} signs with smart-contract accounts — ${det.reason} Its signature cannot derive keys, so the wallet path stops here. Nothing is lost though: a key file does the same job and needs no wallet.`,
        );
        showPicker(true);
        return;
      }

      say(`${det.kind === 'eoa' ? 'Standard signing key' : 'I could not check the address type'} — ${det.reason} Sign, and the keys derive from that signature.`);
      setBusyLabel('Waiting for the signature…');
      const { ARSHIELD_DERIVATION_MESSAGE, identityFromWalletSignature } = await import('@/lib/arshield');
      const signatureHex = (await provider.request({
        method: 'personal_sign',
        params: [ARSHIELD_DERIVATION_MESSAGE, address],
      })) as string;
      const kp: ArShieldKeyPair = identityFromWalletSignature(signatureHex);
      setIdentity({ kind: 'wallet', label: `wallet · ${address}`, kp });

      // Resolve the tier from the same source the workspace uses, so an address
      // entitled to more is not quietly capped here. Deliberately after the
      // identity is set: a tier is a property of the key, not a prerequisite
      // for having one, and a failed read must not block setup.
      void fetchTierState(address)
        .then((st) => {
          setTier(st.tier);
          setHoldings({ balance: st.balance, usd: st.usd, priceSource: st.priceSource });
        })
        .catch(() => {
          /* Stays on Free; the cap is the safe direction to fail in. */
        });
      settledIdentity(
        { kind: 'wallet', label: `wallet · ${address}`, address },
        'Keys come from this wallet, so the same wallet on any device opens the same files. Nothing to back up.',
      );
      say('That signature is the key. Attach a file whenever you are ready and I will read it first.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/reject|denied|User rejected/i.test(msg)) {
        say('You cancelled the signature — nothing was derived, which is fine. Try again any time, or use a key file.');
      } else if (/65-byte EOA|smart-contract/i.test(msg)) {
        setWalletError(msg);
        say('That wallet signed in a format I cannot derive keys from. A key file will work here.');
        showPicker(true);
      } else {
        setWalletError(msg);
        say(`I could not connect: ${msg}`);
      }
    } finally {
      setBusy(false);
      setBusyLabel('Working…');
    }
  }, [say, settledIdentity, showPicker]);

  connectWalletRef.current = connectWallet;
  identityRef.current = identity;

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
        settledIdentity(
          { kind: 'keyfile', label: 'arshield-key.json' },
          'Those keys live only in the file you just downloaded. Lose it and everything sealed to it is unrecoverable — there is no reset, by anyone.',
        );
        say('Key file made and saved. That file is the only copy of these keys, so keep it somewhere you would keep a passport.');
      } catch (e) {
        setKeyfileError(e instanceof Error ? e.message : String(e));
      } finally {
        setKdfProgress(null);
      }
    },
    [say, settledIdentity],
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
        settledIdentity(
          { kind: 'keyfile', label: 'arshield-key.json' },
          'Unlocked from the file you supplied. This key will seal and open from now on.',
        );
        say('Key file unlocked. Attach a file and I will read it first.');
      } catch (e) {
        setKeyfileError(e instanceof Error ? e.message : String(e));
      } finally {
        setKdfProgress(null);
      }
    },
    [say, settledIdentity],
  );

  /* ───────────────────────── results ───────────────────────── */

  const renderResult = useCallback(
    (res: AgentResult, sourceLabel: string) => {
      if (!res.ok) {
        if (res.kind === 'wallet-unsupported') {
          show(
            <Failure
              message="I could not derive keys from that wallet's signature."
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
        setLastResult({ kind: 'sealed', name: res.name, bytes: res.bytes, seal: res.seal, hash: res.hash });
        show(
          <ResultCard
            title={`Sealed · ${res.name}`}
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => download(res.bytes, res.name)}>
                  Download envelope
                </Button>
                <Button size="sm" variant="ghost" onClick={() => download(res.seal, `${res.name}.seal.png`, 'image/png')}>
                  Download seal PNG
                </Button>
                <CopyRow value={res.hash} label="Copy hash" />
              </>
            }
          >
            <Fact label="algorithm" value="ML-KEM-768 + X25519 / ML-DSA-65" />
            <Fact label="sha256" value={shortHash(res.hash)} mono />
            <Fact label="signed by" value={sourceLabel} mono tone="idle" />
            <Fact label="stored" value="nowhere — download only, from this tab" tone="verified" />
          </ResultCard>,
        );
        return;
      }

      if (res.kind === 'opened') {
        setLastResult({ kind: 'opened', name: res.name, bytes: res.bytes });
        show(
          <ResultCard
            title={`Opened · ${res.name}`}
            actions={
              <Button size="sm" variant="ghost" onClick={() => download(res.bytes, res.name)}>
                Download file
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
      show(
        <ResultCard title="Secret message ready" tone="progress">
          <Fact label="characters" value={String(res.chars)} />
          <Fact label="carried in" value="the link itself — nothing stored server-side" />
          <p className="break-all rounded-lg bg-[var(--color-card-inset)] p-2.5 font-mono text-[11.5px] text-[#b9c1cf]">
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

  /* ───────────────────────── running an operation ───────────────────────── */

  const execute = useCallback(
    async (action: { kind: 'seal'; file: FileRef } | { kind: 'open'; file: FileRef }) => {
      // Same reason as runAction: this can be invoked from a card created before
      // the key existed, so the identity is read live rather than closed over.
      const id = identityRef.current;
      if (!id) return;

      if (action.kind === 'seal') {
        if (!canEncrypt(tier)) {
          say(`The daily limit is used up on ${tier.name} (${tier.encryptionsPerDay} in 24h). It resets at 00:00 UTC.`);
          return;
        }
        if (action.file.size > tier.maxFileBytes) {
          say(`That file is larger than ${tier.name} allows — the cap is ${Math.round(tier.maxFileBytes / (1024 * 1024))} MB.`);
          return;
        }
      }

      const mode = action.kind === 'seal' ? 'encrypt' : 'decrypt';
      setBusy(true);
      setBusyLabel(action.kind === 'seal' ? 'Sealing…' : 'Opening…');
      setStage({ mode, done: 0 });

      try {
        // The stage list and the crypto run together and both are awaited: a seal
        // that finishes in milliseconds still gets the full walk, and a slow one
        // is never compressed to fit.
        const work: Promise<AgentResult> =
          action.kind === 'seal' ? sealFile(action.file, id) : openFile(action.file, id);

        const [, res] = await Promise.all([
          playSteps((n) => setStage({ mode, done: n }), 5, 0),
          work,
        ]);

        if (res.ok && res.kind === 'sealed') incrementEncryptionsUsed();
        renderResult(res, id.label.includes('· ') ? id.label.split('· ')[1] : id.label);
      } catch (e) {
        show(<Failure message={e instanceof Error ? e.message : String(e)} />);
      } finally {
        setStage(null);
        setBusy(false);
        setBusyLabel('Working…');
      }
    },
    [tier, say, show, renderResult],
  );

  /**
   * Hand an operation to the user for confirmation.
   *
   * Every run goes through here — there is no path that executes without a
   * button press, and no separate confirm dialog to keep in sync.
   */
  const runAction = useCallback(
    (action: { kind: 'seal'; file: FileRef } | { kind: 'open'; file: FileRef }) => {
      // Read through the ref, not the closed-over state. This function is handed
      // to a card that is rendered into the transcript, so the version the button
      // calls is the one captured when the card was created — which is before a
      // key was set up. Using the ref means the button always sees the current
      // identity instead of the one from the render that built the card.
      if (!identityRef.current) {
        say('I need a key before I can do that. Pick wallet or key file above and I will walk you through it.');
        return;
      }
      // A run consumes the composer's file: it has been read, described and
      // acted on, so leaving it attached would invite a second accidental run.
      setAttached(null);
      void execute(action);
    },
    [say, execute],
  );

  /* ───────────────────────── the turn ───────────────────────── */

  const handleSubmit = useCallback(async () => {
    const raw = input.trim();
    if (!raw && !attached) return;
    // A turn already in flight — whether an operation or a reply being composed —
    // must finish first, or two replies arrive out of order.
    if (busy || composing) return;

    const file = attached;
    setInput('');
    push({ role: 'user', text: raw, file: file?.name });

    // 1. Conversational first — a greeting that gets answered as an unknown
    //    command reads worse than a command answered conversationally.
    const reply: Reply | null = converse(raw, !!file);
    if (reply && !file) {
      await compose(replyText(reply));
      return;
    }

    // 2. With a file in hand and no explicit verb, reading it *is* the action.
    const intent = route(raw, file);

    if (file && intent.kind === 'unknown') {
      await readAttached(file);
      return;
    }

    switch (intent.kind) {
      case 'inspect':
        if (!file) {
          say('Nothing attached yet — use the paperclip or drop a file in, and I will tell you exactly what it is.');
          break;
        }
        await readAttached(file);
        break;

      case 'help':
        await compose(
          'Attach a file and I read it first: type, size, hash, and what is inside. Then I offer the one action that fits — an envelope can be opened, a plain file can be sealed. Say `seal this message "..."` to get a link carrying encrypted text. Everything runs in this tab.',
        );
        break;

      case 'status':
        show(
          <ResultCard title="Status" tone="progress">
            <Fact label="key" value={identity ? identity.label : 'none yet'} mono />
            <Fact
              label="tier"
              value={tier.name}
              tone={Number.isFinite(tier.encryptionsPerDay) ? undefined : 'verified'}
            />
            <Fact label="seals left today" value={String(encryptionsLeft(tier))} tone="verified" />
            <Fact
              label="max file size"
              value={Number.isFinite(tier.maxFileBytes) ? `${Math.round(tier.maxFileBytes / (1024 * 1024))} MB` : 'unlimited'}
            />
            {/* The evidence behind the tier, when it was read. A level with no
                balance next to it invites the question it should answer. */}
            {holdings && (
              <Fact
                label="balance"
                value={`${holdings.balance.toLocaleString()} $arshield · $${holdings.usd.toFixed(2)}`}
                mono
                tone="idle"
              />
            )}
            <Fact label="file in play" value={file ? file.name : 'none'} mono />
            {detection && (
              <Fact label="wallet check" value={detection.kind.toUpperCase()} tone={detection.kind === 'smart' ? 'danger' : 'verified'} />
            )}
          </ResultCard>,
        );
        break;

      case 'download':
        if (!lastResult) {
          say('Nothing to download yet — seal or open something first.');
          break;
        }
        if (intent.target === 'seal' && lastResult.kind === 'sealed') {
          download(lastResult.seal, `${lastResult.name}.seal.png`, 'image/png');
        } else if (lastResult.kind !== 'message') {
          download(lastResult.bytes, lastResult.name);
        }
        break;

      case 'seal':
        if (!intent.fileRef) {
          say('Attach the file you want sealed first — the paperclip, or drop it into the box below.');
          break;
        }
        runAction({ kind: 'seal', file: intent.fileRef });
        break;

      case 'open': {
        if (!intent.fileRef) {
          say('Attach the .arshield file you want opened, then tell me to open it.');
          break;
        }
        // If this file has already been read, the report already knows whether it
        // is an envelope. Saying so beats letting the decrypt fail.
        if (report && report.kind !== 'container' && report.name === intent.fileRef.name) {
          say(
            `${intent.fileRef.name} is not an envelope — it is ${report.kind === 'plain' ? 'a plain file' : 'a ' + report.kind}. There is nothing to open; it can be sealed instead.`,
          );
          break;
        }
        runAction({ kind: 'open', file: intent.fileRef });
        break;
      }

      case 'message': {
        if (!identity) {
          say('I need a key before I can build a message.');
          break;
        }
        if (!intent.text) {
          say('Put the text in quotes and I will seal it — `seal this message "meet at eight"`.');
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

      case 'history':
        say('This conversation is the history — every operation and its result stays in it until you start a new one.');
        break;

      case 'clear':
        setTurns([]);
        setAttached(null);
        setReport(null);
        setLastResult(null);
        say(greeting(!!identity));
        if (identity) {
          settledIdentity(
            {
              kind: identity.kind,
              label: identity.label,
              address: identity.kind === 'wallet' ? identity.label.split('· ')[1] : undefined,
            },
            identity.kind === 'wallet'
              ? 'Still derived from this wallet. Nothing was reset.'
              : 'Still the key file you loaded. Nothing was reset.',
          );
        } else {
          showPicker();
        }
        break;

      default:
        if (reply) {
          await compose(replyText(reply));
        } else if (report?.action) {
          say(
            `I did not find a command in that. ${report.name} can be ${report.action === 'encrypt' ? 'sealed' : 'opened'} — press the button above, or say "${report.action === 'encrypt' ? 'encrypt it' : 'decrypt it'}".`,
          );
        } else {
          await compose(confusedReply);
        }
    }
  }, [
    input, attached, busy, identity, tier, holdings, detection, report, lastResult,
    push, say, show, renderResult, connectWallet, readAttached, runAction, settledIdentity,
    showPicker, compose, composing,
  ]);

  /* ───────────────────────── attaching ───────────────────────── */

  /**
   * Attach a file to the composer.
   *
   * Deliberately inert: no read, no hash, no report. The file waits in the chip
   * until Send, which is what makes the attachment behave like an attachment.
   */
  const attachFile = useCallback(
    (f: File) => {
      void f.arrayBuffer().then((b) => {
        const bytes = new Uint8Array(b);
        setAttached({ name: f.name, bytes, size: bytes.length });
        setReport(null);
      });
    },
    [],
  );

  function resetIdentity() {
    setIdentity(null);
    setDetection(null);
    setAttached(null);
    setReport(null);
    say('Key cleared. Pick how you want to hold one again.');
    showPicker();
  }
  resetIdentityRef.current = resetIdentity;

  /* ───────────────────────── view ───────────────────────── */

  return (
    <>
      <Background />
      <div className="relative flex h-svh flex-col">
        <header className="border-b border-[var(--color-hairline)] bg-[#020610]/70 backdrop-blur-xl">
          {/* Wider than the conversation column on purpose: the header carries
              nav that the column does not, and at max-w-3xl five labels started
              crowding the logo. The transcript stays narrow; the chrome does
              not have to follow it. */}
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="ArShield home">
                <Logo />
              </Link>
              <span className="hidden items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-2.5 py-1 text-[11px] text-[#8792a3] sm:inline-flex">
                <ShieldCheck className="h-3 w-3 text-[var(--color-verified)]" />
                agent
              </span>
            </div>
            {/*
              The same nav as the rest of the site, minus the Agents entry —
              this is that page, and a link to where you already are is noise.

              It used to be two small text links, which meant leaving this page
              for MCP or Messages required going home first. The header is the
              one piece of chrome that should not differ between pages.
            */}
            <nav className="hidden items-center gap-5 lg:flex">
              {[
                { href: '/app', label: 'Workspace' },
                { href: '/mcp', label: 'MCP' },
                { href: '/m', label: 'Messages' },
                { href: '/verify', label: 'Verify' },
                { href: '/docs', label: 'Docs' },
              ].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-[13px] text-[#9aa3b2] transition-colors hover:text-[#e6e9ef]"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              {/* Below lg the nav collapses to the one destination that matters
                  most from here: the workspace, where the same crypto runs
                  without a conversation in the way. */}
              <Link
                href="/app"
                className="text-[12px] text-[#8792a3] underline-offset-2 hover:text-[#e6e9ef] hover:underline lg:hidden"
              >
                workspace
              </Link>
              {turns.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTurns([]);
                    setAttached(null);
                    setReport(null);
                    setLastResult(null);
                    say(greeting(!!identity));
                    if (identity) {
                      settledIdentity(
                        {
                          kind: identity.kind,
                          label: identity.label,
                          address: identity.kind === 'wallet' ? identity.label.split('· ')[1] : undefined,
                        },
                        identity.kind === 'wallet'
                          ? 'Still derived from this wallet. Nothing was reset.'
                          : 'Still the key file you loaded. Nothing was reset.',
                      );
                    } else {
                      showPicker();
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 sm:px-6">
          <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto py-6">
            {turns.map((t) => (
              <Bubble
                key={t.id}
                role={t.role}
                // A card the agent produces is an object, not speech. Rendering it
                // bare keeps one raised surface per object instead of a card
                // floating inside a bubble of the same colour.
                settled={'node' in t && !('text' in t)}
              >
                {'text' in t ? (
                  <>
                    {t.text}
                    {'file' in t && t.file && (
                      <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#c9d0da]">
                        <PaperclipIcon />
                        {t.file}
                      </span>
                    )}
                  </>
                ) : (
                  t.node
                )}
              </Bubble>
            ))}

            {stage && (
              <Bubble role="agent" wide>
                <SealingStepper mode={stage.mode} done={stage.done} running={stage.done < 5} />
              </Bubble>
            )}

            {composing && !busy && <Thinking label={thinkLabelText} />}
            {busy && !stage && <Working label={busyLabel} />}
          </div>

          <div className="pb-5 pt-1">
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => void handleSubmit()}
              onAttach={attachFile}
              onDropFile={attachFile}
              busy={busy}
              attached={attached}
              onRemoveAttached={() => {
                setAttached(null);
                setReport(null);
              }}
            />
            <p className="px-1 pt-2 text-[11.5px] text-[#5c6675]">
              Runs entirely in your browser. No file, message, or key is sent anywhere.
              {walletError && <span className="text-[var(--color-danger)]"> · wallet note recorded</span>}
            </p>
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

/** Paperclip for the attachment line on a user turn. */
function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
