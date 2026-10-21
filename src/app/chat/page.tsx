import type { Metadata } from 'next';
import { ChatClient } from './chat-client';

export const metadata: Metadata = {
  title: 'ArShield | Agent — seal files by asking',
  description:
    'A chat surface for the same post-quantum sealing that runs on ARC. Seal files, open envelopes, build secret links — all in the browser.',
};

export default function ChatPage() {
  return <ChatClient />;
}
