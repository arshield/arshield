'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, Loader2, Lock, MessageSquare } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
import { Button } from '@/components/button';
import { Reveal } from '@/components/reveal';
import { encryptFile, buildMessageUrl, ephemeralIdentity } from '@/lib/qsafe';
import { cn } from '@/lib/utils';

const MAX = 65536;

export function MessageComposer() {
  const [text, setText] = useState('');
  const [recipient, setRecipient] = useState<'anyone' | 'specific'>('anyone');
  const [recipientKey, setRecipientKey] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const build = async () => {
    setErr(null); setBusy(true);
    try {
      const id = ephemeralIdentity();
      const bytes = new TextEncoder().encode(text.slice(0, MAX));
      const blob = await encryptFile(bytes, 'message.txt', id.publicKey, id.secretKey);
      const u = buildMessageUrl(blob, id.publicKey, { sk: id.secretKey, pk: id.publicKey });
      setUrl(u);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <>
      <Background />
      <div className="relative min-h-screen">
        <header className="border-b border-white/[0.06] bg-[#020610]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="QuantSafe home"><Logo /></Link>
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#9aa3b2] hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <Reveal>
            <h1 className="text-center text-3xl font-bold leading-tight tracking-tight text-[#e6e9ef] sm:text-4xl">
              Quantum-safe messages,
              <span className="text-gradient-gold mt-1 block">one URL away.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="panel mt-10 p-6">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand-gold" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5b6474]">Compose</span>
              </div>

              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">Message</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                rows={5}
                placeholder="Write something that only the holder of the link can read…"
                className="w-full rounded-xl border border-white/10 bg-[#03070f] px-3.5 py-3 text-[13.5px] text-[#e6e9ef] outline-none focus:border-brand-gold/50"
              />
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#5b6474]">
                <span>Encrypted bytes live in the URL fragment, never sent to a server.</span>
                <span className="font-mono">{text.length} / {MAX} B</span>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">Recipient</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    { id: 'anyone', label: 'Anyone with link', desc: 'Self-decrypting · the link carries the key' },
                    { id: 'specific', label: 'Specific recipient', desc: 'Paste their QuantSafe public key' },
                  ] as const).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setRecipient(o.id)}
                      className={cn(
                        'rounded-xl border p-3.5 text-left transition-colors',
                        recipient === o.id ? 'border-brand-gold/50 bg-brand-gold/[0.06]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('grid h-4 w-4 place-items-center rounded-full border', recipient === o.id ? 'border-brand-gold' : 'border-white/20')}>
                          {recipient === o.id && <span className="h-2 w-2 rounded-full bg-brand-gold" />}
                        </span>
                        <span className="text-[13px] font-medium text-[#e6e9ef]">{o.label}</span>
                      </div>
                      <div className="mt-1.5 text-[11.5px] leading-snug text-[#7b8493]">{o.desc}</div>
                    </button>
                  ))}
                </div>
                {recipient === 'specific' && (
                  <input
                    value={recipientKey}
                    onChange={(e) => setRecipientKey(e.target.value)}
                    placeholder="recipient public key (base64url)"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#03070f] px-3 py-2.5 text-[12px] font-mono text-[#e6e9ef] outline-none focus:border-brand-gold/50"
                  />
                )}
              </div>

              <Button variant="primary" className="mt-5 w-full" onClick={build} disabled={busy || !text} size="lg">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Encrypt and build link
              </Button>

              {err && <p className="mt-3 text-center text-[12.5px] text-red-400">{err}</p>}

              {url && (
                <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#03070f] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                      <Check className="h-3.5 w-3.5" /> Message URL ready
                    </span>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#9aa3b2] hover:text-brand-gold"
                    >
                      <Copy className="h-3 w-3" />{copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="max-h-28 overflow-y-auto break-all font-mono text-[10.5px] text-[#8a93a3]">{url}</div>
                  <p className="mt-2 text-[11px] text-[#5b6474]">
                    Share this link. It decrypts itself in the browser — the key rides in the fragment.
                  </p>
                </div>
              )}
            </div>
          </Reveal>
        </main>
      </div>
    </>
  );
}