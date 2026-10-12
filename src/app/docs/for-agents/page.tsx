import type { Metadata } from 'next';
import { DocsLayout, DocTitle, DocH2, DocP } from '@/components/layout-docs';

export const metadata: Metadata = {
  title: 'For Agents · QuantSafe Docs',
  description: 'The QuantSafe MCP server: install, configure, and use the six post-quantum tools.',
};

const TOOLS: [string, string][] = [
  ['qsafe_encrypt_file', 'Encrypt bytes under ML-KEM-768 + X25519 + ML-DSA-65.'],
  ['qsafe_decrypt_file', 'Decrypt a .qsafe blob with a keyfile or wallet signature.'],
  ['qsafe_send_message', 'Wrap text in a shareable encrypted URL, optionally signed by your wallet.'],
  ['qsafe_decrypt_message', 'Recover plaintext + signer from a QuantSafe message URL.'],
  ['qsafe_verify_seal', 'Read the unsigned fields of a Quantum Seal PNG and compare SHA-256.'],
  ['qsafe_sign_x402', 'Sign an x402 payload with ML-DSA-65 under context qsafe-v1-x402.'],
];

export default function ForAgentsPage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Developers">For agents</DocTitle>
      <DocP>
        The same crypto core as the web app, exposed as a Model Context Protocol server over stdio.
        Everything runs locally — no network calls, no telemetry.
      </DocP>

      <DocH2>Install</DocH2>
      <DocP>Claude Desktop, Claude Code, Cursor or any MCP client. Requires Node.js 20+.</DocP>
      <div className="mb-4 whitespace-pre rounded-xl border border-white/[0.08] bg-[#03070f] px-4 py-3 font-mono text-[12.5px] text-[#c7cdd8]">{`{
  "mcpServers": {
    "qsafe": {
      "command": "npx",
      "args": ["-y", "@quantsafe/mcp"]
    }
  }
}`}</div>

      <DocH2>Tools</DocH2>
      <div className="mb-4 overflow-hidden rounded-xl border border-white/[0.08]">
        {TOOLS.map(([name, desc], i) => (
          <div key={name} className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}>
            <code className="shrink-0 font-mono text-[12px] text-brand-gold sm:w-52">{name}</code>
            <span className="text-[13.5px] text-[#8a93a3]">{desc}</span>
          </div>
        ))}
      </div>

      <DocH2>Key sources</DocH2>
      <DocP>
        A tool that signs or decrypts takes one key source: a passphrase-protected key file
        (keyfile_path, read from disk, or keyfile_json, plus its passphrase), or signature_hex plus the
        address that made it: your EOA wallet&apos;s 65-byte signature of the QuantSafe derivation message,
        passed only over local stdio. A keyfile without its passphrase — or a signature without its
        address — returns an error. When every signer field is omitted, encrypting tools sign with a fresh
        ephemeral identity.
      </DocP>
      <DocP>
        The MCP server signs one fixed derivation message; that signature is root key material. Pass it
        over local stdio only, never a networked transport.
      </DocP>
    </DocsLayout>
  );
}