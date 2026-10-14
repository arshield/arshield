# Contributing

Thanks for looking. This project is small enough that a good issue is often more useful
than a large patch, so both are welcome.

## Before you start

- **Security issues do not go here.** See [SECURITY.md](./SECURITY.md) instead — do not open
  a public issue for anything exploitable.
- **Read the crypto carefully before changing it.** The envelope format and key derivation
  are the parts other things depend on. A change there breaks compatibility with files
  already sealed.

## Development

```bash
npm ci
npm run dev        # http://localhost:3000
npm run check      # lint + typecheck + build — must pass before a PR
npm test           # interop + recipient-only + wallet-derived end-to-end
```

`npm test` runs real cryptography, not mocks. If you touch the core, the envelope, or the
MCP server, this has to stay green — it is the thing that proves a container written by one
surface can be read by the other.

## What a good change looks like

- **Scoped.** One concern per pull request.
- **Tested when it touches crypto.** If it changes bytes on the wire, add or extend a test
  in `packages/core/test`.
- **Honest in the docs.** If the behaviour changes, the README or `docs/` says so. Several
  claims in this repo were corrected exactly this way — documentation that overstates what
  the code does is treated as a bug here.
- **No new dependencies without a reason.** Every added package is something a user has to
  trust. For anything cryptographic, expect to justify it.

## Style

- TypeScript strict, no `any`.
- Named exports, PascalCase components, camelCase utilities.
- Tailwind utility classes in components, no inline styles.
- 2-space indentation.

## Reporting a documentation error

Open an issue with the page or file, the claim, and what the code actually does. These are
genuinely appreciated — the docs are held to the same standard as the code.

## License

By contributing you agree your work is licensed under the [MIT License](./LICENSE).
