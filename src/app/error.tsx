'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/button';
import { Background } from '@/components/background';
import { Logo } from '@/components/header';

/**
 * Error boundary.
 *
 * Without this, an uncaught render error blanks the page — the user sees a
 * white screen and has no idea whether the app broke or their browser did. This
 * keeps the shell, says what happened in plain language, and gives one action
 * that has a real chance of fixing it.
 *
 * The message is shown, not swallowed: people do report bugs, and the actual
 * error is the difference between a useful report and "it doesn't work".
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel/CF logs are not available client-side; the console is the only
    // place this surfaces in a static export.
    console.error('[arshield] render error', error);
  }, [error]);

  return (
    <>
      <Background />
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="as-dialog-in w-full max-w-lg">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/25 bg-red-500/[0.08]">
                <AlertTriangle className="h-4.5 w-4.5 text-red-300" />
              </span>
              <div>
                <h1 className="text-[16px] font-semibold text-[#eef1f6]">Something broke on this screen</h1>
                <p className="mt-0.5 text-[13px] text-[#8f98a8]">
                  Your keys and sealed files are untouched — this is a display fault, not data loss.
                </p>
              </div>
            </div>

            {error.message && (
              <pre className="mt-5 max-h-32 overflow-auto rounded-xl border border-white/[0.08] bg-[#03070f] px-3.5 py-3 font-mono text-[11.5px] leading-relaxed text-[#9ba4b3]">
                {error.message}
                {error.digest ? `\n\ndigest: ${error.digest}` : ''}
              </pre>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button variant="primary" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Try again
              </Button>
              <Button variant="ghost" onClick={() => { window.location.href = '/'; }}>
                Back to home
              </Button>
            </div>

            <p className="mt-5 text-[12.5px] leading-relaxed text-[#7a8494]">
              If it keeps happening, the error text above is what to send us — it names the actual
              fault, which is worth more than a description of it.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
