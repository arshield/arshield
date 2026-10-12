# STONKS Pixel — Design Tokens

## Fonts (Google via next/font)
- **Press Start 2P** — display: h1/h2/h3, buttons, nav. Small sizes (10-24px), uppercase
- **VT323** — body text, paragraphs, disclaimer. 18-24px

## Palette (dari original, keep)
- indigo: #1A237E (header/core bg — dark blue)
- indigo light: #1e2a8a / #283593 (secondary block)
- green CTA: #43A047, hover #388E3C
- light blue outline: #64B5F6 / #90CAF9
- red accent: #D32F2F (locker icon, SCREAMS style)
- white: #FFFFFF (text on dark, cards)
- off-white bg: #FAFAFA (light sections)
- black: #000 (text on light, pixel shadow)
- pixel shadow: rgba(0,0,0,1) hard 0 4px 0 #000

## Pixel utilities (globals.css)
- .px-border: `border: 4px solid #000; box-shadow: 6px 6px 0 #000;` border-radius: 0
- .px-btn: press start 2p, uppercase, hard shadow, hover: translate(2px,2px) + reduce shadow
- img pixelated: `image-rendering: pixelated; image-rendering: crisp-edges;`

## Layout reference (desktop 1440)
- header container max-w ~1100px, py-16 px-6
- hero 2 col: 6/6, h1 80px, sub 26px, CTAs 20px
- trust strip: 7 pills, wrap
- section padding: 80-100px, alternate indigo/white
- section titles: 24-32px Press Start 2P + ↗

## Content (verbatim dari original)
Semua teks/links sesuai snapshot (Ab uot diganti judul asli sesuai HTML).