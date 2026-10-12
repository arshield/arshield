#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';
import { ArShieldError } from '@arshield/core';

const server = new Server(
  {
    name: 'arshield-mcp',
    version: '0.1.0',
  },
  {
    capabilities: { tools: {} },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  }
  try {
    const result = await tool.handler(request.params.arguments ?? {});
    return result as { content: Array<{ type: 'text'; text: string }> };
  } catch (err) {
    if (err instanceof ArShieldError) {
      throw new McpError(ErrorCode.InvalidRequest, `${err.code}: ${err.message}`);
    }
    throw new McpError(ErrorCode.InternalError, err instanceof Error ? err.message : String(err));
  }
});

// Graceful stream close on SIGINT/SIGTERM (agent hosts send these on shutdown).
async function shutdown() {
  await server.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const transport = new StdioServerTransport();
await server.connect(transport);