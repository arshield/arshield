# @arshield/mcp

Post-quantum file encryption for AI agents, over MCP.

Hybrid **ML-KEM-768 + X25519** key encapsulation, **AES-256-GCM** symmetric
encryption, **ML-DSA-65** signatures, and **Argon2id** keyfile protection.

Runs **fully local over stdio**. Your keys are derived on your machine and never
transmitted anywhere — this server makes no network calls and has no backend.

---

## Install

Add to your MCP client config.

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "arshield": {
      "command": "npx",
      "args": ["-y", "@arshield/mcp"]
    }
  }
}
```

**Cursor** — `~/.cursor/mcp.json`, same block.

**VS Code / Cline / any stdio MCP client** — the pattern is identical: command
`npx`, args `-y @arshield/mcp`.

No install step, no global package, no account.

---

## Tools

| Tool | What it does |
|---|---|
| `arshield_encrypt_file` | Seal bytes into an `.arshield` container, signed with ML-DSA-65 |
| `arshield_decrypt_file` | Verify the signature, then open the container |
| `arshield_send_message` | Wrap short plaintext into a shareable encrypted URL |
| `arshield_decrypt_message` | Read an ArShield message URL |
| `arshield_verify_seal` | Check the metadata fields a Quantum Seal PNG carries |
| `arshield_sign_x402` | Sign an x402 payment payload with ML-DSA-65 |

---

## Keys

This server **does not generate or store keys**. That is deliberate — a key that
lives on a server is a key someone else can read.

You supply a keyfile and passphrase per call:

```json
{
  "data_base64": "<file bytes, base64>",
  "filename": "contract.pdf",
  "keyfile_json": "<contents of your .arshield keyfile>",
  "passphrase": "<your passphrase>"
}
```

Generate a keyfile in the web app at <https://arc-shield.xyz/app> — either by
connecting a wallet (keys derived from a signature, nothing stored) or by
generating a passphrase-protected key file.

**Without a keyfile:** encrypting still works, but decrypting returns
`SIGNATURE_FAILED`. That is expected, not a bug. There is no private key to open
the container with.

### Two key sources

**Wallet-derived.** Keys come from an EIP-191 signature over a fixed message, so
the same wallet always produces the same keypair. Nothing is stored anywhere —
reconnect the wallet and the keys come back.

**Keyfile.** Random keys wrapped with a passphrase via Argon2id (t=3, m=64 MiB).
Portable: move the file, keep the passphrase, keep the keys.

---

## What it protects against

- **Harvest-now-decrypt-later.** The hybrid KEM means an adversary recording
  ciphertext today still faces ML-KEM-768 if X25519 falls to a quantum computer.
- **Tampering.** Every container is signed. Decryption verifies before it opens,
  so a modified envelope is rejected rather than silently decoded.
- **Server compromise.** There is no server. `encrypt_file` runs in-process on
  your machine.

## What it does not do

- **No key management.** Lose the keyfile or the passphrase and the data is gone.
  There is no recovery path and no backdoor.
- **No metadata protection.** Filenames are encrypted, but container size reveals
  the approximate plaintext size.
- **Not a password manager.** Use it for files, not for storing secrets at rest.

---

## Requirements

- Node.js 18 or newer
- An MCP client that supports stdio transport

---

## Links

- Web app: <https://arc-shield.xyz>
- Source: <https://github.com/gumilang88/arshield>
- Cryptography spec: <https://arc-shield.xyz/docs/security>

## License

MIT
