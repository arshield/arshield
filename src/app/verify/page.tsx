import type { Metadata } from 'next';
import { Background } from '@/components/background';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Section } from '@/components/section';
import { Reveal } from '@/components/reveal';
import { Eyebrow } from '@/components/button';
import { SealDropzone } from '@/components/seal-dropzone';

export const metadata: Metadata = {
  title: 'QuantSafe | Post-Quantum Security Infrastructure on Robinhood Chain',
  description: 'Verify a Quantum Seal: read its unsigned metadata fields and cross-check the file hash.',
};

const FIELDS = [
  {
    label: 'version',
    body: 'The Seal format version. It tells you which field set to expect when you read the rest.',
  },
  {
    label: 'timestamp',
    body: 'When the envelope was sealed, written at encrypt time on the device that made it.',
  },
  {
    label: 'algo',
    body: 'The hybrid algorithms the envelope used: ML-KEM-768 + X25519 for the KEM, ML-DSA-65 for the signature.',
  },
  {
    label: 'file_hash',
    body: 'SHA-256 of the .qsafe envelope this Seal belongs to. Match it against the envelope to confirm nothing changed.',
  },
  {
    label: 'wallet',
    body: 'Present when a wallet signed the envelope. It names the address the signature recovers to.',
  },
  {
    label: 'x402',
    body: 'Present when the envelope carries an x402 receipt, so a payment and its payload stay bound together.',
  },
  {
    label: 'anchor',
    body: 'Present when the Seal has been anchored: a durable, tamper-evident reference to the sealed record.',
  },
];

const STEPS = [
  {
    title: 'Read the Seal',
    body: 'Open the PNG. Its unsigned metadata fields are plain to read: version, timestamp, algorithm, file hash, and any wallet, x402 or anchor reference.',
  },
  {
    title: 'Match the hash',
    body: 'Hash the .qsafe envelope the Seal describes and compare it to the Seal’s file_hash. A mismatch means the file changed after it was sealed.',
  },
  {
    title: 'Confirm the signer',
    body: 'Check the signature against the signer’s public key. The Seal names the wallet; the signature proves the envelope came from it.',
  },
];

export default function VerifyPage() {
  return (
    <>
      <Background />
      <Header />
      <main className="relative">
        {/* Hero */}
        <section className="relative pt-20 pb-4 sm:pt-24">
          <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
            <div className="mb-5 flex justify-center">
              <Eyebrow>VERIFY SEAL</Eyebrow>
            </div>
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-[1.1] tracking-tight text-[#e6e9ef] sm:text-5xl">
              Read a Quantum Seal <span className="text-gradient-gold">without trusting the sender.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-[15px] leading-relaxed text-[#8a93a3]">
              Drop a Seal PNG to read its unsigned fields and check its file hash. Everything happens in
              your browser: the file never leaves your device.
            </p>
          </div>
        </section>

        {/* Dropzone */}
        <Section>
          <Reveal>
            <SealDropzone />
          </Reveal>
        </Section>

        {/* How it works */}
        <Section
          eyebrow="HOW IT WORKS"
          title="Three checks, all local."
          subtitle="A Quantum Seal is a PNG that carries the facts about an envelope. Verification is reading those facts and confirming they hold."
        >
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={0.05 * i}>
                <div className="panel h-full p-5 sm:p-6">
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl border border-brand-gold/25 bg-brand-gold/[0.06] font-mono text-[13px] font-semibold text-brand-gold">
                    {i + 1}
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#e6e9ef]">{s.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#8a93a3]">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Fields */}
        <Section
          eyebrow="FIELDS"
          title="What a Seal states."
          subtitle="Every field is unsigned metadata: it is a description of the envelope, not a claim the Seal proves on its own."
        >
          <Reveal>
            <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-white/[0.08]">
              {FIELDS.map((f, i) => (
                <div
                  key={f.label}
                  className={`grid gap-2 px-4 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6 ${
                    i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                  }`}
                >
                  <div className="font-mono text-[12.5px] font-medium text-brand-gold">{f.label}</div>
                  <div className="text-[12.5px] leading-relaxed text-[#8a93a3]">{f.body}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="mx-auto mt-6 max-w-3xl text-[12.5px] leading-relaxed text-[#7b8493]">
              The Seal itself is unsigned. Its value comes from what it lets you check: the file_hash
              against the envelope, and the wallet against the signature. Anchoring adds a durable
              reference so the record can be checked again later.
            </p>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}
