import type { Metadata } from 'next';
import Link from 'next/link';
import { DocsLayout, DocTitle, DocH2, DocP } from '@/components/layout-docs';

export const metadata: Metadata = {
  title: 'Getting Started · ArShield Docs',
  description: 'Encrypt your first file with ArShield in under a minute. No accounts, no uploads.',
};

export default function GettingStartedPage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Guide">Getting started</DocTitle>
      <DocH2>1 · Encrypt a file in the browser</DocH2>
      <ol className="mb-4 list-inside list-decimal space-y-2 text-[14.5px] leading-relaxed text-[#8a93a3]">
        <li>Open <Link href="/app" className="text-brand-gold hover:underline">arc-shield.xyz/app</Link>.</li>
        <li>Pick a key source: connect a wallet and sign, or generate/load a key file with a passphrase.</li>
        <li>Drop a file and click <span className="font-mono text-[13px] text-[#c7cdd8]">Encrypt → .arshield</span>.</li>
        <li>Download the sealed envelope and its Quantum Seal. Nothing was uploaded.</li>
      </ol>
      <DocH2>2 · Open a file</DocH2>
      <ol className="mb-4 list-inside list-decimal space-y-2 text-[14.5px] leading-relaxed text-[#8a93a3]">
        <li>Drop the <span className="font-mono text-[13px] text-[#c7cdd8]">.arshield</span> envelope into the app.</li>
        <li>Unlock the same key source (same wallet signature or same key file).</li>
        <li>Click Decrypt — the ML-DSA-65 signature is verified before a single byte is decrypted.</li>
      </ol>
      <DocH2>3 · Back up your keys</DocH2>
      <DocP>
        A wallet-derived keypair can be reproduced from the wallet signature alone, so the working
        backup of a wallet path is the wallet itself. If you would rather not depend on the wallet
        curve, generate a passphrase-protected key file from the key-source screen instead: it holds
        random keys that never touch your wallet&apos;s signature, and it opens your files on its own.
        Lose both the wallet and the key file, and the files are unrecoverable — that is the point.
      </DocP>
      <DocH2>4 · Use it from an agent</DocH2>
      <DocP>Install the MCP server and give your agent the same wallet signature or key file:</DocP>
      <div className="rounded-xl border border-white/[0.08] bg-[#03070f] px-4 py-3 font-mono text-[13px] text-brand-gold">
        npx -y arshield-mcp
      </div>
    </DocsLayout>
  );
}