import type { Metadata } from 'next';
import { AppClient } from './app-client';

export const metadata: Metadata = {
  title: 'ArShield | Post-Quantum Security Infrastructure on Robinhood Chain',
  description: 'Quantum-safe encryption, in your browser. Files never leave your device.',
};

export default function AppPage() {
  return <AppClient />;
}