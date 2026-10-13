'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';
import { Reveal } from '@/components/reveal';
import { parseMessageUrl, decryptFile } from '@/lib/arshield';

/**
 * Reads an encrypted message out of the URL fragment.
 * - 4 segments (self-decrypting): the ephemeral secret rides in the link, so it
 *   opens with no key input.
 * - 2 segments (recipient-only): needs a key file, which we prompt for.
 * Nothing is sent anywhere; the fragment never reaches a server.
 */
export function MessageReader() {
  const [state, setState] = useState<'idle' | 'reading' | 'needs-key' | 'done' | 'error'>('idle');
  const [plaintext, setPlaintext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyfileJson, setKeyfileJson] = useState('');
  const [passphrase, setPassphrase] = useState('');

  useEffect(() => {
    const read = async () => {
      const frag = window.location.hash.slice(1);
      if (!frag || !frag.startsWith('v1.')) return;
      setState('reading');
      try {
        const parsed = parseMessageUrl(window.location.href);
        if (parsed.ephemeralSecret) {
          const out = await decryptFile(parsed.blob, parsed.ephemeralSecret, parsed.signerPublic);
          setPlaintext(new TextDecoder().decode(out.fileBytes));
          setState('done');
        } else {
          setNeedsKey(true);
          setState('needs-key');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setState('error');
      }
    };
    void read();
  }, []);

  const openWithKeyfile = async () => {
    setError(null);
    try {
      const parsed = parseMessageUrl(window.location.href);
      const { unwrapKeyfile } = await import('@/lib/arshield');
      const kp = await unwrapKeyfile(JSON.parse(keyfileJson), passphrase);
      const out = await decryptFile(parsed.blob, kp.secretKey, parsed.signerPublic);
      setPlaintext(new TextDecoder().decode(out.fileBytes));
      setState('done');
    } catch {
      setError('Could not open. Wrong key file or passphrase.');
    }
  };

  if (state === 'idle') return null;

  return (
    <>
      <Background />
      <div className="relative min-h-screen">
        <header className="border-b border-white/[0.06] bg-[#020610]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="ArShield home"><Logo /></Link>
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#9aa3b2] hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <Reveal>
            <h1 className="text-center text-3xl font-bold leading-tight tracking-tight text-[#e6e9ef] sm:text-4xl">
              An encrypted message,
              <span className="text-gradient-gold mt-1 block">opened on your device.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="panel mt-10 p-6">
              {state === 'reading' && (
                <div className="flex items-center justify-center gap-2 py-10 text-[13.5px] text-[#8a93a3]">
                  <Lock className="h-4 w-4 animate-pulse text-brand-gold" />
                  Unsealing in your browser…
                </div>
              )}

              {state === 'needs-key' && (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-brand-gold" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5b6474]">
                      Recipient-only message
                    </span>
                  </div>
                  <p className="mb-4 text-[13.5px] leading-relaxed text-[#8a93a3]">
                    This message was sealed to a specific public key. Drop the matching key file (and its passphrase) to open it.
                  </p>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">Key file JSON</label>
                  <textarea
                    value={keyfileJson}
                    onChange={(e) => setKeyfileJson(e.target.value)}
                    rows={4}
                    placeholder='{"version":1,"kdf":...}'
                    className="w-full rounded-xl border border-white/10 bg-[#03070f] px-3.5 py-3 font-mono text-[11px] text-[#e6e9ef] outline-none focus:border-brand-gold/50"
                  />
                  <label className="mb-1.5 mt-3 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b6474]">Passphrase</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#03070f] px-3.5 py-3 text-[13px] text-[#e6e9ef] outline-none focus:border-brand-gold/50"
                  />
                  <button
                    onClick={openWithKeyfile}
                    disabled={!keyfileJson || !passphrase}
                    className="mt-4 w-full rounded-full bg-gold-gradient px-6 py-3 text-[14px] font-medium text-brand-ink shadow-gold-glow disabled:opacity-40"
                  >
                    Open message
                  </button>
                </div>
              )}

              {state === 'done' && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#6ee7a8]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6ee7a8]">
                      Signature verified
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-[#03070f] p-4 text-[14px] leading-relaxed text-[#e6e9ef]">
                    {plaintext}
                  </div>
                  <p className="mt-3 text-[11.5px] text-[#5b6474]">
                    Decrypted locally. The ciphertext never left your browser, and no server saw this text.
                  </p>
                </div>
              )}

              {state === 'error' && (
                <div className="flex items-start gap-3 py-4">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-none text-red-400" />
                  <div>
                    <div className="text-[14px] font-medium text-[#e6e9ef]">This link could not be opened</div>
                    <div className="mt-1 text-[12.5px] text-[#8a93a3]">{error}</div>
                  </div>
                </div>
              )}

              {needsKey && error && (
                <p className="mt-3 text-center text-[12.5px] text-red-400">{error}</p>
              )}
            </div>
          </Reveal>
        </main>
      </div>
    </>
  );
}
