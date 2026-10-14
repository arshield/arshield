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

export const metadata: Metadata = {
  title: 'ArShield | Post-Quantum Security Infrastructure on ARC',
  description:
    'The post-quantum layer for data, messages and agents. Hybrid ML-KEM-768 + X25519 encryption, ML-DSA-65 signatures, zero backend. Built for ARC.',
  metadataBase: new URL('https://arc-shield.xyz'),
  openGraph: {
    title: 'The post-quantum layer for data, messages and agents.',
    description:
      'ArShield seals it post-quantum, on your device. Your agents too. ML-KEM-768 + X25519 hybrid, ML-DSA-65 signed, MCP-native, built for ARC.',
    url: 'https://arc-shield.xyz',
    siteName: 'ArShield',
    type: 'website',
    images: ['/seo/opengraph-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The post-quantum layer for data, messages and agents.',
    description:
      'ArShield seals it post-quantum, on your device. Your agents too. ML-KEM-768 + X25519 hybrid, ML-DSA-65 signed, MCP-native.',
    images: ['/seo/twitter-image.png'],
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}