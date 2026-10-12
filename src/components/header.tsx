'use client';

import Link from 'next/link';
import { Menu, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { Button, sizes, variants } from './button';
import { cn } from '@/lib/utils';

function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* QuantSafe logo mark: gold rounded shield with darker inset */}
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="logo-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E9C35F" />
            <stop offset="0.55" stopColor="#D1A413" />
            <stop offset="1" stopColor="#7A5F0A" />
          </linearGradient>
        </defs>
        <path
          d="M16 3 27 7.5v8.6c0 6.7-4.6 10.9-11 12.9C9.6 27 5 22.8 5 16.1V7.5L16 3Z"
          fill="url(#logo-grad)"
        />
        <path
          d="M16 7.2 23 10.2v5.9c0 4.7-3 7.9-7 9.4-4-1.5-7-4.7-7-9.4v-5.9l7-3Z"
          stroke="rgba(3,16,32,0.35)"
          strokeWidth="1"
          fill="rgba(3,16,32,0.12)"
        />
        <path d="M11.5 16.2l3 3 6-6.5" stroke="#F5DA99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="text-[15px] font-medium tracking-tight text-[#e6e9ef]">QuantSafe</span>
    </span>
  );
}

const NAV = [
  { href: '/mcp', label: 'MCP' },
  { href: '/m', label: 'Messages' },
  { href: '/verify', label: 'Verify' },
  { href: '/#technology', label: 'Technology' },
  { href: '/#tiers', label: 'Tiers' },
  { href: '/#shield', label: 'Shield' },
  { href: '/#faq', label: 'FAQ' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#020610]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="QuantSafe home" className="flex items-center gap-2">
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
          <Button variant="ghost" className="hidden sm:inline-flex">
            <Wallet className="h-4 w-4" />
            Connect wallet
          </Button>
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
            <Button variant="ghost" className="mt-2 w-full">
              <Wallet className="h-4 w-4" />
              Connect wallet
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

export { Logo };