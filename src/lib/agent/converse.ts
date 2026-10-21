/**
 * Conversational replies.
 *
 * The router decides what was asked; this decides what to say back. Kept
 * separate because the two have different shapes: routing is a set of rules that
 * must return the same answer every time, while small talk is wording that will
 * be rewritten whenever it reads wrong.
 *
 * There is no model here and there will not be one. A greeting is a fixed
 * sentence, a question about the product has a fixed answer, and both are better
 * served by text someone actually wrote than by a generation that might invent a
 * capability. The agent's job is to be honest about a narrow tool; a model that
 * could confidently describe features that do not exist would be worse than one
 * that says "I can seal files, open envelopes, and read what a file is".
 *
 * Replies are matched by keyword set rather than by a language detection pass,
 * because the vocabulary is tiny and a detector would be more code than the
 * thing it replaces. Indonesian and English are handled in the same rule — the
 * user writes in both and does not switch modes to do it.
 */

export type Reply =
  | { kind: 'greeting' }
  | { kind: 'smalltalk'; text: string }
  | { kind: 'about'; text: string }
  | { kind: 'capabilities'; text: string }
  | { kind: 'thanks'; text: string }
  | { kind: 'bye'; text: string }
  | { kind: 'confused'; text: string };

/** Match against a normalised form: lowercased, punctuation stripped. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Rule = { test: RegExp; reply: Reply };

/**
 * Ordered, first match wins.
 *
 * "who are you" is checked before "hello" because a sentence can contain both and
 * the question is the more useful reading of it.
 */
const RULES: Rule[] = [
  {
    test: /\b(who are you|what are you|siapa ?(kamu|lo|lu|kah)|kamu siapa|lo siapa)\b/,
    reply: {
      kind: 'about',
      text: 'I am the ArShield agent. I do four things: read what a file is, seal it into a post-quantum container, open a container, and build a shareable secret message. I run in this tab — no server sees your file or your key.',
    },
  },
  {
    test: /\b(what can you do|bisa apa|apa yang bisa|help me with|kemampu|capabilities?)\b/,
    reply: {
      kind: 'capabilities',
      text: 'Attach a file and I will tell you what it is — type, size, hash, and what is inside it. If it is a plain file I offer to seal it; if it is an envelope I offer to open it. Say `seal this message "..."` for a link that carries encrypted text. Nothing is uploaded at any point.',
    },
  },
  {
    // Asked in Indonesian or English, and answered the same way. The question is
    // "why should I use this", so the reply leads with the property that is
    // actually unusual and then names the limits — an answer that only lists
    // strengths is the kind of thing a user stops trusting.
    // Stems, not whole words. Indonesian attaches possessives and particles
    // directly to the noun — "kelebihanmu", "keunggulannya", "unggulnya" — so a
    // trailing \b after "kelebihan" never matches and the question falls through
    // to "I did not catch that". Matching the stem without a trailing boundary is
    // what makes these forms reachable.
    test: /(kelebih|keunggul|unggul|kenapa (harus|pakai|pilih)|mengapa|bedanya|advantages?|benefits?|why (use|choose|you)|strengths?|better than|what.s special|what makes)/,
    reply: {
      kind: 'about',
      text: 'Three things, and one honest limit. Post-quantum by default — ML-KEM-768 and X25519 together for key exchange, ML-DSA-65 for signatures, so a file sealed today is not readable by a quantum computer later. It runs in your browser, so nothing is uploaded and no server ever holds your key. And it works without a wallet: a key file covers anyone who does not have one. The limit: if you use a key file and lose it, the data is gone — there is no reset and no recovery, by design.',
    },
  },
  {
    test: /\b(how does it work|how do you work|gimana cara|kerja(nya)?|kok bisa|cara(nya)?)\b/,
    reply: {
      kind: 'about',
      text: 'Files are sealed with ML-KEM-768 and X25519 together, then encrypted with AES-256-GCM and signed with ML-DSA-65. Your keys come either from a wallet signature or from a key file you hold. The container is the only thing produced — no copy is kept anywhere.',
    },
  },
  {
    test: /\b(thanks|thank you|thx|makasih|terima kasih|mantap|oke|ok|sip|nice|good|bagus)\b/,
    reply: {
      kind: 'thanks',
      text: 'Any time. Attach a file whenever you are ready.',
    },
  },
  {
    test: /\b(bye|goodbye|see you|sampai jumpa|selamat tinggal|dadah|cukup)\b/,
    reply: {
      kind: 'bye',
      text: 'Closing the tab clears everything — no session is kept. Your sealed files and keys stay wherever you saved them.',
    },
  },
  {
    test: /\b(hello|hi|hey|yo|halo|hai|hallo|helo|pagi|siang|sore|malam|assalam|test|tes)\b/,
    reply: {
      kind: 'greeting',
    },
  },
];

/** Reply for a turn that matched no rule and carried no file. */
const CONFUSED =
  'I did not catch a command in that. I understand things like "read this file", "encrypt it", "decrypt it", or `seal this message "..."` — or ask me what I can do.';

/**
 * Route a turn to a conversational reply.
 *
 * Returns null when the sentence is not small talk, so the caller can hand it to
 * the intent router instead. Null is the common case; this runs first only
 * because a greeting that gets treated as an unknown command reads worse than a
 * command that gets treated as small talk.
 */
export function converse(raw: string, hasFile: boolean): Reply | null {
  const text = norm(raw);
  if (text.length === 0) return null;

  for (const rule of RULES) {
    if (!rule.test.test(text)) continue;
    // A greeting that arrives with a file attached is not small talk — the user
    // is saying hello *and* handing over work. Let the intent router take it, so
    // "halo, decrypt this" does not get answered with "hello".
    if (rule.reply.kind === 'greeting' && hasFile) return null;
    return rule.reply;
  }

  return null;
}

/** The text of a reply, for callers that only need the string. */
export function replyText(r: Reply): string {
  switch (r.kind) {
    case 'greeting': {
      // Slight variation so the same greeting every time does not read as a
      // canned line. Both carry the same information.
      const pick = Math.random() < 0.5;
      return pick
        ? 'Hello. Ready when you are — attach a file and I will read it before touching anything, or ask me what I can do.'
        : 'Hi. Drop a file whenever you like and I will tell you what it is first, then offer the action that fits.';
    }
    case 'confused':
    case 'smalltalk':
    case 'about':
    case 'capabilities':
    case 'thanks':
    case 'bye':
      return r.text;
  }
}

export { CONFUSED as confusedReply };
