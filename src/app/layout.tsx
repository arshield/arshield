import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/geist-sans.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/geist-mono.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
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
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}