import type { Metadata } from 'next';
import { McpClient } from './mcp-client';

export const metadata: Metadata = {
  title: 'MCP Server · ArShield',
  description:
    'Six post-quantum tools over stdio for Claude, Cursor and any MCP client. Encrypt files, send PQ-safe messages, verify Quantum Seals, sign x402 payloads.',
};

export default function McpPage() {
  return <McpClient />;
}