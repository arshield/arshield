# QuantSafe Landing Support Content

Source: https://quantsafe.tech/docs/{architecture,security,features,tokenomics,roadmap} (fetched 2026-10-13).
All text below is verbatim from the live docs pages unless marked `(inferred)`.

---

## Roadmap

# Where we are going.

Phase 1 ships today: the web app, .qsafe messages and the Seal verifier. Next on the roadmap: on-chain Seal anchoring, then Shield. No dates, only the order.

### Phase 1 — [Now]
**Post-quantum encryption for everyone.**
- File encryption and decryption: any format, any size up to tier cap
- Quantum-safe messages: encrypted, signed links
- Wallet-native key management: MetaMask, Phantom, key file fallback
- $qsafe token gating: tiers set by the USD value held, read from Robinhood Chain and enforced in the app
- MCP server: six post-quantum tools for agents over stdio; its npm package is next
- Client-side only: zero backend, zero uploads, zero telemetry

### Phase 2 — [On the roadmap · Next]
**Agents anchor, then QuantSafe Shield.**
- On-chain Seal anchoring from the web app, through an ownerless registry
- Anchoring from the agent server: the agent prepares the transaction, its own wallet signs
- Gas-free anchoring through the account abstraction stack of Robinhood Chain
- QuantSafe Shield: a post-quantum gateway in front of any x402 endpoint, one endpoint swap
- Every paid call emits a Quantum Seal, anchored in batches
- Audit log and export-ready reports for every sealed call
- Server-side tier quotas: $qsafe holders get reserved capacity

### Phase 3 — [On the roadmap · Later]
**Infrastructure layer.**
- Multi-recipient encryption: encrypt for another wallet address
- On-chain key directory: publish a post-quantum public key so anyone can encrypt for your address
- Sealed receipts for agents that trade Stock Tokens
- Token-gated decryption: files that require holding $qsafe to open
- Mobile app and browser extension
- Batch encryption and streaming for very large files

---

## Docs

### Architecture
Title: **Architecture** (kicker: Reference)

QuantSafe is one cryptographic core behind two surfaces, a browser app and an MCP server for agents. Both reuse the same open-source primitives and the same `.qsafe` container. Nothing here is novel cryptography; it is the standards, assembled carefully.

**Cryptographic stack**

Every primitive is a NIST standard or an established RFC, sourced from the open-source noble suite and the browser-native WebCrypto API. The classical curves and hashes have been independently audited (Argon2id aside); the post-quantum library has not been independently audited yet.

| Purpose | Primitive | Standard |
|---|---|---|
| Post-quantum KEM | ML-KEM-768 | FIPS 203 |
| Classical KEM (hybrid) | X25519 | RFC 7748 |
| KDF combiner | HKDF-SHA256 | RFC 5869, domain-separated |
| Post-quantum signature | ML-DSA-65 | FIPS 204, context-bound |
| Symmetric AEAD | AES-256-GCM | 96-bit random nonce |
| Passphrase KDF | Argon2id | OWASP, t=3, m=64 MB, p=1 |

**Hybrid key encapsulation**

Each file is sealed to two key encapsulation mechanisms at once. The shared secrets from ML-KEM-768 (post-quantum) and X25519 (classical) are combined through HKDF-SHA256 into the symmetric key. An attacker must break **both** to recover the key: the same defense-in-depth approach used by Signal, Chrome, and Cloudflare.

```
ML-KEM-768 shared secret  ┐
                          ├─► HKDF-SHA256(domain-separated) ─► AES-256-GCM key
X25519 shared secret      ┘
```

**The .qsafe container**

- Magic bytes + format version
- ALGO_ID (v1 = the hybrid suite)
- ML-KEM-768 ciphertext
- X25519 ephemeral public key
- AES-GCM nonce (96-bit, random)
- Encrypted payload length (tracks the file size)
- Original filename (inside payload)
- Original file size (inside payload)
- File bytes (inside payload) — AEAD-encrypted payload

**Wallet-derived identity**

- /app
- EOA only.
- Checked on first use.
- The signature is the key.
- Keep a backup.

**Built to outlive its own format**

Every artifact records its version and algorithm identifier. Unknown versions are rejected with a clear error, and new standardized suites can be added without breaking the files you create today.

CTA: Integrate it into an agent →

Context refs: `qsafe-v1-file`, `qsafe-v1-x402`.

### Security
Title: **Security**

# Five guarantees.

These are not marketing claims. Each one is a direct consequence of how the product is built.

**01 — We hold none of your data.**
QuantSafe has no backend that processes file content. Every encryption and decryption runs in your browser or in your own agent runtime, and no server of ours receives your files, their names or your keys. We hold no plaintext and no keys, so under legal compulsion there is nothing to hand over. Like any web app, the browser side is only as safe as the code served from quantsafe.tech.

**02 — NIST-standardized algorithms only.**
QuantSafe uses ML-KEM-768 and ML-DSA-65, the algorithms standardized by the U.S. National Institute of Standards and Technology as FIPS 203 and FIPS 204 in 2024. We do not invent cryptography. We integrate the standards through open-source libraries.

**03 — Resistant to quantum computers.**
Classical encryption, the kind securing most of the internet today, can be broken by a sufficiently powerful quantum computer. QuantSafe uses a hybrid approach: an attacker must break both a post-quantum algorithm and a classical one simultaneously. Breaking one is not enough.

**04 — Your keys stay yours.**
QuantSafe does not store, escrow, or have access to your encryption keys. Keys are derived from your wallet or a key file you control entirely. If you lose access to your keys, there is no recovery mechanism, and that is intentional. Wallet users can save a passphrase-wrapped key file backup of the same keys from the app.

**05 — Tampering is detected.**
Every .qsafe file carries a cryptographic signature. If any byte is modified after encryption, whether by accident or intent, decryption fails with an explicit error. A file that decrypts is a file that has not been touched.

**Open-source foundations.**
- @noble/post-quantum
- @noble/curves
- @noble/hashes

**Reporting a vulnerability.**
- hello@quantsafe.tech

### Features
Title: **Features** (kicker: Product)

Everything that ships with QuantSafe today, and what is on the roadmap.

**Available now**

*Post-quantum file encryption*
- Encrypt any file type. The original filename is never exposed.
- Decrypt and recover the original file instantly.
- NIST FIPS 203 + FIPS 204 standardized algorithms.
- Everything runs in your browser. No file is ever uploaded.

*Quantum-safe messages*
- Encrypt a message and share it as a link.
- The ciphertext lives in the URL fragment, never on any server.
- Same cryptographic pipeline as file encryption.

*Agent & developer tools*
- MCP server: encrypt, decrypt, sign, and verify as agent tool calls. Install it with `npx -y @quantsafe/mcp`.
- The wallet is a portable identity: same keys in the browser and over MCP.
- Sign x402 payment receipts with ML-DSA-65 for verifiable provenance.
- Runs locally over stdio. No network I/O, no telemetry.

*Wallet-native key management*
- Derive your encryption identity from an EOA wallet with one signature, no gas.
- First use on a device asks for two signatures and refuses a wallet whose signatures differ, so the keys are reproducible.
- Or generate an encrypted key file and use it offline. Back up wallet keys as a key file anytime.
- No password stored anywhere. You own your keys.

*Token gating*
- Free tier available to everyone, no token required.
- $qsafe holders unlock higher daily quotas and larger file sizes.
- Your tier is the USD value of your $qsafe, read on Robinhood Chain when your wallet connects.

**On the roadmap** (No date yet)
- On-chain Seal anchoring from the web app, through an ownerless registry
- QuantSafe Shield: a post-quantum gateway in front of any x402 endpoint, one endpoint swap
- Audit log and export-ready reports for every sealed call

### Tokenomics
Title: **Token Utility** (kicker: Token)

# $qsafe

**Capacity gating** (`balanceOf`)

Tier is enforced on-chain by reading the holder's balance (`balanceOf`) on Robinhood Chain. The USD value held sets the tier.

| Tier | $qsafe held | Encryptions / day | File size cap |
|---|---|---|---|
| Free | No $qsafe needed | 3 / 24h | 25 MB |
| Holder | ≥ $20 in $qsafe | 25 / 24h | 100 MB |
| Pro | ≥ $100 in $qsafe | 250 / 24h | 1 GB |
| Whale | ≥ $1,000 in $qsafe | Unlimited | No tier cap |

Token address: `0xad4d04cb9DaBA0FD0472e11EB8a9DB0D3318eFC8`

**Open to every tier**
- Quantum Seal on every encrypted file
- Wallet or key file mode
- .qsafe messages at /m
- The MCP server for agents

**How limits are enforced**
Tier is read from the holder's `balanceOf` on Robinhood Chain; the USD value held (priced from the on-chain launch curve / Uniswap v4 pool, with Chainlink ETH/USD) determines the tier. See the roadmap for server-side tier quotas.

**Price / how tier value is computed**
The USD value of the $qsafe balance is derived from the on-chain launch curve for $qsafe on Robinhood Chain, combined with the Chainlink ETH/USD feed. Thresholds are expressed in USD value held, so they cost the same regardless of token price. (inferred on mechanism detail; USD thresholds, chain, and price feeds are stated on the live site.)

**Non-goals**
- Not an investment: holding $qsafe changes your limits in the app and nothing else.
- No staking, no yield: utility is usage, not emissions.
- No token contract of our own: $qsafe is created by a launchpad already deployed on Robinhood Chain, with a fixed supply and no mint.
- No team allocation, treasury bucket or vesting contract: anything the team holds is bought on the curve like everyone else.

> "Holders encrypt more."

Thresholds are USD value held, so they cost the same whatever the price. A dip of up to 20% under a threshold keeps the tier.

---

## Supplementary page-copy (from landing page, real text)

- "Coins can run to a fresh address. Your data can't. QuantSafe seals files post-quantum on your device: ML-KEM-768 + X25519, signed with ML-DSA-65. Built for Robinhood Chain."
- "The USD value of your $qsafe on Robinhood Chain sets your tier, priced on-chain from its Uniswap v4 pool and Chainlink ETH / USD. Wallets connect as injected browser wallets only, with no relay in between."
- "Security between agents. Post-quantum envelopes for files and messages, signatures for x402 receipts. MCP-native. Built for Robinhood Chain."
- Footer nav: Product · Messages · Verify Seal · Tiers · Shield (roadmap) / Resources · Features · Roadmap · Technology / Legal · Terms · Privacy · Contact
- "© 2026 QuantSafe. Built for Robinhood Chain. Built on open-source noble cryptography."

---

### Notes on sourcing
- Pages are client-rendered (Next.js App Router RSC); content extracted from `self.__next_f.push` payloads.
- 3 web searches (QuantSafe Shield x402 PQ gateway; QuantSafe docs roadmap seal anchoring Robinhood Chain; Robinhood Chain 4663 launchpad token curve) returned no usable results (search endpoints blocked/empty). Details not present on quantsafe.tech are marked `(inferred)`.
