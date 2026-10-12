# ArShield

Post-quantum security infrastructure. This repo carries the web app **and** the MCP server.

- **Web app** (`src/`) — Next.js 16 static export. Encrypt/decrypt files, sealed messages, Quantum Seals. Runs entirely in the browser.
- **Crypto core** (`packages/core`) — hybrid ML-KEM-768 + X25519, ML-DSA-65 signatures, AES-256-GCM, Argon2id keyfiles, the `.arshield` container.
- **MCP server** (`packages/mcp`) — six tools over stdio for Claude, Cursor and any MCP client.

The web app and the MCP server share the same core, so a file sealed in the browser opens in an agent, and vice versa.

## Stack

| Purpose | Primitive | Standard |
|---|---|---|
| Post-quantum KEM | ML-KEM-768 | FIPS 203 |
| Classical KEM (hybrid) | X25519 | RFC 7748 |
| KDF combiner | HKDF-SHA256 | RFC 5869 |
| Post-quantum signature | ML-DSA-65 | FIPS 204 |
| Symmetric AEAD | AES-256-GCM | 96-bit nonce |
| Passphrase KDF | Argon2id | t=3, m=64MB, p=1 |

Container format: `.arshield` — magic `ARSHD`, cleartext header used as AES-GCM AAD and covered by the ML-DSA-65 signature; filename and size live encrypted inside the payload.

## Commands

```bash
npm run dev          # next dev
npm run build        # static export -> out/
npm run check        # lint + typecheck + build
npm run mcp:build    # build core + mcp packages
npm run mcp:interop  # prove web core -> MCP decrypt round trip
```

## Key derivation

Keys come from either a passphrase-wrapped keyfile (Argon2id) or a wallet signature: an EIP-191 `personal_sign` over the fixed ArShield derivation message (domain `arc-shield.xyz`), fed through HKDF-SHA256 into three seeds (ML-KEM / X25519 / ML-DSA). Same wallet, same keys — in the browser and in the agent.

## Security posture

- No backend, no storage, no analytics. The web app is a static site; the MCP server runs locally.
- Classical primitives are audited; the post-quantum library (noble) has not been independently audited yet.
- Tier gating is a soft client-side gate by design — no accounts, no servers.
