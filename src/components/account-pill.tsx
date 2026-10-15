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
 * Identity marks for the account control.
 *
 * Two things are encoded, and they answer different questions:
 *
 * - The tier, by how much of the shield is filled. That is the one that changes
 *   what the app will do, so it is the one that is legible at a glance.
 * - The account, by a deterministic hue derived from the address, so the same
 *   wallet always renders the same colour and it becomes recognisable rather
 *   than decorative.
 *
 * Why a shield and not an identicon, having built both: a bare identicon is
 * unique per address but carries no meaning. It reads as a generated avatar,
 * which was the impression we were trying to get away from. Keeping the
 * product's own silhouette says what the account is for, which is the part that
 * matters in a security tool.
 */

/** The shield, in its own 32x32 coordinate space. */
const SHIELD_PATH = 'M16 2.5 27 6v9.6c0 6.9-4.6 11.6-11 13.4C9.6 27.2 5 22.5 5 15.6V6z';

/** FNV-1a. Cheap, deterministic, and well spread for this use. */
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * The shield path lives in a 32x32 space but the SVG viewBox is 0-100, so the
 * path is scaled into place. Anything drawn inside it has to use the same box —
 * an earlier version scattered its interior across the full 0-100 and then
 * clipped to a shield occupying roughly 12-88, so the mark rendered as an empty
 * outline.
 */
const SHIELD_BOX = { x: 12.4, y: 12.4, size: 75.2 };

/**
 * How much of the shield is filled, per tier.
 *
 * One language only: fill rises from the bottom and the amount of gold is the
 * whole signal. An earlier pass mixed a sparse-block treatment for Free with
 * partial fills for the others, and the result did not read as a ladder — Pro
 * measured visually as less filled than Holder, and Free was closest to Pro
 * rather than to empty. A single monotonic scale from 0 to 1 fixes that and
 * keeps every tier directly comparable.
 *
 * The silhouette never changes. That is what holds the set together as a family
 * instead of four unrelated icons, and it is why this still works at 24px where
 * a detailed glyph would not.
 */
const TIER_FILL: Record<string, number> = {
  free: 0,
  holder: 0.34,
  pro: 0.67,
  whale: 1,
};

function markForAddress(address: string): { hue: number; clipId: string } {
  const s1 = hash32(address);
  const s3 = hash32(address.slice(-16) + 'b');
  // Hue stays inside the brand band. A full-wheel hue produced a blue-purple
  // badge in a header that is otherwise gold-on-near-black, and one element from
  // a different palette is what makes a row look assembled rather than designed.
  const hue = 34 + (s3 % 22);
  // Scoped by the address rather than a counter: a counter would differ between
  // the server render and hydration.
  return { hue, clipId: `ash-${s1.toString(36)}` };
}

/**
 * Renders the mark. Sized in px, drawn in a 0-100 viewBox, so one path serves
 * every size the header may use.
 */
function ShieldAvatar({
  address,
  tierKey,
  size = 24,
}: {
  address: string;
  /** Drives how much of the shield is filled. */
  tierKey: string;
  size?: number;
}) {
  const mark = markForAddress(address);
  // The shield is 32 units wide; scale it to fill the box with a little margin.
  const scale = 2.35;
  const tx = (100 - 32 * scale) / 2;
  const ty = (100 - 32 * scale) / 2;

  const fillFraction = TIER_FILL[tierKey] ?? 0;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="flex-none">
      <defs>
        <clipPath id={mark.clipId}>
          <path d={SHIELD_PATH} transform={`translate(${tx} ${ty}) scale(${scale})`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${mark.clipId})`}>
        {/* A filled bed behind everything. Without it the page background shows
            through the empty part of the shield and the mark reads as gold
            floating in a void rather than as a filled emblem. */}
        <rect
          x={SHIELD_BOX.x}
          y={SHIELD_BOX.y}
          width={SHIELD_BOX.size}
          height={SHIELD_BOX.size}
          fill={`hsl(${mark.hue} 26% 7%)`}
        />
        {/* Fill rises from the bottom. The amount of gold is the entire signal,
            so tiers stay comparable no matter which two are side by side. */}
        {fillFraction > 0 && (
          <rect
            x={SHIELD_BOX.x}
            y={SHIELD_BOX.y + SHIELD_BOX.size * (1 - fillFraction)}
            width={SHIELD_BOX.size}
            height={SHIELD_BOX.size * fillFraction}
            fill={`hsl(${mark.hue} 88% 64%)`}
          />
        )}
      </g>
      {/* Drawn after the fill so the outline is never occluded by it. */}
      <path
        d={SHIELD_PATH}
        fill="none"
        stroke={`hsl(${mark.hue} 55% 42%)`}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        transform={`translate(${tx} ${ty}) scale(${scale})`}
      />
    </svg>
  );
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
        {/* Identity mark. The product's shield with a grid generated from the
            address, so it reads as this wallet specifically rather than as a
            placeholder. The key-file path has no address to derive from, so it
            keeps a neutral key glyph. */}
        {isWallet ? (
          <ShieldAvatar address={address!} tierKey={tier.key} size={24} />
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
            <div className="flex items-center gap-2.5">
              {isWallet && <ShieldAvatar address={address!} tierKey={tier.key} size={28} />}
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#7a8494]">
                {sourceLabel.startsWith('keyfile') ? 'Key file' : 'Connected wallet'}
              </div>
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
