'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink, Terminal } from 'lucide-react';
import { Background } from '@/components/background';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Reveal } from '@/components/reveal';
import { Section } from '@/components/section';
import { cn } from '@/lib/utils';

/* ---- Real data: mirrors packages/mcp/src/tools.ts exactly ---- */
const TOOLS: { name: string; desc: string; inputs: string; outputs: string }[] = [
  {
    name: 'arshield_encrypt_file',
    desc: 'Encrypt bytes under hybrid ML-KEM-768 + X25519 and sign the envelope with ML-DSA-65 (ArShield .arshield container). Sign with a keyfile, a wallet signature, or a fresh ephemeral identity.',
    inputs: 'data_base64, filename, keyfile_json?, passphrase?, signature_hex?, signature_hex_repeat?, address?',
    outputs: 'container_b64url',
  },
  {
    name: 'arshield_decrypt_file',
    desc: 'Decrypt an ArShield .arshield container (base64url). Verifies the ML-DSA-65 signature and returns the original file bytes and filename.',
    inputs: 'container_b64url, keyfile_json?, passphrase?, signature_hex?, signature_hex_repeat?, address?',
    outputs: 'filename, original_size, data_b64',
  },
  {
    name: 'arshield_send_message',
    desc: 'Wrap a short plaintext (max 64KB) into a shareable encrypted ArShield message URL. The ciphertext lives in the URL #fragment. With an ephemeral sender the secret key is embedded so the recipient can decrypt without setup.',
    inputs: 'text, keyfile_json?, passphrase?, signature_hex?, signature_hex_repeat?, address?',
    outputs: 'url, embed_secret_key',
  },
  {
    name: 'arshield_decrypt_message',
    desc: 'Read an ArShield encrypted message URL (like the /m page does). Returns the plaintext and the signer key that sealed it.',
    inputs: 'url, keyfile_json?, passphrase?, signature_hex?, signature_hex_repeat?, address?',
    outputs: 'text, signer_mlkem, signer_x25519, signer_mldsa',
  },
  {
    name: 'arshield_verify_seal',
    desc: 'Parse the metadata fields an ArShield Quantum Seal PNG carries (unsigned) and, given an envelope, compare its sha256 against file_hash.',
    inputs: 'seal_metadata_json, envelope_sha256?',
    outputs: 'fields, hash_matches_envelope',
  },
  {
    name: 'arshield_sign_x402',
    desc: 'Sign an x402 payment payload with ML-DSA-65 under context arshield-v1-x402. Returns the signature (base64url) the server can verify with the provided public key.',
    inputs: 'payload_base64, keyfile_json?, passphrase?, signature_hex?, signature_hex_repeat?, address?',
    outputs: 'signature_b64url, public_key_mldsa_b64url, verified',
  },
];

/**
 * Mirrors the published package. These drifted once already — the page announced
 * arshield-mcp@0.1.0 with a Node 20 floor while the registry had arshield-mcp
 * and a Node 18 floor — so keep this in step with packages/mcp/package.json.
 */
const META = [
  ['PACKAGE', 'arshield-mcp'],
  ['VERSION', '0.1.4'],
  ['TRANSPORT', 'stdio'],
  ['RUNTIME', 'Node.js 18+'],
  ['TOOLS', '6'],
  ['LICENSE', 'MIT'],
];

const CONFIGS = [
  {
    eyebrow: 'Claude Code',
    title: 'Terminal',
    code: 'claude mcp add arshield -- npx -y arshield-mcp',
    caption: 'One line adds the server to Claude Code over stdio.',
  },
  {
    eyebrow: 'Claude Desktop',
    title: 'claude_desktop_config.json',
    code: '{\n  "mcpServers": {\n    "arshield": {\n      "command": "npx",\n      "args": ["-y", "arshield-mcp"]\n    }\n  }\n}',
    caption: 'Drop this snippet into your config and restart the client.',
  },
  {
    eyebrow: 'Cursor',
    title: '~/.cursor/mcp.json',
    code: '{\n  "mcpServers": {\n    "arshield": {\n      "command": "npx",\n      "args": ["-y", "arshield-mcp"]\n    }\n  }\n}',
    caption: 'Same shape, same server.',
  },
  {
    eyebrow: 'Any MCP client',
    title: 'stdio command',
    code: 'command: npx\nargs: -y arshield-mcp',
    caption: 'Works with any client that speaks Model Context Protocol over stdio.',
  },
];

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#9aa3b2] transition-colors hover:border-brand-gold/40 hover:text-brand-gold"
      aria-label="Copy to clipboard"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {done ? 'Copied' : label}
    </button>
  );
}

export function McpClient() {
  return (
    <>
      <Background />
      <Header />
      <main className="relative">
        <Section
          eyebrow="MCP Server"
          title="Agents speak quantum-safe."
          subtitle="Six tools, one stdio server. Encrypt files, send PQ-safe messages, read Quantum Seals, and sign x402 payloads — all from Claude, Cursor, or any MCP-aware client."
        >
          <Reveal>
            <div className="panel mx-auto max-w-2xl p-6">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#5b6474]">Install</div>
              <p className="mb-4 text-[14px] leading-relaxed text-[#8a93a3]">
                Node.js 18 or later runs the server over stdio. Published as <span className="font-mono text-[13px] text-brand-gold">arshield-mcp</span> on npm.
              </p>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#03070f] px-4 py-3">
                <code className="font-mono text-sm text-brand-gold">$ npx -y arshield-mcp</code>
                <CopyBtn text="npx -y arshield-mcp" />
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {META.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">{k}</dt>
                    <dd className="mt-0.5 font-mono text-[13px] text-[#c7cdd8]">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <a
                  href="https://www.npmjs.com/package/arshield-mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-gold hover:text-[#e9c35f]"
                >
                  View on npm <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://github.com/arshield/arshield/tree/master/packages/mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#8a93a3] hover:text-[#c7cdd8]"
                >
                  Source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {CONFIGS.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.05}>
                <div className="panel h-full p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b6474]">{c.eyebrow}</div>
                    <CopyBtn text={c.code} />
                  </div>
                  <h3 className="mb-3 font-mono text-[13px] text-[#e6e9ef]">{c.title}</h3>
                  <pre className="overflow-x-auto whitespace-pre rounded-xl border border-white/[0.08] bg-[#03070f] px-3.5 py-3 font-mono text-[11.5px] leading-relaxed text-[#c7cdd8]">{c.code}</pre>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-[#8a93a3]">{c.caption}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section eyebrow="Tools" title="Six primitives.">
          <Reveal>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    {['TOOL', 'DESCRIPTION', 'INPUTS', 'OUTPUTS'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TOOLS.map((t, i) => (
                    <tr key={t.name} className={cn('align-top', i > 0 && 'border-t border-white/[0.06]')}>
                      <td className="px-4 py-4 font-mono text-[12px] text-brand-gold">{t.name}</td>
                      <td className="px-4 py-4 text-[13px] leading-relaxed text-[#8a93a3]">{t.desc}</td>
                      <td className="px-4 py-4 font-mono text-[11px] leading-relaxed text-[#c7cdd8]">{t.inputs}</td>
                      <td className="px-4 py-4 font-mono text-[11px] leading-relaxed text-[#7b8493]">{t.outputs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-3xl text-center text-[13px] leading-relaxed text-[#5b6474]">
              Every tool runs locally over stdio. No network I/O, no telemetry. Keyfiles are unwrapped
              in-process with Argon2id and never persisted. A wallet signature is root key material: pass it
              over local stdio only, never a networked transport.
            </p>
          </Reveal>
        </Section>

        <Section title="One identity, two doors.">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { t: 'Same envelope everywhere', b: 'Seal a file in /app, open it in your agent with the same keyfile or wallet signature. Identical keys, identical .arshield format.' },
              { t: 'Public key can be derived from the signature', b: 'arshield_sign_x402 returns public_key_mldsa_b64url alongside the signature, so a verifier can check which key signed without a separate exchange.' },
              { t: 'Runs on your machine', b: 'A local stdio server. No ArShield server, no network calls, no telemetry.' },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 0.06}>
                <div className="panel h-full p-5">
                  <Terminal className="mb-3 h-4.5 w-4.5 text-brand-gold" />
                  <h3 className="text-[14.5px] font-semibold text-[#e6e9ef]">{c.t}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#8a93a3]">{c.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          {/* Honest limits. A security tool that only lists what it does is
              less believable than one that says where it stops. */}
          <Reveal delay={0.12}>
            <div className="mx-auto mt-6 max-w-3xl">
              <div className="panel p-5">
                <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#5b6474]">
                  What it does not do
                </h3>
                <ul className="space-y-2.5 text-[13px] leading-relaxed text-[#8a93a3]">
                  <li className="flex gap-2.5">
                    <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-[#5b6474]" />
                    <span><span className="text-[#c7cdd8]">No key management.</span> Lose the keyfile or the passphrase and the data is gone. There is no recovery path and no backdoor.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-[#5b6474]" />
                    <span><span className="text-[#c7cdd8]">No metadata protection.</span> Filenames are encrypted, but container size reveals the approximate plaintext size.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-[#5b6474]" />
                    <span><span className="text-[#c7cdd8]">Not independently audited.</span> The cryptography follows the QSAFE-1 layout and the primitives are from audited libraries, but this release has not been through a third-party security review.</span>
                  </li>
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-8 text-center">
              <Link href="/docs/for-agents" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-gold hover:text-[#e9c35f]">
                Read the agent guide →
              </Link>
            </div>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}