'use client';

import { useCallback, useEffect, useState } from 'react';
import { ARSHIELD_DERIVATION_MESSAGE, identityFromWalletSignature, type ArShieldKeyPair } from '@/lib/arshield';
import { ARC_CHAIN_ID, ARC_CHAIN_ID_HEX, ARC_RPC } from '@/lib/arshield/constants';

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

export function getInjected(): Eip1193 | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export type WalletState = { address: string; chainId: string } | null;

/** Params for wallet_addEthereumChain — ARC uses native USDC as its gas token. */
const ARC_CHAIN_PARAMS = {
  chainId: ARC_CHAIN_ID_HEX,
  chainName: 'ARC',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  rpcUrls: [ARC_RPC],
  blockExplorerUrls: ['https://explorer.arc.io'],
};

function isArc(chainId: string | undefined | null): boolean {
  if (!chainId) return false;
  return chainId.toLowerCase() === ARC_CHAIN_ID_HEX || chainId === String(ARC_CHAIN_ID);
}

/**
 * Minimal EIP-1193 hook. Requests accounts, makes sure the wallet is on ARC
 * (adding the chain if it is unknown), then personal_signs the fixed ArShield
 * derivation message. Wallet-derived keys are only valid on ARC.
 */
export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(null);
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const ensureArc = useCallback(async (provider: Eip1193): Promise<void> => {
    let chainId = (await provider.request({ method: 'eth_chainId' })) as string;
    if (isArc(chainId)) return;
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID_HEX }] });
    } catch (e) {
      // 4902 = chain not added to the wallet yet.
      const code = (e as { code?: number })?.code;
      if (code === 4902 || code === -32603) {
        await provider.request({ method: 'wallet_addEthereumChain', params: [ARC_CHAIN_PARAMS] });
      } else {
        throw e;
      }
    }
    chainId = (await provider.request({ method: 'eth_chainId' })) as string;
    if (!isArc(chainId)) {
      throw new Error(`Switch to ARC (${ARC_CHAIN_ID}). Current: ${chainId}`);
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const provider = getInjected();
    if (!provider) {
      setError('No injected wallet found. Install MetaMask, then connect to add ARC automatically.');
      return;
    }
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      await ensureArc(provider);
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string;
      setWallet({ address: accounts[0], chainId });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ensureArc]);

  const disconnect = useCallback(() => setWallet(null), []);

  const deriveIdentity = useCallback(async (): Promise<ArShieldKeyPair> => {
    const provider = getInjected();
    if (!provider) throw new Error('No wallet found');
    const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
    if (!accounts?.[0]) throw new Error('Wallet not connected');
    await ensureArc(provider);
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
  }, [ensureArc]);

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