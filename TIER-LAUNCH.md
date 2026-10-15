# Tier wiring — launch checklist

Everything on the code side is done. When the $arshield contract deploys, the
only step is setting one environment variable. This file records what was
verified, what is assumed, and what to check on the day.

---

## The one step on launch

Add the contract address to `.env.local`:

```
NEXT_PUBLIC_ARSHIELD_CONTRACT=0x<address>
NEXT_PUBLIC_ARSHIELD_USD_FALLBACK=<launch price in USD, e.g. 0.01>
```

Then rebuild and deploy:

```
export PATH="$HOME/.nvm/versions/node/v24.18.1/bin:$PATH"
npm run build
wrangler pages deploy out --project-name=arshield --branch=master --commit-dirty=true
```

Two variables, and the second is optional but should be set — see "fallback"
below for why.

> Note: `NEXT_PUBLIC_*` values are inlined into the client bundle at build time,
> so they must be present when `npm run build` runs. Setting them only in the
> Cloudflare dashboard will not work; they have to be in the build environment.

---

## Verified against the live endpoints

### Price — Peach

```
GET https://api.peach.ag/arc/v1/arc/market_price
    ?base_symbol_address=<contract>
    &quote_coin_address=usd
    &market=birdeye
```

Response shape, captured live:

```json
{ "code": 0, "msg": "success",
  "data": { "prices": [ { "base_symbol": "0x5849fd…", "quote_symbol": "usd",
                          "price": "0.011771464650277261", "market": "birdeye" } ] } }
```

- `data.prices[0].price` is USD per token, as a string.
- CORS sends `access-control-allow-origin` echoing the requesting origin, so a
  direct browser fetch works. No proxy needed.
- Accepts comma-separated addresses, so several tokens cost one request.
- The endpoint is `api.peach.ag` — **not** `www.peach.ag`. The www host returns
  the Next.js HTML shell with status 200 for unknown paths, which looks like a
  working endpoint but is not.

### Balance — ARC RPC

`eth_call` with selector `0x70a08231` (`balanceOf(address)`), padded argument.

Seven endpoints were tested and all returned `eth_chainId = 0x13b2` (5042):

| Endpoint | Latency |
|---|---|
| `https://arc.drpc.org` | 0.09s |
| `https://rpc.mainnet.arc.io` | 0.14s |
| `https://rpc.blockdaemon.mainnet.arc.io` | 0.55s |
| `https://rpc.beamrpc.com` | 5.85s |

Configured order is mainnet → blockdaemon → drpc → beamrpc. A failure falls
through to the next automatically. All four send permissive CORS headers, so
these are direct browser calls.

### End-to-end

Driven through a real browser against a live ARC token used as a stand-in:

```
POST https://rpc.mainnet.arc.io/          ← balanceOf
GET  https://api.peach.ag/arc/v1/...      ← price
→ balance 0 × price 0.0117 = $0.00 → Free
```

Both requests left the browser and the tier resolved. With a stand-in token at
roughly $0.0117, the thresholds work out to:

| Tier | Threshold | Tokens needed |
|---|---|---|
| Holder | $20 | ~1,700 |
| Pro | $100 | ~8,500 |
| Whale | $1,000 | ~85,000 |

Those numbers move with the launch price — they are a consequence of the USD
thresholds in `TIERS`, not a separate setting.

---

## Failure behaviour

A tier gate that hard-fails because a third party is down would lock paying
holders out, which is worse than being briefly generous. So:

| Situation | Result |
|---|---|
| Price feed up | balance × live price → tier |
| Price feed down, fallback set | balance × fallback rate → tier |
| Price feed down, no fallback | Free |
| Balance read fails on every RPC | Free |
| No contract configured | Free (current pre-launch behaviour) |

Caching: price 60s, balance 30s. Without a cache the pill would hit two
endpoints on every render.

---

## Two things to confirm on launch day

Neither can be checked before the token exists.

1. **Decimals.** The code assumes 18, the ERC-20 default, via
   `TOKEN_DECIMALS` in `src/lib/tiers.ts`. If $arshield uses 6 or 9, the balance
   will be off by orders of magnitude and every holder will read as Whale or
   Free. Read `decimals()` on the contract and change the constant if needed.

2. **Peach coverage.** If Peach does not list $arshield yet, the price call
   returns no entry and the tier falls back — Free, or the fallback rate if set.
   Worth confirming the token appears in Peach before announcing.

---

## Known limitation

This is a soft gate evaluated entirely in the browser. Anyone can open devtools
and override it, and the daily counter lives in localStorage where it can be
edited. That is a deliberate trade-off for a client-only app with no backend.

It shapes the interface and the limits; it does not enforce them. If the limits
ever need to bind, the balance check has to move server-side — which means a
different architecture, not a patch to this one.

---

## Verified after the fix

An earlier version of `tiers.ts` referenced `process.env.NEXT_PUBLIC_…` in a
position where the bundler rewrote it to `b.default.env.NEXT_PUBLIC_…` instead
of inlining the literal. The variable name was still present in the built
bundle, meaning the value would never have been read.

Fixed by restructuring the access so Next can substitute it at build time.
Confirmed by grepping the bundle:

```
# with env set
grep -c "NEXT_PUBLIC_ARSHIELD_CONTRACT" out/_next/static/chunks/*.js   → 0
grep -c "0x5849fd68a097b3ee7d87ce88a0fcbb76857648ff" …                 → 1
```

The variable name being absent while the value is present is the signal that
inlining worked. Re-check this after setting the real address.
