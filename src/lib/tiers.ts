'use client';

/**
 * Tier resolution: what the connected wallet is entitled to.
 *
 * Two reads, from two places, and the split matters:
 *
 *   balance  ARC RPC, eth_call balanceOf(address) against the $arshield
 *            contract. This is the part that cannot be faked by a price feed.
 *   price    Peach (api.peach.ag), which reports USD per token. Used only to
 *            convert a token count into the USD figure the tier thresholds are
 *            expressed in.
 *
 * Everything degrades. A tier gate that hard-fails because a third party is down
 * would lock paying holders out of the app, which is worse than the gate being
 * briefly generous. So:
 *
 *   price API reachable   → balance x live price  → tier
 *   price API unreachable → balance x fallback rate → tier
 *   no fallback rate      → Free
 *
 * The fallback rate is deliberately conservative. Being briefly over-generous on
 * a soft gate is recoverable; being wrong in the other direction means a holder
 * cannot use what they paid for.
 */

const MB = 1024 * 1024;

export type Tier = {
  key: 'free' | 'holder' | 'pro' | 'whale';
  name: string;
  minUsd: number;
  encryptionsPerDay: number;
  maxFileBytes: number;
};

export const TIERS: Tier[] = [
  { key: 'free', name: 'Free', minUsd: 0, encryptionsPerDay: 3, maxFileBytes: 25 * MB },
  { key: 'holder', name: 'Holder', minUsd: 20, encryptionsPerDay: 25, maxFileBytes: 100 * MB },
  { key: 'pro', name: 'Pro', minUsd: 100, encryptionsPerDay: 250, maxFileBytes: 1024 * MB },
  { key: 'whale', name: 'Whale', minUsd: 1000, encryptionsPerDay: Infinity, maxFileBytes: Infinity },
];

export const TIER_BY_KEY = Object.fromEntries(TIERS.map((t) => [t.key, t])) as Record<Tier['key'], Tier>;

/* ---- configuration ------------------------------------------------------- */

/**
 * The $arshield contract on ARC. Empty until the token launches, and while it is
 * empty every wallet reads as Free — there is nothing to hold.
 */
export const ARSHIELD_CONTRACT = (
  process.env.NEXT_PUBLIC_ARSHIELD_CONTRACT ?? ''
)
  .trim()
  .toLowerCase();

/**
 * ARC RPC.
 *
 * The first entry is the canonical endpoint; the rest are fallbacks used in
 * order if a call fails. All seven were verified live and reporting chainId
 * 0x13b2, and all seven send permissive CORS headers, so a direct browser call
 * works and no proxy is needed.
 */
export const ARC_RPCS: string[] = [
  'https://rpc.mainnet.arc.io',
  'https://rpc.blockdaemon.mainnet.arc.io',
  'https://arc.drpc.org',
  'https://rpc.beamrpc.com',
];

/**
 * Used when the price API cannot be reached.
 *
 * Set NEXT_PUBLIC_ARSHIELD_USD_FALLBACK to the launch price in USD. Leaving it
 * at 0 means an unreachable price feed resolves everyone to Free, which is the
 * safe direction but will annoy holders — so set it before launch.
 */
export const ARSHIELD_USD_FALLBACK = Number(
  process.env.NEXT_PUBLIC_ARSHIELD_USD_FALLBACK ?? '0'
);

const PRICE_API = 'https://api.peach.ag/arc/v1/arc/market_price';
/** Standard 18 decimals. Not a BigInt literal — the build targets ES2017. */
const TOKEN_DECIMALS = 18;

const PRICE_CACHE_MS = 60_000;
const BALANCE_CACHE_MS = 30_000;

/* ---- on-chain balance ---------------------------------------------------- */

// uint256 balanceOf(address), first four bytes of keccak256.
const SEL_BALANCE_OF = '0x70a08231';

function padAddress(addr: string): string {
  return addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

/**
 * Read balanceOf over ARC, trying each RPC in turn.
 *
 * Returns the raw token amount scaled by decimals, or null if every endpoint
 * failed — null rather than 0, because "we could not read it" and "you hold
 * none" mean different things to the caller.
 */
async function readBalance(address: string): Promise<bigint | null> {
  if (!ARSHIELD_CONTRACT) return null;

  const data = SEL_BALANCE_OF + padAddress(address);
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [{ to: ARSHIELD_CONTRACT, data }, 'latest'],
  });

  for (const rpc of ARC_RPCS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: string; error?: unknown };
      if (json.error || typeof json.result !== 'string') continue;
      if (json.result === '0x') return BigInt(0);
      return BigInt(json.result);
    } catch {
      // Try the next endpoint. A failing RPC is expected, not exceptional.
    }
  }
  return null;
}

/* ---- price --------------------------------------------------------------- */

/**
 * USD per $arshield, from Peach.
 *
 * Peach proxies Birdeye. As with any spot price this is manipulable if the pool
 * is thin, which is why the balance read is what decides entitlement and this
 * only converts units — a flash-loaned price spike would still need the tokens
 * to actually be held at call time.
 */
async function readPriceUsd(): Promise<number | null> {
  if (!ARSHIELD_CONTRACT) return null;
  try {
    const url =
      `${PRICE_API}?base_symbol_address=${ARSHIELD_CONTRACT}` +
      `&quote_coin_address=usd&market=birdeye`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      code?: number;
      data?: { prices?: Array<{ price?: string }> };
    };
    const raw = json?.data?.prices?.[0]?.price;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/* ---- caches -------------------------------------------------------------- */

type Cache<T> = { at: number; value: T };

let priceCache: Cache<number | null> | null = null;
let balanceCache: Cache<bigint | null> | null = null;
let balanceCacheFor = '';

function fresh<T>(c: Cache<T> | null, maxAge: number): boolean {
  return !!c && Date.now() - c.at < maxAge;
}

/* ---- public API ---------------------------------------------------------- */

/**
 * Addresses granted the top tier for testing.
 *
 * Pre-launch there is no token, so everyone reads as Free and the daily cap is
 * easy to hit while exercising the app. Lowercase for comparison — addresses are
 * case-insensitive but checksummed in display, so never match the raw string.
 */
export const TEST_UNLIMITED: ReadonlySet<string> = new Set([
  '0xaece0ab2a46f31209f4c6381f20a5af218fda176',
]);

export function isTestUnlimited(address?: string | null): boolean {
  return !!address && TEST_UNLIMITED.has(address.toLowerCase());
}

export function tierFromUsd(usd: number): Tier {
  if (!Number.isFinite(usd) || usd <= 0) return TIER_BY_KEY.free;
  const found = [...TIERS].reverse().find((t) => usd >= t.minUsd);
  return found ?? TIER_BY_KEY.free;
}

export type TierState = {
  tier: Tier;
  /** Whole tokens held, 0 when unknown. */
  balance: number;
  /** USD value of the balance, 0 when unknown. */
  usd: number;
  /** Where the number came from, so the UI can be honest about it. */
  priceSource: 'live' | 'fallback' | 'none';
  /** False when the balance read failed; the tier is then only a floor. */
  balanceKnown: boolean;
};

/**
 * Resolve the tier for an address.
 *
 * Note this is a soft gate evaluated in the browser. It shapes the interface and
 * the limits, and it is trivially overridable by anyone with devtools. That is
 * an accepted trade-off for a client-only app; if the limits ever need to bind,
 * the balance check has to move server-side.
 */
export async function fetchTierState(address?: string | null): Promise<TierState> {
  const free: TierState = {
    tier: TIER_BY_KEY.free,
    balance: 0,
    usd: 0,
    priceSource: 'none',
    balanceKnown: false,
  };

  if (!address) return free;
  if (isTestUnlimited(address)) {
    return { tier: TIER_BY_KEY.whale, balance: 0, usd: 0, priceSource: 'none', balanceKnown: true };
  }
  // No contract deployed yet: there is nothing to hold, so nothing to read.
  if (!ARSHIELD_CONTRACT) return free;

  // Balance.
  if (balanceCacheFor !== address || !fresh(balanceCache, BALANCE_CACHE_MS)) {
    balanceCache = { at: Date.now(), value: await readBalance(address) };
    balanceCacheFor = address;
  }
  const raw = balanceCache?.value ?? null;
  if (raw == null) return free;
  const balance = Number(raw) / Math.pow(10, TOKEN_DECIMALS);

  // Price.
  if (!fresh(priceCache, PRICE_CACHE_MS)) {
    priceCache = { at: Date.now(), value: await readPriceUsd() };
  }
  let price = priceCache?.value ?? null;
  let priceSource: TierState['priceSource'] = price == null ? 'none' : 'live';
  if (price == null && ARSHIELD_USD_FALLBACK > 0) {
    price = ARSHIELD_USD_FALLBACK;
    priceSource = 'fallback';
  }
  if (price == null) {
    // Balance is known but unpriced. Report the holding, gate as Free.
    return { tier: TIER_BY_KEY.free, balance, usd: 0, priceSource: 'none', balanceKnown: true };
  }

  const usd = balance * price;
  return { tier: tierFromUsd(usd), balance, usd, priceSource, balanceKnown: true };
}

/** Convenience wrapper when only the tier is needed. */
export async function fetchTier(address?: string | null): Promise<Tier> {
  return (await fetchTierState(address)).tier;
}

export function tierLabel(tier: Tier): string {
  const cap = Number.isFinite(tier.encryptionsPerDay) ? `${tier.encryptionsPerDay} / 24h` : 'Unlimited';
  const size = Number.isFinite(tier.maxFileBytes)
    ? `${Math.round(tier.maxFileBytes / MB)} MB`
    : 'No tier cap';
  return `${tier.name} · ${cap} · ${size}`;
}

/* ---- daily counter (localStorage, resets 00:00 UTC) ---------------------- */

const LS_KEY = 'arshield:enc-count';

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
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
  } catch {
    /* storage disabled */
  }
  return next;
}

export function canEncrypt(tier: Tier): boolean {
  if (!Number.isFinite(tier.encryptionsPerDay)) return true;
  return getEncryptionsUsedToday() < tier.encryptionsPerDay;
}

export function encryptionsLeft(tier: Tier): number | 'unlimited' {
  if (!Number.isFinite(tier.encryptionsPerDay)) return 'unlimited';
  return Math.max(0, tier.encryptionsPerDay - getEncryptionsUsedToday());
}
