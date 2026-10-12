import type { Metadata } from 'next';
import { MessageComposer } from '@/components/message-composer';

export const metadata: Metadata = {
  title: 'QuantSafe | Post-Quantum Security Infrastructure on Robinhood Chain',
  description: 'Quantum-safe messages, one URL away. Encrypted bytes live in the URL fragment, never sent to a server.',
};

export default function MessagesPage() {
  return <MessageComposer />;
}