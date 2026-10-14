# Changelog

Notable changes to ArShield. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `SECURITY.md` — threat model, in-scope surface, and the four limitations stated plainly
- `CONTRIBUTING.md` — build steps and what `npm test` actually proves
- `npm test` as a single gate: lint + typecheck + build, then interop, recipient-only, and
  wallet-derived end-to-end tests

### Changed
- README rewritten around the crypto, the container format, and the security posture
- Landing page consolidated to 11 sections; section rhythm normalised to ~200px
- Colour tokens split so state is readable: `action` (gold), `verified` (teal),
  `progress` (amber), distinct from the brand gold

### Fixed
- `/m` had no message reader — a recipient clicking a shared link hit a dead end. Added the
  reader; the composer and reader now share the route by fragment presence
- The seal verifier could not read seals written by the app. It expected per-field `tEXt`
  keywords, while the app writes one `arshield` chunk containing JSON. It now reads both
- Docs claimed `Ed25519` signatures, `WebAssembly`, and a signature that binds the
  recipient and timestamp. None were true. Corrected against the source
- Analytics were described that do not exist; a "Back up keys" button was documented that
  is not implemented. Both rewritten to match reality
- Terraform: leaked Vercel project link and a build cache were tracked in this public repo

## [0.3.1]

### Added
- Encrypted messages via URL fragment, self-decrypting or recipient-only
- Quantum Seal PNG export and local verification
- Six MCP tools over stdio sharing the browser crypto core
- Wallet-derived identity from an EIP-191 signature, alongside passphrase keyfiles

### Fixed
- Signature is verified before decryption, not after
- Header is authenticated as AES-GCM additional data and covered by the ML-DSA-65 signature

## [0.3.0]

### Added
- `@arshield/mcp` — the MCP server package
- Hybrid ML-KEM-768 + X25519 key agreement via HKDF-SHA256
- ML-DSA-65 signatures over the envelope
- Argon2id-wrapped keyfiles

## [0.1.0]

### Added
- Initial `.arshield` container format
- Browser file encryption and decryption, entirely client-side
- Hybrid post-quantum crypto core (`packages/core`)

[Unreleased]: https://github.com/arshield/arshield/compare/v0.3.1...HEAD
