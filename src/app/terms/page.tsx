import type { Metadata } from 'next';
import { Background } from '@/components/background';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Terms of Service · QuantSafe',
  description: 'QuantSafe Terms of Service.',
};

const SECTIONS: [string, string][] = [
  ['1. Acceptance', 'These Terms govern your access to and use of QuantSafe, a post-quantum encryption tool available at quantsafe.tech, including its web application and MCP server. By using QuantSafe you agree to these Terms.'],
  ['2. What QuantSafe is', 'QuantSafe is a client-side encryption tool. All cryptographic operations run entirely in your browser. No file content, key material, or personal data is ever transmitted to our servers: because we have no servers that process your data.'],
  ['3. Your keys, your responsibility', 'You are responsible for the security of your wallet, key file and passphrase. QuantSafe cannot recover them, and cannot decrypt your files. You must not use the Service where prohibited by law.'],
  ['4. Beta software', 'QuantSafe is pre-launch software. Features may change, break, or be withdrawn. Do not rely on it as the sole copy of anything irreplaceable.'],
  ['5. Prohibited use', 'Do not use the Service to violate any law, to infringe the rights of others, or to interfere with the Service or its users.'],
  ['6. Limitation of liability', 'The Service is provided "as is", without warranty of any kind. To the fullest extent permitted by law, QuantSafe is not liable for any loss of data, keys, or funds arising from your use of the Service.'],
  ['7. Changes', 'We may update these Terms. Continued use after a change constitutes acceptance of the revised Terms.'],
  ['8. Contact', 'Questions about these Terms: hello@quantsafe.tech'],
];

export default function TermsPage() {
  return (
    <>
      <Background />
      <div className="relative min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-gold">Legal</div>
          <h1 className="text-3xl font-bold tracking-tight text-[#e6e9ef]">Terms of Service</h1>
          <p className="mt-2 text-[13px] text-[#5b6474]">Last updated: October 2026</p>
          <div className="mt-10 space-y-8">
            {SECTIONS.map(([h, p]) => (
              <section key={h}>
                <h2 className="text-[16px] font-semibold text-[#e6e9ef]">{h}</h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#8a93a3]">{p}</p>
              </section>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}