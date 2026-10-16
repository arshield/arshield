# Cara cek & install MCP ArShield

Panduan lengkap dari nol sampai jalan di Claude Desktop / Cursor.

---

## BAGIAN 1 — CEK DULU

### Cek package udah publish belum

```bash
npm view @arshield/mcp version
```

| Output | Artinya |
|---|---|
| `0.1.0` | ✓ udah publish, siap dipakai |
| `npm error 404 Not Found` | ✗ belum publish |

Cek semua info sekaligus:

```bash
npm view @arshield/mcp
```

### Cek lo login npm sebagai siapa

```bash
npm whoami
```

| Output | Artinya |
|---|---|
| `gumilang88` (atau username lo) | ✓ udah login |
| `npm error code ENEEDAUTH` | ✗ belum login → lihat Bagian 2 |

---

## BAGIAN 2 — PUBLISH (buat lo, sekali doang)

### Langkah 1 — login npm

```bash
npm login
```

Bakal ditanya:
```
Username: <username npmjs.com lo>
Password: <password lo>
Email:    (this IS public) <email lo>
Enter one-time password: <kode OTP dari authenticator>
```

**Belum punya akun npm?** Daftar dulu di https://www.npmjs.com/signup

### Langkah 2 — pilih nama package

**Kalau pakai `@arshield/mcp`:** lo harus punya **organization** `arshield` di npm.
Bikin di: https://www.npmjs.com/org/create (gratis, 2 menit).

**Kalau gak mau ribet:** ganti ke `arshield-mcp` (tanpa scope, langsung bisa).
Edit `packages/mcp/package.json`:
```json
"name": "arshield-mcp"
```

### Langkah 3 — cek dulu (belum publish)

```bash
npm run mcp:publish
```

Ini **dry-run** — cuma verifikasi, gak publish apa-apa. Output yang bener:
```
=== 1. prerequisites ===
  ✓ logged in as <username>
  ✓ package: @arshield/mcp@0.1.0
  ✓ version is not yet published
=== 2. no workspace references leak ===
  ✓ no file: dependencies
=== 3. build ===
  ✓ core + mcp built
=== 4. bundle is self-contained ===
  ✓ @arshield/core inlined, not imported
  ✓ external kept: crypto, zod, @modelcontextprotocol/sdk
  ✓ shebang present
=== 5. the built server actually runs ===
  ✓ initialize ok — arshield-mcp 0.1.0
  ✓ tools/list returned 6 tools
=== 6. tarball contents ===
  ✓ 4 files, 68.6 kB packed
```

**Kalau ada tanda ✗** — script berhenti dan kasih tau apa yang salah. Jangan lanjut sebelum semua ✓.

### Langkah 4 — publish

```bash
npm run mcp:publish -- --publish
```

Kalau mau versi beta dulu (biar gak langsung jadi `latest`):
```bash
npm run mcp:publish -- --publish --tag beta
```

### Langkah 5 — verifikasi

```bash
npm view @arshield/mcp version
```
Harus keluar `0.1.0`.

---

## BAGIAN 3 — INSTALL (buat user / agent lain)

### Claude Desktop

**Lokasi config:**
| OS | Path |
|---|---|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**Isi:**
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

**Windows penting:** kalau `npx` gak ketemu, pakai `cmd`:
```json
{
  "mcpServers": {
    "arshield": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@arshield/mcp"]
    }
  }
}
```

### Cursor

File: `~/.cursor/mcp.json` (global) atau `.cursor/mcp.json` (per-project)

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

### VS Code (Copilot / Cline)

File: `.vscode/mcp.json`

```json
{
  "servers": {
    "arshield": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@arshield/mcp"]
    }
  }
}
```

### Tes tanpa client (langsung dari terminal)

```bash
npx -y @arshield/mcp
```

Prosesnya bakal **diam** — itu **bener**. Server MCP ngobrol lewat stdin/stdout,
jadi kalau gak dikasih JSON, dia nunggu. Tekan `Ctrl+C` buat keluar.

Tes beneran:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
| npx -y @arshield/mcp
```

Output yang diharapkan:

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"arshield-mcp","version":"0.1.0"}}}
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"arshield_encrypt_file",...}]}}
```

---

## BAGIAN 4 — PAKAI

### 6 tool yang tersedia

| Tool | Butuh private key? | Fungsi |
|---|---|---|
| `arshield_encrypt_file` | ✗ tidak | Segel file jadi `.arshield` |
| `arshield_decrypt_file` | ✓ **ya** | Buka segel (verifikasi dulu, baru buka) |
| `arshield_send_message` | ✗ tidak | Bikin URL pesan terenkripsi |
| `arshield_decrypt_message` | ✓ **ya** | Baca URL pesan |
| `arshield_verify_seal` | ✗ tidak | Cek metadata Quantum Seal PNG |
| `arshield_sign_x402` | ✓ **ya** | Tanda tangan payload x402 |

### Bikin keyfile dulu

Buka https://arc-shield.xyz/app → pilih salah satu:

**A. Wallet** — connect wallet, tanda tangan pesan. Kunci diturunkan dari
signature. Gak ada yang disimpan. Wallet yang sama = kunci yang sama.

**B. Keyfile** — klik "Generate new", bikin passphrase (min 12 karakter).
Simpan file `.arshield` yang di-download. Pindahin file itu = pindahin kunci.

### Contoh manggil dari agent

Encrypt — **gak butuh keyfile**:

```json
{
  "tool": "arshield_encrypt_file",
  "arguments": {
    "data_base64": "<bytes file, base64>",
    "filename": "kontrak.pdf"
  }
}
```

Decrypt — **butuh keyfile + passphrase**:

```json
{
  "tool": "arshield_decrypt_file",
  "arguments": {
    "container_b64url": "<isi .arshield>",
    "keyfile_json": "<isi file .arshield keyfile>",
    "passphrase": "<passphrase lo>"
  }
}
```

### ⚠️ Kalau decrypt error `SIGNATURE_FAILED`

Itu **bukan bug**. Artinya lo gak kasih keyfile, atau keyfile-nya salah.
MCP server **gak nyimpen private key** — memang gak bisa buka tanpa kunci,
dan itu disengaja: kunci yang ada di server = kunci yang bisa dibaca orang lain.

---

## TROUBLESHOOTING

**"npx: command not found"**
→ Node.js belum keinstall. Download di https://nodejs.org (butuh v18+).

**Server jalan tapi agent gak lihat tool-nya**
→ Cek format JSON config — sering ketinggalan koma atau kurung.
→ Restart client-nya sepenuhnya (Claude Desktop: quit dari tray, bukan cuma close window).

**Windows: `npx` gak jalan di Claude Desktop**
→ Pakai bentuk `cmd /c npx` di atas.

**"E404 Not Found" pas `npm view`**
→ Belum publish. Lihat Bagian 2.

**"EPUBLISHCONFLICT" pas publish**
→ Versi itu udah ada. Naikin `version` di `packages/mcp/package.json`.

**"EOTP" pas publish**
→ Butuh kode OTP. Ambil dari authenticator app lo.

**"403 Forbidden" pas publish**
→ Lo gak punya akses ke scope `@arshield`. Bikin org-nya, atau pakai nama
tanpa scope.
