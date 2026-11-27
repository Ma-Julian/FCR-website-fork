# Time saved by FCR

How much waiting FCR has saved, measured on-chain per transfer. Shown as "Waiting saved" in the
home page's "Using FCR" band and explained on the docs page `docs/reference/time-saved.md`.

```sh
npm run time-saved                              # new transfers for every integration
node scripts/time-saved/run.mjs gnosis          # one integration
node scripts/time-saved/run.mjs --full          # re-measure from scratch
```

A GitHub Action (`.github/workflows/time-saved.yml`) runs it daily at 05:17 UTC. It commits the
result when the data check passes.

**Repository secrets (all optional):**
- `ETH_RPC`, `GNO_RPC`, `BASE_RPC` replace the public RPCs. Add one secret per new chain and pass it in the
  workflow's `env`.
- `L2_RPS` raises the request rate for L2 lookups (default 20 per second, under Base's public
  limit of 25).

## The number is a lower bound

For every transfer from Ethereum that used FCR:

**time saved = floor − actual time**

- **Floor:** the earliest moment the integration's old rule could have let the transfer through.
- **Actual time:** destination block timestamp − Ethereum block timestamp.

The floors live in `lib/baselines.mjs`:

| Kind | Old rule | Floor after the Ethereum block |
|---|---|---|
| `finality` | waited for the block to be finalized | first checkpoint at or after it finalized at the earliest: 768–1,152 s |
| `justified` | waited for `safe` before FCR (Arbitrum, Robinhood Chain) | that checkpoint justified at the earliest: 384–756 s |
| `blocks` (`blocks: n`) | waited for n blocks on top (OP Stack sequencer confs) | n × 12 s |
| `seconds` (`seconds: s`) | a fixed delay | s |

How the floor stays a lower bound:

- **Left out:** everything the old path added on top, such as polling, signing and the destination's block time.
- **Slow transfers:** a transfer slower than its floor counts as negative.
- **The check:** transfers that did not use FCR are compared with the floor. If even one beat it, the floor doesn't describe
  the old rule, and the data check fails the build.

## Which transfers used FCR

Each integration sets `attribution`:

- **`date`** (default): every transfer from `fcrSince` on used FCR. The check uses the 30 days before
  `fcrSince`. With `fcrSince: null` the integration hasn't switched yet. Nothing is counted, but
  a rolling 30-day check is kept, ready for the day it switches. Base is measured this way.
- **`flag`**: `fetch()` marks every transfer `fcr: true` or `fcr: false`. Use it where FCR is opt-in per message, such as CCIP's
  `WAIT_FOR_SAFE_FLAG`, or where the switch isn't visible on-chain. The check uses the non-FCR
  transfers of the last 30 days.

## What is kept

No per-transfer data. Two files, both written by `run.mjs`:

- `data/time-saved.json`: totals per integration and route. This is what the site and docs show. It also includes:
  - the "typical" time with FCR and the typical floor (each day's median, weighted by its transfers);
  - the check: transfers measured, how many beat the floor, and the closest any came.
- `data/time-saved-daily.json`: the same per integration, route and day, for charts. One line per day:

```json
{"date":"2026-10-20","fcr":{"transfers":28,"savedSeconds":26614,"slowerThanFloor":0,"medianSeconds":22,"medianFloorSeconds":948}}
{"date":"2026-09-20","check":{"transfers":18,"beatFloor":0,"minAboveFloorSeconds":40,"medianAboveFloorSeconds":25000}}
```

**How a run works:**
- Each run re-measures the **last 3 full days** from the chain, to catch transfers that arrive late, and replaces those days. After missed or failed runs it reaches back to the days still open at the last good run, so the gap is filled.
- Older days are final.
- Check days that leave the 30-day window are dropped. FCR days stay.
- `--full` rebuilds everything from scratch.
- The data check fails the build if the daily file doesn't add up to the totals.

**What a failure does:** an integration that fails keeps its last good numbers, marked `stale`. The others still
update, and the run exits non-zero. The workflow commits what succeeded, then fails so it
shows up.

**Size:** each integration adds roughly one line per route per day, so a few kB a year, whatever its
volume. The cost that grows with volume is RPC calls for the 3 re-measured days, for example ~1,300 Base receipts a
day. `L2_RPS` and private RPC secrets raise that ceiling.

```
run.mjs                 runs every integration; writes the two data files
lib/baselines.mjs       the floors
lib/rpc.mjs             JSON-RPC helpers (retries, chunked eth_getLogs, block by timestamp)
lib/opstack.mjs         deposits for any OP Stack chain (computes each L2 deposit hash from the
                        Ethereum log, so arrival is one receipt lookup per deposit)
integrations/<id>.mjs   one file per integration
```

The site counts an integration once its entry in `data/integrations.json` is published
(not a draft), the same rule as the partner logos.

## Adding an integration

1. If it already uses FCR, give it an entry in `data/integrations.json`; the `id` must match.
2. Add `integrations/<id>.mjs`. For an OP Stack chain, copy `base.mjs` and change the portal and
   RPC. Otherwise:

```js
export default {
  id: 'acme',                           // as in data/integrations.json
  name: 'Acme',
  attribution: 'date',                  // or 'flag'
  fcrSince: '2026-11-03T14:00:00Z',     // between its last slow and first fast transfer; null if not yet
  routes: [{
    id: 'deposits',
    name: 'Deposits from Ethereum',
    baseline: { kind: 'blocks', blocks: 15 },  // what it waited for before
    contracts: { ethereum: '0x…' },
    // Completed transfers that started at or after `from` (unix seconds):
    // { start, end, fcr? }; start/end are block timestamps (other fields are ignored).
    fetch: async ({ from }) => ({ transfers: [...], pending: 0 }),
  }],
}
```

3. Run `node scripts/time-saved/run.mjs acme`, then `npm run build`.

**Planned integrations and how to measure each:**

| Integration | Attribution | Old rule | Arrival |
|---|---|---|---|
| Gnosis Chain (live) | `date`, 7 Oct 2026 | `finality` | Gnosis completion event |
| Base (measured, not using FCR) | `date`, null | `blocks: 14` | `lib/opstack.mjs` |
| OP Mainnet | `date` | `blocks: 6` (check it) | `lib/opstack.mjs` |
| Arbitrum One | `date` once its L1 nodes serve FCR as `safe` | `justified` | L2 retryable or deposit hash computed from the message, one receipt each |
| Chainlink CCIP | `flag` (message finality field) | `finality` | CCIP explorer data, spot-checked on-chain; one RPC per destination chain otherwise |
