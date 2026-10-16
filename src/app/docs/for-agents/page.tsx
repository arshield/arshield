import type { Metadata } from 'next';
import { DocsLayout, DocTitle, DocH2, DocP } from '@/components/layout-docs';

export const metadata: Metadata = {
  title: 'For Agents · ArShield Docs',
  description: 'The ArShield MCP server: install, configure, and use the six post-quantum tools.',
};

const TOOLS: [string, string][] = [
  ['arshield_encrypt_file', 'Encrypt bytes into a hybrid ML-KEM-768 + X25519 envelope, signed with ML-DSA-65.'],
  ['arshield_decrypt_file', 'Decrypt a .arshield container with a keyfile or wallet signature.'],
  ['arshield_send_message', 'Wrap text (max 64KB) in a shareable encrypted URL; the key rides in the fragment.'],
  ['arshield_decrypt_message', 'Recover plaintext + signer key from an ArShield message URL.'],
  ['arshield_verify_seal', 'Parse a Quantum Seal metadata blob and compare sha256 against file_hash.'],
  ['arshield_sign_x402', 'Sign an x402 payload with ML-DSA-65 under context arshield-v1-x402.'],
];

export default function ForAgentsPage() {
  return (
    <DocsLayout>
      <DocTitle eyebrow="Developers">For agents</DocTitle>
      <DocP>
        The same crypto core as the web app, exposed as a Model Context Protocol server over stdio.
        Everything runs locally — no network calls, no telemetry. The package is{' '}
        <span className="font-mono text-[13px] text-brand-gold">arshield-mcp</span> (v0.1.2).
      </DocP>

      <DocH2>Install</DocH2>
      <DocP>Requires Node.js 18 or later. Works with Claude Desktop, Claude Code, Cursor or any MCP client.</DocP>
      <div className="mb-4 whitespace-pre rounded-xl border border-white/[0.08] bg-[#03070f] px-4 py-3 font-mono text-[12.5px] text-[#c7cdd8]">{`{
  "mcpServers": {
    "arshield": {
      "command": "npx",
      "args": ["-y", "arshield-mcp"]
    }
  }
}`}</div>

      <DocH2>Tools</DocH2>
      <div className="mb-4 overflow-hidden rounded-xl border border-white/[0.08]">
        {TOOLS.map(([name, desc], i) => (
          <div key={name} className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}>
            <code className="shrink-0 font-mono text-[12px] text-brand-gold sm:w-56">{name}</code>
            <span className="text-[13.5px] text-[#8a93a3]">{desc}</span>
          </div>
        ))}
      </div>

      <DocH2>Key sources</DocH2>
      <DocP>
        Tools that sign or decrypt take one key source, mutually exclusive:{' '}
        <span className="font-mono text-[13px] text-[#c7cdd8]">keyfile_json</span> +{' '}
        <span className="font-mono text-[13px] text-[#c7cdd8]">passphrase</span>, or{' '}
        <span className="font-mono text-[13px] text-[#c7cdd8]">signature_hex</span> +{' '}
        <span className="font-mono text-[13px] text-[#c7cdd8]">address</span> (with optional{' '}
        <span className="font-mono text-[13px] text-[#c7cdd8]">signature_hex_repeat</span>). A keyfile without
        its passphrase, or a signature without its address, returns an error. When every signer field is
        omitted, encrypting tools sign with a fresh ephemeral identity.
      </DocP>
      <DocP>
        The wallet path signs the ArShield derivation message (domain{' '}
        <span className="font-mono text-[13px] text-[#c7cdd8]">arc-shield.xyz</span>) with EIP-191{' '}
        <span className="font-mono text-[13px] text-[#c7cdd8]">personal_sign</span>; that 65-byte signature is
        the key material. It is root material — pass it over local stdio only, never a networked transport.
      </DocP>

      <DocH2>x402 signing</DocH2>
      <DocP>
        <span className="font-mono text-[13px] text-[#c7cdd8]">arshield_sign_x402</span> takes a base64 payload
        and returns a detached ML-DSA-65 signature under context{' '}
        <span className="font-mono text-[13px] text-[#c7cdd8]">arshield-v1-x402</span>, plus the signing
        public key (<span className="font-mono text-[13px] text-[#c7cdd8]">public_key_mldsa_b64url</span>) and a
        self-check flag, so a verifier can confirm which key signed.
      </DocP>
    </DocsLayout>
  );
}