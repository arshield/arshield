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
 * Identity mark for an address: the ArShield shield, with a generated interior.
 *
 * Why a shield and not an identicon, having built both. A bare identicon is
 * unique per address but carries no meaning — it reads as a generated avatar,
 * which is exactly the impression we were trying to get away from. Putting the
 * grid inside the product's own silhouette keeps the uniqueness and adds the
 * part that matters for a security tool: the shape itself says what the account
 * is for. The outer form is the brand, the interior is the identity.
 *
 * Deterministic end to end — the same address always produces the same mark, so
 * it is an identity rather than decoration. Two constraints that came out of
 * testing this at real size:
 *
 * - The grid is 4x4, not finer. Thin lines disappear at 16px; blocks survive.
 * - The block layer is clipped to the shield path. Without the clip a square
 *   grid laid over a curved shield spills past the shoulders and the two
 *   geometries visibly fight. The outline is drawn after the blocks so it is
 *   never occluded by them.
 *
 * The hue is held inside the brand band (34-58deg, gold through amber). A
 * full-wheel hue produced a blue-purple badge sitting in a header that is
 * otherwise gold-on-near-black, and one element from a different palette is what
 * makes a row look assembled rather than designed.
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

type ShieldMark = {
  /** Block rectangles as SVG `rect` children, in a 0-100 space. */
  blocks: Array<{ x: number; y: number; w: number; h: number }>;
  /** Brand-band hue for this address. */
  hue: number;
  /** Unique id for the clipPath — multiple marks can be on one page. */
  clipId: string;
};

/**
 * The shield path lives in a 32x32 space but the SVG viewBox is 0-100, so the
 * path is scaled into place. The grid has to use the same box — an earlier
 * version scattered blocks across the full 0-100 and then clipped to a shield
 * occupying roughly 12-88, so most blocks were clipped away entirely and the
 * mark rendered as an empty outline.
 */
const SHIELD_BOX = { x: 12.4, y: 12.4, size: 75.2 };

function markForAddress(address: string): ShieldMark {
  const s1 = hash32(address);
  const s2 = hash32(address + 'a');
  const s3 = hash32(address.slice(-16) + 'b');

  const hue = 34 + (s3 % 22);
  const cols = 3;
  const rows = 3;
  const inset = 1.6;   // gap between blocks; smaller = bolder blocks
  // Inset the grid inside the shield so the outer ring of blocks is not clipped
  // by the tapering shoulders, which is where the shield is narrowest.
  const pad = { left: 7, right: 7, top: 8.5, bottom: 11 };
  const gridW = SHIELD_BOX.size - pad.left - pad.right;
  const gridH = SHIELD_BOX.size - pad.top - pad.bottom;
  const cw = gridW / cols;
  const ch = gridH / rows;

  const blocks: ShieldMark['blocks'] = [];
  for (let r = 0; r < rows; r++) {
    // Only the left half is derived; the right half mirrors it, so the mark
    // reads as a deliberate symbol rather than noise.
    for (let c = 0; c < Math.ceil(cols / 2); c++) {
      const on = ((s1 >>> (r * 2 + c)) ^ (s2 >>> (r + c))) & 1;
      if (!on) continue;
      const mirror = cols - 1 - c;
      for (const cc of new Set([c, mirror])) {
        blocks.push({
          x: SHIELD_BOX.x + pad.left + cc * cw + inset / 2,
          y: SHIELD_BOX.y + pad.top + r * ch + inset / 2,
          w: cw - inset,
          h: ch - inset,
        });
      }
    }
  }

  // Stable per address, but needs to be unique in the document, so it is scoped
  // by the address rather than a counter — a counter would differ between the
  // server render and hydration.
  return { blocks, hue, clipId: `ash-${s1.toString(36)}` };
}

/**
 * Renders the mark. Sized in px, drawn in a 0-100 viewBox, so one path serves
 * every size the header may use.
 */
function ShieldAvatar({ address, size = 24 }: { address: string; size?: number }) {
  const mark = markForAddress(address);
  // The shield is 32 units wide; scale it to fill the box with a little margin.
  const scale = (size === 24 ? 2.35 : 2.35);
  const tx = (100 - 32 * scale) / 2;
  const ty = (100 - 32 * scale) / 2;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="flex-none">
      <defs>
        <clipPath id={mark.clipId}>
          <path d={SHIELD_PATH} transform={`translate(${tx} ${ty}) scale(${scale})`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${mark.clipId})`}>
        {/* A filled bed behind the blocks. Without it the gaps between blocks
            show the page background, so the mark reads as gold shapes floating
            in a void rather than as a filled emblem — and at larger sizes the
            "pattern" is ambiguous about which part is the figure. */}
        <rect
          x={SHIELD_BOX.x}
          y={SHIELD_BOX.y}
          width={SHIELD_BOX.size}
          height={SHIELD_BOX.size}
          fill={`hsl(${mark.hue} 30% 10%)`}
        />
        <g fill={`hsl(${mark.hue} 82% 64%)`}>
          {mark.blocks.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={1} />
          ))}
        </g>
      </g>
      <path
        d={SHIELD_PATH}
        fill="none"
        stroke={`hsl(${mark.hue} 62% 52%)`}
        strokeWidth={2.2}
        vectorEffect="non-scaling-stroke"
        opacity={1}
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
          <ShieldAvatar address={address!} size={24} />
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
              {isWallet && <ShieldAvatar address={address!} size={28} />}
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
