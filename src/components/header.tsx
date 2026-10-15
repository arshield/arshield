'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BRAND_MARK_PATH, BRAND_MARK_TRANSFORM } from '@/lib/brand-mark';
import { Menu, Wallet, X } from 'lucide-react';
import { Button, sizes, variants } from './button';
import { cn } from '@/lib/utils';
import { useWallet } from '@/lib/use-wallet';
import { XLink } from './x-link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/*
        ArShield mark: the wolf-and-shield, traced from the source artwork by
        scripts/gen-brand-assets.py + potrace. Drawn as one path, fill-rule
        evenodd, so the negative space inside the mark stays transparent.
        No background plate.
      */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g transform={BRAND_MARK_TRANSFORM}>
          <path d={BRAND_MARK_PATH} fill="url(#logo-gold)" fillRule="evenodd" />
        </g>
        <defs>
          <linearGradient id="logo-gold" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FFD86B" />
            <stop offset="0.55" stopColor="#F6B621" />
            <stop offset="1" stopColor="#C98A10" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[15px] font-medium tracking-tight text-[#e6e9ef]">ArShield</span>
    </span>
  );
}

const NAV = [
  { href: '/mcp', label: 'MCP' },
  { href: '/m', label: 'Messages' },
  { href: '/verify', label: 'Verify' },
  { href: '/#protocol', label: 'How it works' },
  { href: '/#tiers', label: 'Tiers' },
  { href: '/#shield', label: 'Shield' },
  { href: '/#faq', label: 'FAQ' },
];

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { wallet, error, mounted, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#020610]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="ArShield home" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[13px] font-normal text-[#9aa3b2] transition-colors hover:text-[#e6e9ef]"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <XLink className="hidden sm:grid" />
          {mounted && wallet ? (
            <button
              onClick={disconnect}
              title={`Connected to ARC (${wallet.chainId}) — click to disconnect`}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-1.5 text-[12.5px] font-medium text-emerald-300 transition-colors hover:border-emerald-400/50"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {shortAddr(wallet.address)}
            </button>
          ) : (
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={connect}>
              <Wallet className="h-4 w-4" />
              Connect wallet
            </Button>
          )}
          <Link href="/app" className={cn(
            'group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-medium transition-all duration-300',
            sizes.md, variants.primary,
          )}>
            Launch app
          </Link>
          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-[#e6e9ef] lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="border-t border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-center text-[12.5px] text-red-300">
          {error}
        </div>
      )}

      {open && (
        <div className="border-t border-white/[0.06] bg-[#020610] px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-[#9aa3b2] hover:bg-white/[0.04] hover:text-white"
              >
                {n.label}
              </Link>
            ))}

            {/* The desktop X link is hidden on small screens, so the mobile menu
                carries it instead of dropping it. */}
            <div className="mt-2 flex items-center gap-3 px-3 py-1">
              <XLink tone="bright" />
              <span className="text-[13px] text-[#9aa3b2]">Follow @arcshield_</span>
            </div>

            {mounted && wallet ? (
              <button
                onClick={() => { setOpen(false); disconnect(); }}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2.5 text-sm font-medium text-emerald-300"
              >
                Disconnect · {shortAddr(wallet.address)}
              </button>
            ) : (
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => { setOpen(false); connect(); }}
              >
                <Wallet className="h-4 w-4" />
                Connect wallet
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}