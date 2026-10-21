'use client';

/**
 * Wallet capability detection — EOA versus smart contract.
 *
 * The crypto core derives keys from a 65-byte EIP-191 signature. Smart-contract
 * wallets answer personal_sign with an EIP-1271 signature instead, which is a
 * different length and cannot be used as key material. That is a real limit, not
 * a bug, and it is not going away.
 *
 * The failure mode we are designing against is not the limit — it is discovering
 * the limit *after* an operation. A user connects, clicks sign, and only then
 * meets a message about 65-byte signatures. That reads as a broken app. So the
 * check happens before the sign request, and the answer arrives as an offer
 * instead of an error.
 *
 * Two signals, cheapest first:
 *
 *   code      eth_getCode against the address. Non-empty means a contract. One
 *             RPC round trip and definitive, so it runs first.
 *   flags     provider hints for wallets that are always smart accounts, used
 *             when the RPC refuses the call or returns nothing useful.
 */

import { ARC_RPC, ARC_CHAIN_ID } from '@/lib/arshield/constants';

export type WalletKind = 'eoa' | 'smart' | 'unknown';

export type Detection = {
  kind: WalletKind;
  /** Why the verdict came out this way — shown to the user, not just logged. */
  reason: string;
  /** Provider-declared name when it gives one. */
  walletName: string | null;
};

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
type ProviderWithFlags = Eip1193 & {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isCoinbaseBrowser?: boolean;
  isAmbire?: boolean;
  isSafe?: boolean;
  isBraveWallet?: boolean;
  isTrust?: boolean;
  isOkxWallet?: boolean;
  isLedgerConnect?: boolean;
};

function getProvider(): ProviderWithFlags | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: ProviderWithFlags }).ethereum ?? null;
}

/**
 * Read the provider's own name where it advertises one.
 *
 * Used for copy only — never for the verdict, because a provider that says it is
 * MetaMask can still be a smart account (MetaMask now ships one).
 */
export function walletNameOf(provider: ProviderWithFlags | null): string | null {
  if (!provider) return null;
  if (provider.isRabby) return 'Rabby';
  if (provider.isAmbire) return 'Ambire';
  if (provider.isSafe) return 'Safe';
  if (provider.isCoinbaseWallet || provider.isCoinbaseBrowser) return 'Coinbase Wallet';
  if (provider.isBraveWallet) return 'Brave Wallet';
  if (provider.isTrust) return 'Trust Wallet';
  if (provider.isOkxWallet) return 'OKX Wallet';
  if (provider.isLedgerConnect) return 'Ledger';
  if (provider.isMetaMask) return 'MetaMask';
  return null;
}

/**
 * Flags that identify a wallet whose account is always a contract.
 *
 * Kept as a separate signal from getCode because these wallets often proxy to a
 * bundler that answers eth_getCode inconsistently, and a wrong "EOA" verdict
 * sends the user into the exact failure we are trying to prevent. When the flag
 * fires we trust it over a negative code read.
 */
function smartOnlyFlag(provider: ProviderWithFlags | null): string | null {
  if (!provider) return null;
  if (provider.isAmbire) return 'Ambire accounts are smart contracts';
  if (provider.isSafe) return 'Safe accounts are smart contracts';
  return null;
}

/**
 * Ask ARC whether this address has code.
 *
 * Returns null when the answer cannot be trusted — RPC down, rate limited,
 * malformed response — so the caller can fall back rather than guess. A guess in
 * either direction costs the user a broken flow.
 */
async function hasContractCode(address: string): Promise<boolean | null> {
  try {
    const res = await fetch(ARC_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getCode',
        params: [address, 'latest'],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string; error?: unknown };
    if (json.error || typeof json.result !== 'string') return null;
    // "0x" or "0x0" means no code. Anything longer is a contract.
    const code = json.result;
    return code !== '0x' && code !== '0x0' && code.length > 2;
  } catch {
    return null;
  }
}

/**
 * Decide whether this address can derive keys.
 *
 * Order matters: flag first (cheap, and the flag is never wrong about being a
 * contract), then code (definitive when it works), then unknown. "unknown" is a
 * real answer and the UI treats it as one — it offers both paths rather than
 * quietly picking the one that will fail.
 */
export async function detectWalletKind(address: string): Promise<Detection> {
  const provider = getProvider();
  const walletName = walletNameOf(provider);

  const flagged = smartOnlyFlag(provider);
  if (flagged) {
    return { kind: 'smart', reason: flagged, walletName };
  }

  const code = await hasContractCode(address);
  if (code === true) {
    return {
      kind: 'smart',
      reason: 'This address has contract code on ARC, so its signatures are EIP-1271.',
      walletName,
    };
  }
  if (code === false) {
    return {
      kind: 'eoa',
      reason: 'No contract code at this address — a standard signing key.',
      walletName,
    };
  }

  return {
    kind: 'unknown',
    reason: 'Could not reach ARC to check this address. Both key paths are open.',
    walletName,
  };
}

/** True when this detection should send the user to the key-file path instead. */
export function isUnsupported(detection: Detection): boolean {
  return detection.kind === 'smart';
}

/** Expose the chain we checked against, for the status line. */
export const DETECTION_CHAIN = ARC_CHAIN_ID;
