/**
 * The chat agent's intent router.
 *
 * Deliberately local and deterministic: no model, no API key, no network. Two
 * reasons this is the right shape for ArShield, and neither is about cost.
 *
 * 1. The product's whole claim is that files never leave the device. A server
 *    that reads the user's instructions would have to hold their key material to
 *    act on them, which makes the claim false. Words are cheap; a router that
 *    never leaves the tab is what keeps the claim true.
 *
 * 2. An encryption tool cannot afford to guess. A model that is 97% sure the
 *    user wants to seal rather than open is a tool that occasionally opens the
 *    wrong envelope. The rules below are boring, inspectable, and give the same
 *    answer every time.
 *
 * The router only decides *what was asked*. It never touches files or keys —
 * the caller does that, behind the confirmation gate.
 */

export type Intent =
  | { kind: 'seal'; fileRef: FileRef | null }
  | { kind: 'open'; fileRef: FileRef | null }
  | { kind: 'inspect'; fileRef: FileRef | null; what: 'any' | 'file' }
  | { kind: 'message'; text: string }
  | { kind: 'identity'; action: 'wallet' | 'keyfile-create' | 'keyfile-load' | null }
  | { kind: 'status' }
  | { kind: 'help' }
  | { kind: 'history' }
  | { kind: 'download'; target: 'envelope' | 'seal' | 'file' }
  | { kind: 'clear' }
  | { kind: 'unknown'; raw: string };

/** A file the user has attached to the conversation, not yet acted on. */
export type FileRef = {
  name: string;
  bytes: Uint8Array;
  size: number;
};

type Rule = {
  kind: Intent['kind'];
  /** Tested in order; first match wins. */
  test: RegExp;
};

/**
 * Patterns, not prose matching.
 *
 * Word-boundary anchored and case-insensitive. `\b` matters: without it "unseal"
 * matches "seal" and a user asking to open a file gets it sealed again.
 *
 * Order is the whole design. "open" is tested before "seal" so "unseal" cannot
 * match "seal". "inspect" is tested before both, because "what is in this file"
 * contains neither verb but is the most common first turn after an attach —
 * getting that wrong means the user is asked a question the file already
 * answers.
 */
const RULES: Rule[] = [
  // Info first: "info about this file", "cek file ini", "what is this".
  { kind: 'inspect', test: /\b(info|details?|detail|describe|what is (this|it|inside)|tell me about|cek|periksa|lihat|apa ini|isi file|metadat?a|size only)\b/i },
  // Downloading a produced artifact.
  { kind: 'download', test: /\b(download|unduh|simpan|save)\b/i },
  // Opening — checked before sealing so "unseal" cannot match "seal".
  { kind: 'open', test: /\b(decrypt|unseal|unlock|open|buka|dekripsi)\b/i },
  { kind: 'seal', test: /\b(encrypt|seal|lock|protect|secure|kunci|enkripsi|sandi)\b/i },
  // Messages are their own action: they produce a shareable link, not a file.
  { kind: 'message', test: /\b(message|note|secret text|pesan|kirim teks|catatan)\b/i },
  // Identity setup. Verbs that only make sense before any operation runs.
  { kind: 'identity', test: /\b(connect|wallet|sign in|login|key ?file|keypair|identity|hubungkan|dompet)\b/i },
  { kind: 'status', test: /\b(status|tier|quota|limit|left|sisa|kuota|berapa)\b/i },
  { kind: 'history', test: /\b(history|riwayat|log|last|sebelumnya|recent)\b/i },
  { kind: 'clear', test: /\b(clear|reset|hapus|bersihkan|mulai ulang|start over)\b/i },
  { kind: 'help', test: /\b(help|what can|bisa apa|gimana|how do|tutorial|command|cara)\b/i },
];

const IDENTITY_ACTIONS: Array<{ test: RegExp; action: 'wallet' | 'keyfile-create' | 'keyfile-load' }> = [
  { test: /\b(create|generate|new|buat|bikin|baru)\b/i, action: 'keyfile-create' },
  { test: /\b(load|open existing|import|muat|buka yang)\b/i, action: 'keyfile-load' },
  { test: /\b(connect|wallet|sign in|login|dompet|hubungkan)\b/i, action: 'wallet' },
];

/**
 * Pull the quoted payload out of a message request.
 *
 *   seal this message "meet at 8"     → meet at 8
 *   kirim pesan: halo semua          → halo semua
 *
 * Returns null when there is nothing to send, so the caller can ask instead of
 * sealing an empty string.
 */
function extractMessageText(raw: string): string | null {
  const quoted = raw.match(/[""']([^""']+)[""']/);
  if (quoted?.[1]) return quoted[1].trim();

  // `[\s\S]` rather than the `s` flag: the compiler target here is below ES2018,
  // where dotAll is not available. Same semantics, no target bump.
  const afterColon = raw.match(/:\s*([\s\S]+)$/);
  if (afterColon?.[1]) {
    const t = afterColon[1].trim();
    if (t.length > 0) return t;
  }
  return null;
}

/** Which artifact the user wants downloaded, when they said so. */
function extractDownloadTarget(raw: string): 'envelope' | 'seal' | 'file' {
  if (/\bseal\b|\bpn(g|j)\b|receipt|bukti/i.test(raw)) return 'seal';
  if (/\b(envelope|container|arshield|hasil|result)\b/i.test(raw)) return 'envelope';
  return 'file';
}

/**
 * Route one user turn.
 *
 * `attached` is whatever file is currently sitting in the conversation. The UI
 * attaches files by drop or picker before the text arrives, so a bare "seal it"
 * is a complete instruction once a file is attached — the same way a person
 * would read it.
 */
export function route(raw: string, attached: FileRef | null = null): Intent {
  const text = raw.trim();
  if (text.length === 0) return { kind: 'unknown', raw };

  for (const rule of RULES) {
    if (!rule.test.test(text)) continue;

    if (rule.kind === 'inspect') return { kind: 'inspect', fileRef: attached, what: attached ? 'file' : 'any' };
    if (rule.kind === 'open') return { kind: 'open', fileRef: attached };
    if (rule.kind === 'seal') return { kind: 'seal', fileRef: attached };
    if (rule.kind === 'download') return { kind: 'download', target: extractDownloadTarget(text) };
    if (rule.kind === 'message') {
      const payload = extractMessageText(text);
      return { kind: 'message', text: payload ?? '' };
    }
    if (rule.kind === 'identity') {
      const hit = IDENTITY_ACTIONS.find((a) => a.test.test(text));
      return { kind: 'identity', action: hit?.action ?? null };
    }
    if (rule.kind === 'status') return { kind: 'status' };
    if (rule.kind === 'history') return { kind: 'history' };
    if (rule.kind === 'clear') return { kind: 'clear' };
    if (rule.kind === 'help') return { kind: 'help' };
  }

  return { kind: 'unknown', raw: text };
}

/**
 * The first thing the agent says when the conversation opens.
 *
 * Written as one turn, not a wall: it states what it can do, then asks the one
 * question that has to be answered before anything else can happen. The identity
 * question is first because every operation below it is blocked without an
 * answer, and finding that out at the drop zone is worse than being asked.
 */
export function greeting(): string {
  // One line, and only for a conversation that is being restarted with a key
  // already held. The opening greeting was removed: the picker states what it
  // needs, and a sentence above it explaining the same thing was doing the
  // card's job for it.
  return 'Ready. Drop a file and I will read it first — then tell you exactly what it is and what can be done with it.';
}

/** Human-readable name for an intent, used in receipts and confirmation copy. */
export function intentLabel(intent: Intent): string {
  switch (intent.kind) {
    case 'seal':
      return 'Seal a file';
    case 'open':
      return 'Open an envelope';
    case 'inspect':
      return 'Read a file';
    case 'message':
      return 'Build a secret message';
    case 'identity':
      return intent.action === 'wallet'
        ? 'Connect a wallet'
        : intent.action === 'keyfile-create'
          ? 'Create a key file'
          : intent.action === 'keyfile-load'
            ? 'Load a key file'
            : 'Set up identity';
    case 'status':
      return 'Show tier and quota';
    case 'history':
      return 'Show history';
    case 'download':
      return 'Download a result';
    case 'clear':
      return 'Clear the conversation';
    case 'help':
      return 'Explain what I can do';
    case 'unknown':
      return 'I did not understand that';
  }
}
