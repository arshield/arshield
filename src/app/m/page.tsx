import type { Metadata } from 'next';
import { MessagePage } from './message-page';

export const metadata: Metadata = {
  title: 'ArShield | Post-Quantum Security Infrastructure on ARC',
  description: 'Quantum-safe messages, one URL away. Encrypted bytes live in the URL fragment, never sent to a server.',
};

export default function MessagesPage() {
  return <MessagePage />;
}