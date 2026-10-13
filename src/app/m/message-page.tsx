'use client';

import { useEffect, useState } from 'react';
import { MessageComposer } from '@/components/message-composer';
import { MessageReader } from '@/components/message-reader';

/**
 * /m serves two jobs:
 * - no fragment  -> the composer (write + build a link)
 * - has fragment -> the reader (open the message in the link)
 *
 * The fragment is browser state, so the read happens after mount. The initial
 * setState is deferred to a rAF callback (not run synchronously in the effect
 * body) so React doesn't warn about cascading renders.
 */
function readMode(): 'compose' | 'read' {
  return window.location.hash.replace('#', '').startsWith('v1.') ? 'read' : 'compose';
}

export function MessagePage() {
  const [mode, setMode] = useState<'compose' | 'read' | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMode(readMode()));
    const onHash = () => setMode(readMode());
    window.addEventListener('hashchange', onHash);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  if (mode === null) return null;
  return mode === 'read' ? <MessageReader /> : <MessageComposer />;
}
