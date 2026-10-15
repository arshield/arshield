import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * Geist ships as a variable font here, so `weight` is left unset — the file
 * carries a range and the browser picks from it. Declaring a single weight
 * would make every bold in the UI render from the same face and flatten the
 * hierarchy.
 */
const geistSans = localFont({
  src: './fonts/geist-sans.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

const geistMono = localFont({
  src: './fonts/geist-mono.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

/**
 * Canonical origin.
 *
 * This is where the site actually lives right now. It used to point at
 * arc-shield.xyz, which is not connected yet — that made every relative URL in
 * the metadata resolve against a domain that serves nothing, so link previews
 * on X, WhatsApp and Discord could fail to load their image. A preview that
 * silently degrades is the most visible way a site reads as unfinished, and it
 * only shows up when someone else shares your link.
 *
 * When the domain is attached, change this one value. Everything else —
 * canonical, og:url, sitemap, robots — derives from it.
 */
const SITE_URL = 'https://arshield.pages.dev';

export const metadata: Metadata = {
  title: 'ArShield | Post-Quantum Security Infrastructure on ARC',
  description:
    'The post-quantum layer for data, messages and agents. Hybrid ML-KEM-768 + X25519 encryption, ML-DSA-65 signatures, zero backend. Built for ARC.',
  metadataBase: new URL(SITE_URL),
  // Tells Google which URL is the real one. Without it, the same page reachable
  // from two hosts is treated as two pages competing with each other.
  alternates: { canonical: '/' },
  applicationName: 'ArShield',
  authors: [{ name: 'ArShield' }],
  creator: 'ArShield',
  keywords: [
    'post-quantum encryption',
    'ML-KEM-768',
    'ML-DSA-65',
    'quantum-safe file encryption',
    'MCP server',
    'x402',
    'ARC chain',
    'ArShield',
  ],
  // Browser chrome on mobile matches the page instead of flashing white above a
  // near-black layout.
  themeColor: '#020610',
  openGraph: {
    title: 'The post-quantum layer for data, messages and agents.',
    description:
      'ArShield seals it post-quantum, on your device. Your agents too. ML-KEM-768 + X25519 hybrid, ML-DSA-65 signed, MCP-native, built for ARC.',
    url: SITE_URL,
    siteName: 'ArShield',
    type: 'website',
    images: [{ url: '/seo/opengraph-image.png', width: 1200, height: 630, alt: 'ArShield — post-quantum envelopes for files and agents' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The post-quantum layer for data, messages and agents.',
    description:
      'ArShield seals it post-quantum, on your device. Your agents too. ML-KEM-768 + X25519 hybrid, ML-DSA-65 signed, MCP-native.',
    images: ['/seo/twitter-image.png'],
    site: '@arcshield_',
    creator: '@arcshield_',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

/**
 * Structured data so search engines understand this is a product, not a blog.
 * Values here are all verifiable from the site itself — no invented ratings or
 * award claims, which is both a Google guideline and just true.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ArShield',
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'Web, Linux, macOS, Windows',
  url: SITE_URL,
  description:
    'Post-quantum envelopes for files and messages. Hybrid ML-KEM-768 + X25519 encryption with ML-DSA-65 signatures, run entirely in the browser or as an MCP server.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier: 3 encryptions per day, 25 MB files. No account required.',
  },
  featureList: [
    'ML-KEM-768 + X25519 hybrid key encapsulation',
    'ML-DSA-65 signatures',
    'AES-256-GCM authenticated encryption',
    'MCP server for agents',
    'x402 payment receipt signing',
    'Runs client-side, no backend',
  ],
  sameAs: ['https://x.com/arcshield_'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <script
          type="application/ld+json"
          // Static object authored here, not user input. Escaping `<` keeps the
          // JSON from closing the script tag early.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }}
        />
        {children}
      </body>
    </html>
  );
}