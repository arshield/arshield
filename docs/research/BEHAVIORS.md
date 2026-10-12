# Stonkscoin.org — Recon & Pixel Redesign Spec

URL: https://stonkscoin.org — GitHub Pages static, Next.js (SSG), Open Sans typography, indigo/ticker theme.

## Mission (dari Gum)
Clone KONTEN & STRUKTUR 1:1, tapi VISUAL total di-ubah: **semua jadi pixel art 8-bit**.

## Original structure (from live DOM)
1. **Header/Hero** — bg indigo #1A237E + stock-ticker pattern (angka/panah/FOMO). Nav kiri: logo + STONKS. Nav kanan: STONKSPLIT, LOCKER (merah). Hero 2 kolom: kiri = h1 "STONKS" + subtitle "The first memecoin on Salfana / $STNK anchors $STONKS" + 2 CTA ($STNK⇄$STONKS outline, Buy $STNK green #43A047) + Telegram/X. Kanan: stonksguay + arrow-up.
2. Trust strip: CMC, CoinGecko, DEXScreener, Birdeye, Moonshot, Jupiter, Raydium (pill logos)
3. About ("Abuot") — white bg, 2 kolom: detektiv img kiri, teks kanan + "Don trus, veryfi." + 2 validasi CA (April 2 2021 $STNX, Nov 23 2025 $STONKS)
4. How to buy — indigo + ticker, 2 kolom: 4 step kiri (1. Create wallet, 2. Get SOL, 3. Buy $STNK, 4. Wrap to $STONKS) | teajor img
5. Roadmop — white, "Still first meme" img
6. Intlektual propert — indigo, teks + copirights cert
7. Kontribut — white, 4 cards (Kontribut: Trenches/GTR/Meme.com/Locker) masing2 icon + CTA button
8. Footer — indigo, logo + Join Telegram + Follow on X + disclaimer

## Pixel redesign rules
- **Fonts**: heading = "Press Start 2P", body/mono = "VT323" (pixel/retro)
- Semua `<img>` pakai versi `/images/px/*.png` (already pixelated 8-bit via PIL)
- Colors asli dipertahankan utk brand tone (indigo #1A237E, green #43A047, hitam/putih)
- Border hard: `border-4 border-black` + `box-shadow: 4px 4px 0 #000` (pixel shadow, no radius)
- Buttons = pixel block (hard shadow, uppercase pixel font)
- Bg ticker pattern diganti pixel-ticker (CSS repeating gradient / animated marquee tekst)
- Semua elemen image-rendering: pixelated