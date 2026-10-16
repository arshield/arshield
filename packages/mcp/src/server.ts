import { createRequire } from 'node:module';
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

/**
 * Read the version from package.json rather than repeating it here.
 *
 * It was hardcoded, and it drifted on the first version bump — the published
 * 0.1.1 still announced itself as 0.1.0, which makes bug reports ambiguous.
 * `createRequire` is used instead of a JSON import assertion so this works on
 * Node 18, which is the floor declared in package.json.
 */
const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

const server = new Server(
  {
    name: 'arshield-mcp',
    version,
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
    throw toMcpError(err);
  }
});

/**
 * Map a thrown value onto the right JSON-RPC code.
 *
 * Everything used to collapse into InternalError, which told a calling agent
 * that the server was broken when the truth was that the agent passed a bad
 * argument. That distinction matters: a well-behaved client retries an internal
 * error, and does not retry a malformed request — it fixes the request.
 *
 *   InvalidParams  the caller can fix this by sending something else
 *   InternalError  the caller cannot; the fault is ours
 */
function toMcpError(err: unknown): McpError {
  if (err instanceof ArShieldError) {
    return new McpError(ErrorCode.InvalidParams, `${err.code}: ${err.message}`);
  }

  const message = err instanceof Error ? err.message : String(err);

  // TypeErrors from zlib/TextDecoder on bad base64 are input faults, not bugs.
  if (err instanceof TypeError) {
    return new McpError(ErrorCode.InvalidParams, message);
  }

  // Tool-level validation throws plain Errors with a specific, user-facing
  // message ("Message exceeds 64KB plaintext limit"). Those are the caller's to
  // fix. Anything without a message is a genuine internal fault.
  if (err instanceof Error && message.trim().length > 0 && !/undefined|null/i.test(message)) {
    return new McpError(ErrorCode.InvalidParams, message);
  }

  return new McpError(ErrorCode.InternalError, message);
}

// Graceful stream close on SIGINT/SIGTERM (agent hosts send these on shutdown).
async function shutdown() {
  await server.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const transport = new StdioServerTransport();
await server.connect(transport);