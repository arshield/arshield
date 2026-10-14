'use client';

/**
 * Tier + daily-limit logic. Mirrors the client-side soft gate used pre-launch:
 * the tier comes from the USD value of the $arshield balance read on-chain;
 * the daily encryption counter lives in localStorage and resets at 00:00 UTC.
 * No token is live yet, so the balance read falls back to Free.
 */

export type Tier = {
  key: 'free' | 'holder' | 'pro' | 'whale';
  name: string;
  minUsd: number; // 0 for free
  encryptionsPerDay: number; // Infinity for whale
  maxFileBytes: number; // Infinity for whale
};

export const TIERS: Tier[] = [
  { key: 'free', name: 'Free', minUsd: 0, encryptionsPerDay: 3, maxFileBytes: 25 * 1024 * 1024 },
  { key: 'holder', name: 'Holder', minUsd: 20, encryptionsPerDay: 25, maxFileBytes: 100 * 1024 * 1024 },
  { key: 'pro', name: 'Pro', minUsd: 100, encryptionsPerDay: 250, maxFileBytes: 1024 * 1024 * 1024 },
  { key: 'whale', name: 'Whale', minUsd: 1000, encryptionsPerDay: Infinity, maxFileBytes: Infinity },
];

export const TIER_BY_KEY = Object.fromEntries(TIERS.map((t) => [t.key, t])) as Record<Tier['key'], Tier>;

/**
 * Addresses granted the top tier for testing.
 *
 * Pre-launch there is no token to hold, so everyone reads as Free and the daily
 * cap is easy to hit while exercising the app. These wallets are treated as
 * Whale — no daily limit, no size cap — so the whole flow can be run without
 * waiting for a reset.
 *
 * Lowercase for comparison; addresses are case-insensitive but checksummed in
 * display, so never match on the raw string.
 */
export const TEST_UNLIMITED: ReadonlySet<string> = new Set([
  '0xaece0ab2a46f31209f4c6381f20a5af218fda176',
]);

export function isTestUnlimited(address?: string | null): boolean {
  return !!address && TEST_UNLIMITED.has(address.toLowerCase());
}

/** $arshield → tier from USD balance. Balance <= 0 -> free. */
export function tierFromUsd(usd: number): Tier {
  if (!Number.isFinite(usd) || usd <= 0) return TIER_BY_KEY.free;
  const found = [...TIERS].reverse().find((t) => usd >= t.minUsd);
  return found ?? TIER_BY_KEY.free;
}

/**
 * Read $arshield balance over the ARC RPC and convert to a tier.
 * The token is not deployed yet; when ARSHIELD_CONTRACT is set, this reads
 * balanceOf(address) and prices it against a pool. Pre-launch, everyone is
 * Free except the test addresses above.
 */
export async function fetchTier(address?: string | null): Promise<Tier> {
  // Test wallets bypass the gate entirely — see TEST_UNLIMITED.
  if (isTestUnlimited(address)) return TIER_BY_KEY.whale;
  // Pre-launch: $arshield hasn't launched, so any address reads as Free.
  // When ARSHIELD_CONTRACT is set, replace this with balanceOf(address) over
  // ARC_RPC, priced into USD, then tierFromUsd().
  if (!address) return TIER_BY_KEY.free;
  return TIER_BY_KEY.free;
}

export function tierLabel(tier: Tier): string {
  const cap = Number.isFinite(tier.encryptionsPerDay)
    ? `${tier.encryptionsPerDay} / 24h`
    : 'Unlimited';
  const size = Number.isFinite(tier.maxFileBytes)
    ? `${Math.round(tier.maxFileBytes / (1024 * 1024))} MB`
    : 'No tier cap';
  return `${tier.name} · ${cap} · ${size}`;
}

/* ---- Daily encryption counter (localStorage, resets 00:00 UTC) ---- */

const LS_KEY = 'arshield:enc-count';

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD in UTC
}

function readCount(): { day: string; n: number } {
  if (typeof window === 'undefined') return { day: utcDayKey(new Date()), n: 0 };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return { day: utcDayKey(new Date()), n: 0 };
    const parsed = JSON.parse(raw) as { day?: string; n?: number };
    const today = utcDayKey(new Date());
    if (parsed.day !== today) return { day: today, n: 0 };
    return { day: today, n: Number(parsed.n) || 0 };
  } catch {
    return { day: utcDayKey(new Date()), n: 0 };
  }
}

export function getEncryptionsUsedToday(): number {
  return readCount().n;
}

export function incrementEncryptionsUsed(): number {
  const { day, n } = readCount();
  const next = day === utcDayKey(new Date()) ? n + 1 : 1;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ day: utcDayKey(new Date()), n: next }));
  } catch { /* storage disabled */ }
  return next;
}

/** True if the user is still allowed to encrypt given their tier today. */
export function canEncrypt(tier: Tier): boolean {
  if (!Number.isFinite(tier.encryptionsPerDay)) return true;
  return getEncryptionsUsedToday() < tier.encryptionsPerDay;
}

export function encryptionsLeft(tier: Tier): number | 'unlimited' {
  if (!Number.isFinite(tier.encryptionsPerDay)) return 'unlimited';
  return Math.max(0, tier.encryptionsPerDay - getEncryptionsUsedToday());
}