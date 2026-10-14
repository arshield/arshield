# ArShield

[![CI](https://github.com/arshield/arshield/actions/workflows/ci.yml/badge.svg)](https://github.com/arshield/arshield/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-6%20tools-blue)](./packages/mcp)
[![Built for ARC](https://img.shields.io/badge/built%20for-ARC%20(5042)-8a6d1f)](https://arc-shield.xyz)

**Post-quantum envelopes for files, messages and agents.** Encryption happens on your
device; there is no ArShield server that can see your plaintext.

A coin can move to a fresh address when the maths gets shaky. A file cannot. ArShield
wraps it in ML-KEM-768 + X25519, signs it with ML-DSA-65, and hands you a `.arshield`
container that opens on any device with the same keys — in the browser, or from your agent
over MCP.

```
npm run build     # static export → out/  (the web app is just files)
npx -y @arshield/mcp   # the agent side, same crypto core
```

## Why this exists

Nearly every wallet and agent signature today rides on elliptic curves. Anything sealed
with curves alone can be copied now and opened later, on the day those curves fall. ArShield
adds a lattice-based layer on top, so a copy taken today needs **both** broken.

## What it does

| Surface | How you use it |
|---|---|
| **Browser** | Drop a file at [arc-shield.xyz/app](https://arc-shield.xyz/app) → get a `.arshield` envelope + a Quantum Seal. Nothing is uploaded. |
| **Messages** | Seal short text into a link whose key rides in the URL fragment — never sent to a server. |
| **Agents (MCP)** | Six tools over stdio for Claude, Cursor, or any MCP client. Same envelope, same keys. |

Both surfaces share one crypto core (`packages/core`), so a file sealed in the browser
opens in your agent and vice versa.

## Crypto

Hybrid by design: each new primitive is paired with a battle-tested classical one, and
both have to fail.

| Purpose | Primitive | Standard |
|---|---|---|
| Post-quantum KEM | ML-KEM-768 | NIST FIPS 203 |
| Classical KEM (hybrid) | X25519 | RFC 7748 |
| KDF combiner | HKDF-SHA256 | RFC 5869 |
| Post-quantum signature | ML-DSA-65 | NIST FIPS 204 |
| Symmetric AEAD | AES-256-GCM | NIST SP 800-38D |
| Passphrase KDF | Argon2id | t=3, m=64MB, p=1 |

**Container format** — `.arshield`: magic `ARSHD`, a cleartext header (algorithm ids, KEM
ciphertexts, nonce) that is used as AES-GCM additional authenticated data *and* covered by
the ML-DSA-65 signature. Filename and size live encrypted inside the payload.

**Key derivation** — two paths, same keys either way:

- a passphrase-wrapped **keyfile** (Argon2id → AES-256-GCM), random keys, wallet-independent;
- a **wallet signature**: EIP-191 `personal_sign` over the fixed ArShield derivation message
  (domain `arc-shield.xyz`), fed through HKDF-SHA256 into three seeds (ML-KEM / X25519 / ML-DSA).

Same wallet, same keys, in the browser and in the agent. No key export step.

## Repository layout

```
src/                 Next.js 16 web app (static export, no backend)
packages/core/       crypto core — envelope, keyfile, identity, message URLs
packages/mcp/        MCP server — six tools over stdio
docs/                architecture, security, token utility, roadmap
SECURITY.md          threat model, limitations, how to report
```

## Commands

```bash
npm ci               # install
npm run dev          # next dev
npm run build        # static export -> out/
npm run check        # lint + typecheck + build
npm test             # interop + recipient-only + wallet-derived end-to-end
npm run mcp:build    # build core + mcp packages
```

`npm test` is not a smoke test. It encrypts with the web core and decrypts through the MCP
server, runs a recipient-only envelope, and derives keys from a real wallet signature. If
those pass, the tooling in front of you produces containers that actually open.

## Security posture

Read [SECURITY.md](./SECURITY.md) before trusting this with anything irreplaceable. The
short version:

- **No backend, no storage, no analytics.** The web app is a static site; the MCP server
  runs on your machine. There is nothing of ours to breach, subpoena, or leak.
- **The post-quantum library is unaudited.** ML-KEM-768 and ML-DSA-65 come from
  `@noble/post-quantum`. This is stated rather than hidden, because you should factor it in.
- **No recovery exists.** Lose your wallet, keyfile, and passphrase and your files are gone.
  That is the product, not a bug.
- **Tier gating is client-side.** A soft gate, not a control. There is no account and no
  server to enforce it.

## Docs

- [Architecture](https://arc-shield.xyz/docs/architecture) — the hybrid stack and the container
- [Security](https://arc-shield.xyz/docs/security) — the five guarantees, and how each is enforced
- [For agents](https://arc-shield.xyz/docs/for-agents) — installing and using the MCP server
- [Roadmap](https://arc-shield.xyz/docs/roadmap) — what ships today, what is next, no dates

## Contributing

Bug reports and corrections are welcome — especially "your docs claim something the code
does not do". Open an issue, or email the address in [SECURITY.md](./SECURITY.md) for
anything sensitive.

## License

MIT — see [LICENSE](./LICENSE).
