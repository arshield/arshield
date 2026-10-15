'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, KeyRound } from 'lucide-react';
import type { Tier } from '@/lib/tiers';
import { encryptionsLeft } from '@/lib/tiers';

/**
 * The account control: tier, wallet and the actions that belong to them.
 *
 * What this replaces and why. Three separate elements sat in the header — a gold
 * tier pill, a green wallet pill and a plain text "Change key" link. All three
 * had the same shape (rounded-full, same padding, same border weight), two of
 * them used the same ShieldCheck icon, and none of them shared a height, so the
 * row read as three unrelated chips rather than one object. Duplicated icon plus
 * duplicated shape is what makes a header look generated rather than designed.
 *
 * This is one control. Segments divided by hairlines inside a single border, so
 * the eye reads a unit, and the actions live one click away instead of competing
 * for the same row. It is the pattern every dense product UI converges on, for
 * the reason that it works: identity and actions are related, so they belong
 * together, but they are not equally important, so they are not equally loud.
 *
 * The identity mark is derived from the address rather than being a generic
 * wallet glyph — a deterministic hue means a given wallet always looks the same,
 * which is what makes a badge an identity rather than decoration.
 */

/**
 * Identity mark for an address.
 *
 * Derived from the address, so a given wallet always looks the same. What it
 * deliberately is not is a full-hue rainbow: an earlier pass spread the hue
 * across 360 degrees and the result was a blue-purple badge sitting in a header
 * that is otherwise gold-on-near-black — one element from a different palette
 * makes the whole row look assembled rather than designed.
 *
 * So the hue stays inside the brand's band (gold through warm amber, 34-58deg)
 * and identity comes from lightness and saturation instead. Distinct at a
 * glance, still part of the system.
 */
function markForAddress(address: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < address.length; i++) h = (h * 31 + address.charCodeAt(i)) >>> 0;

  const hue = 34 + (h % 25);        // 34..58
  const sat = 58 + ((h >> 5) % 22); // 58..79
  const light = 42 + ((h >> 11) % 14); // 42..55
  const hue2 = 34 + ((h >> 3) % 25);

  return {
    bg: `linear-gradient(140deg, hsl(${hue} ${sat}% ${light}%), hsl(${hue2} ${Math.max(30, sat - 18)}% ${Math.max(24, light - 16)}%))`,
    // Near-black on a mid-light gold reads as a stamp rather than a sticker.
    fg: '#04101f',
  };
}

export function AccountPill({
  tier,
  sourceLabel,
  address,
  onChangeKey,
}: {
  tier: Tier;
  /** "wallet · 0xabc…def" or "keyfile (generated)" */
  sourceLabel: string;
  /** Present only for the wallet path; drives the identity mark. */
  address?: string;
  onChangeKey: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const left = encryptionsLeft(tier);
  const isWallet = !!address;
  const mark = address ? markForAddress(address) : null;

  // Dismiss on outside click or Escape. A popover that only closes via its own
  // button is the kind of thing that gets clicked away and does not respond.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Nothing useful to do; the address is on screen and selectable.
    }
  };

  return (
    <div ref={root} className="relative">
      {/*
        One border, one height, hairline dividers between segments. The tier keeps
        the brand gold because it is the one piece of information that changes
        what the app will do; the address stays neutral so it reads as an
        identifier, not a status.
      */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={[
          'group flex h-9 items-center rounded-full border pl-1 pr-2.5 transition-colors duration-200',
          open
            ? 'border-white/[0.22] bg-white/[0.06]'
            : 'border-white/[0.11] bg-white/[0.03] hover:border-white/[0.20] hover:bg-white/[0.055]',
        ].join(' ')}
      >
        {/* Identity mark. Deterministic hue per address, so the same wallet is
            recognisable at a glance across sessions. */}
        {isWallet ? (
          <span
            aria-hidden="true"
            className="grid h-6 w-6 flex-none place-items-center rounded-full text-[10px] font-bold uppercase"
            style={{ background: mark!.bg, color: mark!.fg }}
          >
            {address!.slice(2, 4)}
          </span>
        ) : (
          <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-white/[0.14] bg-white/[0.05]">
            <KeyRound className="h-3 w-3 text-[#aab3c1]" />
          </span>
        )}

        {/* Tier. The only gold in the row, because it is the only thing with
            consequences attached. */}
        <span className="ml-2 flex items-center gap-1.5 text-[12.5px]">
          <span className="font-semibold text-brand-gold">{tier.name}</span>
          <span className="text-brand-gold/55">·</span>
          {/* "unlimited" rather than "∞". The glyph read as decoration — nobody
              could tell whether it meant a count, a status or a toggle. */}
          <span className="tabular-nums text-brand-gold/80">
            {left === 'unlimited' ? 'unlimited' : `${left} left`}
          </span>
        </span>

        <span aria-hidden="true" className="mx-2.5 h-4 w-px flex-none bg-white/[0.13]" />

        {/* Address, monospace so its fixed width is apparent and it reads as a
            machine value rather than a label. */}
        <span className="font-mono text-[12.5px] text-[#aab3c1]">
          {isWallet ? `${address!.slice(0, 6)}…${address!.slice(-4)}` : 'key file'}
        </span>

        <ChevronDown
          className={[
            'ml-2 h-3.5 w-3.5 flex-none text-[#7a8494] transition-transform duration-200',
            open ? 'rotate-180 text-[#c8cedb]' : 'group-hover:text-[#aab3c1]',
          ].join(' ')}
        />
      </button>

      {/* The popover. Deliberately plain: identity and two actions, no
          decoration. Its job is to get out of the way once opened. */}
      {open && (
        <div
          role="menu"
          className="as-dialog-in absolute right-0 top-[calc(100%+10px)] z-50 w-[248px] overflow-hidden rounded-xl border border-white/[0.13] bg-[#070c16] shadow-[0_28px_70px_-24px_rgba(0,0,0,0.95),0_0_0_1px_rgba(0,0,0,0.5)]"
        >
          <div className="border-b border-white/[0.06] px-3 py-2.5">
            {/* Label without the tier badge. The tier is already in the trigger
                directly above, and repeating it here made it ambiguous whether
                "WHALE" was the account name or a plan. */}
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#7a8494]">
              {sourceLabel.startsWith('keyfile') ? 'Key file' : 'Connected wallet'}
            </div>

            {isWallet ? (
              <button
                type="button"
                onClick={copyAddress}
                title="Copy address"
                className="mt-1.5 flex w-full items-center gap-1.5 rounded-lg py-1 text-left transition-colors hover:bg-white/[0.05]"
              >
                <span className="break-all font-mono text-[11px] leading-relaxed text-[#c8cedb]">
                  {address}
                </span>
                {copied && <Check className="h-3 w-3 flex-none text-[var(--color-verified)]" />}
              </button>
            ) : (
              <p className="mt-2 text-[12.5px] leading-relaxed text-[#c8cedb]">
                Keys held in this browser session
              </p>
            )}
          </div>

          {/* Plain sentence rather than a spec dump: this is the one line a
              person reads to know what their tier gets them. */}
          <div className="px-3 py-2 text-[11.5px] leading-relaxed text-[#8f98a8]">
            {Number.isFinite(tier.encryptionsPerDay)
              ? `Up to ${tier.encryptionsPerDay} files every 24 hours`
              : 'No daily limit'}
            {' · '}
            {Number.isFinite(tier.maxFileBytes)
              ? `${Math.round(tier.maxFileBytes / (1024 * 1024))} MB per file`
              : 'no file size cap'}
          </div>

          <div className="border-t border-white/[0.06] p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onChangeKey(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-[#c8cedb] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#7a8494]" />
              Change key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
