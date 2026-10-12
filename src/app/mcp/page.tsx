'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { Background } from '@/components/background';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Section } from '@/components/section';
import { Reveal } from '@/components/reveal';
import { Eyebrow } from '@/components/button';
import { cn } from '@/lib/utils';

type Meta = { label: string; value: string };

const META: Meta[] = [
  { label: 'PACKAGE', value: '@arshield/mcp' },
  { label: 'VERSION', value: '0.1.1' },
  { label: 'TRANSPORT', value: 'stdio' },
  { label: 'RUNTIME', value: 'Node.js 20+' },
  { label: 'TOOLS', value: '6' },
  { label: 'LICENSE', value: 'MIT' },
];

type Tool = {
  name: string;
  description: string;
  inputs: string;
  outputs: string;
};

const TOOLS: Tool[] = [
  {
    name: 'arshield_encrypt_file',
    description: 'Encrypt bytes under ML-KEM-768 + X25519 + ML-DSA-65.',
    inputs: 'bytes_base64, recipient_pubkey_base64, signer?: keyfile | signature + address',
    outputs: 'blob_base64, seal_png_base64, signer_pubkey_base64',
  },
  {
    name: 'arshield_decrypt_file',
    description: 'Decrypt a .arshield blob with a keyfile or wallet signature.',
    inputs:
      'blob_base64, (keyfile_path or keyfile_json + passphrase | signature_hex + address), expected_signer_pubkey_base64 (required unless self-signed)',
    outputs: 'plaintext_base64, signer_pubkey_base64, filename',
  },
  {
    name: 'arshield_send_message',
    description: 'Wrap text in a shareable encrypted URL, optionally signed by your wallet.',
    inputs: 'text, recipient_pubkey_base64?, signer?: keyfile | signature + address',
    outputs: 'url, mode',
  },
  {
    name: 'arshield_decrypt_message',
    description: 'Recover plaintext + signer from a ArShield message URL.',
    inputs:
      'url, (keyfile_path or keyfile_json + passphrase | signature_hex + address)?, expected_signer_pubkey_base64?',
    outputs: 'text, signer_pubkey_base64',
  },
  {
    name: 'arshield_verify_seal',
    description:
      'Read the unsigned fields of a Quantum Seal PNG. Given the envelope, check that its SHA-256 matches the Seal file_hash.',
    inputs: 'png_base64, blob_base64?',
    outputs:
      'valid, metadata { version, timestamp, algo, file_hash, wallet?, x402?, anchor? }, file_hash_matches?',
  },
  {
    name: 'arshield_sign_x402',
    description: 'Sign an x402 payload with ML-DSA-65 under context arshield-v1-x402.',
    inputs:
      'payload_json (JSON object), (keyfile_path or keyfile_json + passphrase | signature_hex + address)',
    outputs: 'signature_base64, signer_pubkey_base64',
  },
];

const CONFIG_CARDS = [
  {
    eyebrow: 'CLAUDE CODE',
    title: 'Terminal',
    code: 'claude mcp add arshield -- npx -y @arshield/mcp',
    caption: 'One line adds the server to Claude Code over stdio.',
  },
  {
    eyebrow: 'CLAUDE DESKTOP',
    title: 'claude_desktop_config.json',
    code: '{"mcpServers":{"arshield":{"command":"npx","args":["-y","@arshield/mcp"]}}}',
    caption:
      'Drop this snippet into your config and restart the client. ArShield tools appear in the tools picker.',
  },
  {
    eyebrow: 'CURSOR',
    title: '~/.cursor/mcp.json',
    code: '{"mcpServers":{"arshield":{"command":"npx","args":["-y","@arshield/mcp"]}}}',
    caption: 'Same shape, same server.',
  },
  {
    eyebrow: 'ANY MCP CLIENT',
    title: 'stdio command',
    code: 'command: npx\nargs: -y @arshield/mcp',
    caption: 'Works with any client that speaks Model Context Protocol over stdio.',
  },
];

const KEYFILE_CODE = `{
  "mcpServers": {
    "arshield": {
      "command": "npx",
      "args": ["-y", "@arshield/mcp"],
      "env": {
        "ARSHIELD_KEYFILE": "/home/you/.arshield/agent.key.json",
        "ARSHIELD_KEYFILE_PASSPHRASE": "${'${ARSHIELD_KEYFILE_PASSPHRASE}'}"
      }
    }
  }
}

// arshield_encrypt_file
{
  "bytes_base64": "<base64 file bytes>",
  "recipient_pubkey_base64": "<recipient ML-KEM pubkey>",
  "signer": { "keyfile_path": "/home/you/.arshield/agent.key.json" }
}`;

const X402_CODE = `payload_json:
{
  "scheme": "exact",
  "network": "robinhood",
  "asset": "0x...",
  "amount": "1000000",
  "payTo": "0x...",
  "nonce": "0x...",
  "validUntil": 1900000000
}

// signed over the canonical JSON of payload_json,
// context string "arshield-v1-x402", ML-DSA-65
signature_base64: "<detached signature>"`;

const WALLET_CODE = `import { privateKeyToAccount } from 'viem/accounts';

const ARSHIELD_SIGN_MESSAGE = [
  'ArShield keypair derivation v1',
  '',
  'This signature derives your personal post-quantum encryption keypair.',
  'It grants no permissions and costs no gas.',
  '',
  'Domain: arc-shield.xyz',
].join('\\n');

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);
const signature = await account.signMessage({ message: ARSHIELD_SIGN_MESSAGE });

// Then pass it to the server over local stdio:
// arshield_decrypt_file {
//   blob_base64, address: account.address,
//   signature_hex: signature, expected_signer_pubkey_base64
// }`;

function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`${label} to clipboard`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-[#9aa3b2] transition-colors hover:border-brand-gold/40 hover:text-brand-gold',
        copied && 'border-brand-gold/40 text-brand-gold',
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function CodeBlock({ code, showCopy = false }: { code: string; showCopy?: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#03070f]">
      <div className="flex items-start justify-between gap-3 p-4">
        <pre className="no-scrollbar min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[12.5px] leading-relaxed text-[#c9d1dc]">
          <code>{code}</code>
        </pre>
        {showCopy && <CopyButton value={code} className="shrink-0" />}
      </div>
    </div>
  );
}

export default function McpPage() {
  return (
    <>
      <Background />
      <Header />
      <main className="relative">
        {/* Hero */}
        <section className="relative pt-20 pb-4 sm:pt-24">
          <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
            <div className="mb-5 flex justify-center">
              <Eyebrow>MCP SERVER</Eyebrow>
            </div>
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-[1.1] tracking-tight text-[#e6e9ef] sm:text-5xl">
              Agents speak <span className="text-gradient-gold">quantum-safe.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-[15px] leading-relaxed text-[#8a93a3]">
              Six tools, one stdio server. Encrypt files, send PQ-safe messages, read Quantum Seals, and
              sign x402 payloads: all from Claude, Cursor, or any MCP-aware client.
            </p>
          </div>
        </section>

        {/* INSTALL */}
        <Section
          eyebrow="INSTALL"
          title="One command."
          subtitle="Node.js 20 or later runs the server over stdio. It is published as @arshield/mcp, under the @arshield scope that only ArShield can publish to."
        >
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <div className="panel p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <pre className="no-scrollbar overflow-x-auto whitespace-pre font-mono text-[13.5px] text-[#e6e9ef]">
                    <code>
                      <span className="mr-2 select-none text-brand-gold">$</span>
                      npx -y @arshield/mcp
                    </code>
                  </pre>
                  <CopyButton value="npx -y @arshield/mcp" className="shrink-0 self-start sm:self-auto" />
                </div>
              </div>

              {/* Metadata grid */}
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] sm:grid-cols-3">
                {META.map((m) => (
                  <div key={m.label} className="bg-[#060c18] px-4 py-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">
                      {m.label}
                    </div>
                    <div className="mt-1 font-mono text-[12.5px] text-[#e6e9ef]">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 text-center">
                <Link
                  href="https://www.npmjs.com/package/@arshield/mcp"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand-gold transition-colors hover:text-[#e9c35f]"
                >
                  View on npm
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Config cards */}
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {CONFIG_CARDS.map((c, i) => (
              <Reveal key={c.eyebrow} delay={0.05 * i}>
                <div className="panel flex h-full flex-col p-5 sm:p-6">
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-gold">
                      {c.eyebrow}
                    </div>
                    <h3 className="mt-1.5 font-mono text-[14px] font-semibold text-[#e6e9ef]">{c.title}</h3>
                  </div>
                  <CodeBlock code={c.code} showCopy />
                  <p className="mt-4 text-[12.5px] leading-relaxed text-[#8a93a3]">{c.caption}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* TOOLS */}
        <Section eyebrow="TOOLS" title="Six primitives.">
          <Reveal>
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                      {['TOOL', 'DESCRIPTION', 'INPUTS', 'OUTPUTS'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TOOLS.map((t) => (
                      <tr key={t.name} className="border-b border-white/[0.06] last:border-0 align-top">
                        <td className="px-4 py-4 font-mono text-[12.5px] font-medium text-brand-gold">
                          {t.name}
                        </td>
                        <td className="px-4 py-4 text-[12.5px] leading-relaxed text-[#e6e9ef]">
                          {t.description}
                        </td>
                        <td className="px-4 py-4 font-mono text-[11.5px] leading-relaxed text-[#8a93a3]">
                          {t.inputs}
                        </td>
                        <td className="px-4 py-4 font-mono text-[11.5px] leading-relaxed text-[#8a93a3]">
                          {t.outputs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="mx-auto mt-6 max-w-3xl text-[12.5px] leading-relaxed text-[#7b8493]">
              Every tool runs locally over stdio. No network I/O. No telemetry. Keyfiles are unwrapped
              in-process with Argon2id and never persisted. Pass keyfile_path and the server reads the key
              file from disk, so it never enters the conversation; its passphrase still does. A wallet
              signature is root key material: pass it over local stdio only, never a networked transport.
            </p>
          </Reveal>
        </Section>

        {/* A — keyfile */}
        <Section title="Your agent's key stays on disk.">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <p className="text-[14.5px] leading-relaxed text-[#8a93a3]">
                Give your agent a key file from /app: random post-quantum keys, never derived from a wallet
                signature. Pass its path as keyfile_path and the server reads it from disk, so the key file
                never enters the conversation. The passphrase still does: your agent host and its model hold
                the passphrase, not the key file. A path to anything that is not a key file is refused, and
                the error never quotes the file.
              </p>
              <div className="mt-5">
                <CodeBlock code={KEYFILE_CODE} showCopy />
              </div>
            </div>
          </Reveal>
        </Section>

        {/* B — x402 */}
        <Section title="What arshield_sign_x402 signs.">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <p className="text-[14.5px] leading-relaxed text-[#8a93a3]">
                arshield_sign_x402 produces a detached ML-DSA-65 signature under the context string
                <span className="mx-1 font-mono text-[13px] text-[#e6e9ef]">arshield-v1-x402</span>. The signed
                bytes are the canonical JSON encoding of the payload_json object you pass in: the scheme,
                network, asset, amount, payTo, nonce and validity fields exactly as serialized, with keys in
                sorted order and no extra whitespace. Nothing outside that object is covered, and the
                signature travels alongside the payload so a recipient can rebuild the same canonical bytes
                and verify against your signer_pubkey_base64 before settling the receipt.
              </p>
              <div className="mt-5">
                <CodeBlock code={X402_CODE} showCopy />
              </div>
            </div>
          </Reveal>
        </Section>

        {/* C — wallet */}
        <Section title="Your wallet is the key.">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <p className="text-[14.5px] leading-relaxed text-[#8a93a3]">
                An agent signs one fixed message with its EOA wallet and derives the same hybrid keypair the
                browser does. Encrypt at /app, decrypt from the agent: no keyfile export, no copied secrets.
                Same wallet, same keys, same files, as long as the wallet signs deterministically. EOA only:
                smart-contract wallets are rejected at derivation. MPC and threshold signers return a
                different signature every time; the browser catches them by asking for two signatures the
                first time an address derives keys on a device. The server runs the same check when you pass
                a second signature as signature_hex_repeat the first time you use a wallet, and it refuses a
                signature that does not recover to the address you name. Sign the ArShield message only in
                your own agent or on arc-shield.xyz: anyone who gets the signature can open your files. For
                a durable copy, /app wraps the same keypair as a passphrase-protected keyfile (Back up
                keys). A wallet-derived identity rests on the wallet&apos;s curve: for anything that must
                outlast it, use a generated key file.
              </p>
              <div className="mt-5">
                <CodeBlock code={WALLET_CODE} showCopy />
              </div>
            </div>
          </Reveal>
        </Section>
      </main>
      <Footer />
    </>
  );
}
