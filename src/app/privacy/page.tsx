import type { Metadata } from 'next';
import { Background } from '@/components/background';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy · ArShield',
  description: 'ArShield Privacy Policy.',
};

const NOT_COLLECTED = [
  'File contents or filenames',
  'Encryption keys, key files or passphrases',
  'Wallet signatures',
  'Message plaintext',
  'Personal information',
];

export default function PrivacyPage() {
  return (
    <>
      <Background />
      <div className="relative min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-gold">Legal</div>
          <h1 className="text-3xl font-bold tracking-tight text-[#e6e9ef]">Privacy Policy</h1>
          <p className="mt-2 text-[13px] text-[#5b6474]">Last updated: October 2026</p>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="text-[16px] font-semibold text-[#e6e9ef]">The short version</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#8a93a3]">
                ArShield is built so that we cannot see your data even if we wanted to. Encryption and
                decryption happen in your browser. Files, keys, and message plaintext never reach us.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-[#e6e9ef]">What we do not collect</h2>
              <ul className="mt-3 space-y-2">
                {NOT_COLLECTED.map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-[14.5px] text-[#8a93a3]">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-brand-gold" />
                    {x}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-[#e6e9ef]">Stored in your browser</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#8a93a3]">
                A few small records live in your browser&apos;s local storage and never leave your device:
                today&apos;s count of file encryptions, used for the tier limit; for each wallet address that
                passed the first-use signing check on this device, a flag saying so; and the wallet connection
                the wallet library keeps so it can reconnect. No signature and no key is ever stored. Clearing
                this site&apos;s data removes them all.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-[#e6e9ef]">Analytics</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#8a93a3]">
                We do not run third-party analytics or advertising trackers, and we set no cookies.
                Our hosting provider may keep standard, aggregate request logs (IP address, path,
                timestamp) for security and abuse prevention. Wallet addresses are never part of
                those logs.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-[#e6e9ef]">Blockchain reads</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#8a93a3]">
                Once the $arshield token is live, connecting a wallet makes the app read your token balance via a
                ARC RPC endpoint to determine your tier. This read is unauthenticated and is
                identical to querying any block explorer: the RPC endpoint sees the address it is asked about.
                No wallet address is stored by us. Pages you visit without connecting a wallet or submitting a
                Seal send nothing to the chain.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-[#e6e9ef]">Third-party services</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#8a93a3]">
                Our site is served by Vercel. See{' '}
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">
                  Vercel&apos;s Privacy Policy
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-[#e6e9ef]">Changes</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#8a93a3]">We may update this policy.</p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-[#e6e9ef]">Contact</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#8a93a3]">
                Questions about privacy, or a security report:{' '}
                <a href="mailto:hello@arc-shield.xyz" className="text-brand-gold hover:underline">hello@arc-shield.xyz</a>
              </p>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}