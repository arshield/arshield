# Security Policy

## Reporting a vulnerability

Email **hello@arc-shield.xyz** with `[security]` in the subject line so it is triaged
first.

Please include:

- what you found and where (file, function, or URL),
- the smallest reproduction you can manage,
- the impact you believe it has.

We will acknowledge within **3 working days** and tell you whether we consider it
in scope. Please give us a reasonable window to ship a fix before publishing.

Do not open a public issue for anything that is exploitable. Do not test against
other people's data or keys.

## What we consider in scope

| Area | Examples |
|---|---|
| Crypto core (`packages/core`) | Key derivation, HKDF combiner, AEAD use, signature verification, container parsing |
| Web app (`src/`) | XSS, CSP gaps, key material leakage to storage or network, unsafe file handling |
| MCP server (`packages/mcp`) | Tool input handling, keyfile passphrase flow, anything that writes key material to disk or the network |
| Message URLs | Forcing a link to leak the embedded key, or to decrypt to the wrong recipient |

## What is **not** a vulnerability

These are deliberate design decisions, not bugs:

- **No server-side recovery.** If you lose your wallet, keyfile, and passphrase, your
  files are gone. That is the product.
- **The Quantum Seal is unsigned.** It carries metadata for a human to read and a hash
  to compare. It proves nothing on its own — this is stated on `/verify` and in the docs.
- **Tier gating is client-side.** A determined user can lift their own daily limit. There
  is no account and no server to enforce it; the gate is a courtesy, not a control.
- **Supply chain risk in dependencies.** We know. See "Current limitations" below.

## Current limitations — read before trusting this with anything irreplaceable

We would rather state these plainly than let them be discovered.

1. **The post-quantum library is unaudited.** The ML-KEM-768 and ML-DSA-65 implementations
   come from [@noble/post-quantum](https://github.com/paulmillr/noble-post-quantum), which
   has not had an independent cryptographic audit. The classical primitives (X25519,
   AES-GCM, SHA-256, Argon2id) come from audited [@noble](https://github.com/paulmillr/noble-curves)
   libraries.
2. **No third-party audit of ArShield itself yet.** An independent review of the crypto core
   and the browser implementation is on the roadmap and is not done.
3. **This is pre-launch software.** Features may change or break.
4. **The browser is your trust boundary.** The app is a static export with no backend, so
   nothing we run sees your plaintext — but the JavaScript we serve is what does the
   encrypting. Serving compromised JS would defeat the whole design. Pin, self-host, or
   verify the build if your threat model requires it.

## How the crypto is meant to be read

If you are reviewing this, the claims worth checking are:

- **Hybrid, not sequential.** ML-KEM-768 and X25519 secrets are both fed through HKDF-SHA256.
  Breaking one leaves the other, so the combined output is at least as strong as the
  stronger primitive.
- **Header is authenticated.** The cleartext header (algorithm ids, KEM ciphertexts, nonce)
  is passed as AES-GCM additional authenticated data *and* covered by the ML-DSA-65
  signature. Editing a single byte of it fails before decryption.
- **Signature verified before plaintext.** `decryptFile` checks the ML-DSA-65 signature
  over header + ciphertext and only then decapsulates. A bad signature never reaches the
  AEAD step.
- **Keyfile wrapping.** Argon2id (t=3, m=64MB, p=1) derives a wrap key; the keyfile payload
  is sealed with AES-256-GCM. A wrong passphrase fails the tag check, it does not silently
  return a bad key.

## Verifying a build yourself

```bash
git clone https://github.com/arshield/arshield
cd arshield
npm ci
npm run check      # lint + typecheck + build
npm test           # interop, recipient-only, wallet-derived end-to-end
```

`npm test` exercises the real crypto: a web-core encryption decrypted by the MCP server,
recipient-only envelopes, and wallet-signature-derived keys. If those pass, the code in
front of you produces containers the shipped tooling can open.

## Thank you

Reports that make this more correct are genuinely welcome, including "your docs claim
something the code does not do". Several of those have already been fixed.
