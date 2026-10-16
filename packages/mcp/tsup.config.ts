import { defineConfig } from 'tsup';

/**
 * Bundle config for the published MCP server.
 *
 * `@arshield/core` is a workspace package resolved through `file:../core`, which
 * npm cannot resolve from a registry — a published tarball referencing it would
 * install and then fail at runtime. Asking tsup to inline it makes the output
 * self-contained, so the only things resolved from npm are the SDK and zod.
 *
 * Everything else stays external: the SDK is a real dependency, and node built-
 * ins (`crypto`) must never be bundled.
 */
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  clean: true,
  splitting: false,
  // Inline the workspace package. This is the whole reason this file exists.
  noExternal: ['@arshield/core'],
  // The shebang in src/server.ts must survive, or `npx arshield-mcp` will not run.
  banner: { js: '#!/usr/bin/env node' },
});
