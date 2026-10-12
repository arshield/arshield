'use client';

import { useCallback, useEffect, useState } from 'react';
import { ARSHIELD_DERIVATION_MESSAGE, identityFromWalletSignature, type ArShieldKeyPair } from '@/lib/arshield';
import { RH_CHAIN_ID_HEX } from '@/lib/arshield/constants';

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

export function getInjected(): Eip1193 | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export type WalletState = { address: string; chainId: string } | null;

/**
 * Minimal EIP-1193 hook. Reads chain, requests accounts, and personal_signs the fixed
 * ArShield derivation message. On Robinhood Chain (0x1237 = 4663) only.
 */
export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(null);
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const connect = useCallback(async () => {
    setError(null);
    const provider = getInjected();
    if (!provider) {
      setError('No injected wallet found. Install MetaMask and add Robinhood Chain.');
      return;
    }
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string;
      if (chainId !== RH_CHAIN_ID_HEX && chainId !== '4663') {
        setError(`Switch to Robinhood Chain (4663). Current: ${chainId}`);
        return;
      }
      setWallet({ address: accounts[0], chainId });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const disconnect = useCallback(() => setWallet(null), []);

  const deriveIdentity = useCallback(async (): Promise<ArShieldKeyPair> => {
    const provider = getInjected();
    if (!provider) throw new Error('No wallet found');
    const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
    if (!accounts?.[0]) throw new Error('Wallet not connected');
    setDeriving(true);
    try {
      const signatureHex = (await provider.request({
        method: 'personal_sign',
        params: [ARSHIELD_DERIVATION_MESSAGE, accounts[0]],
      })) as string;
      return identityFromWalletSignature(signatureHex);
    } finally {
      setDeriving(false);
    }
  }, []);

  useEffect(() => {
    const provider = getInjected();
    if (!provider) return;
    const onAccounts = () => setWallet(null);
    const onChain = () => setWallet(null);
    const ep = provider as unknown as { on?: (e: string, cb: () => void) => void; removeListener?: (e: string, cb: () => void) => void };
    ep.on?.('accountsChanged', onAccounts);
    ep.on?.('chainChanged', onChain);
    return () => {
      ep.removeListener?.('accountsChanged', onAccounts);
      ep.removeListener?.('chainChanged', onChain);
    };
  }, []);

  return { wallet, deriving, error, mounted, connect, disconnect, deriveIdentity };
}