'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, Wallet, X } from 'lucide-react';
import { Button, sizes, variants } from './button';
import { cn } from '@/lib/utils';
import { useWallet } from '@/lib/use-wallet';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* ArShield mark: gold shield with a cream arc, no background plate. */}
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="logo-grad" x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E9C35F" />
            <stop offset="0.55" stopColor="#D1A413" />
            <stop offset="1" stopColor="#7A5F0A" />
          </linearGradient>
        </defs>
        {/* Shield outline (stroke only -> transparent interior) */}
        <path
          d="M16 3 27 7.5v8.6c0 6.7-4.6 10.9-11 12.9C9.6 27 5 22.8 5 16.1V7.5L16 3Z"
          stroke="url(#logo-grad)"
          strokeWidth="2.1"
          strokeLinejoin="round"
          fill="none"
        />
        {/* The ARC gesture: a bright arc through the shield */}
        <path
          d="M9.4 18.4c2.2-3.4 4.4-5.1 6.6-5.1s4.4 1.7 6.6 5.1"
          stroke="#F5DA99"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
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