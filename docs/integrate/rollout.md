# Test and roll out

A suggested way to roll FCR out. What fits best depends on your setup.

## 1. Check it against your history

Before acting on FCR, see what it would have done:

- **Backtest.** Replay your past events against FCR: for each, compare when it would have been fast-confirmed with when your current rule confirmed it. The [EthPandaOps FCR simulator](https://ethpandaops.io/posts/fcr-simulator/) replays a year of mainnet through the clients' own FCR code, so you can use its data instead of collecting your own.
- **Shadow mode.** Run a node with FCR next to your current setup and log, for each event, when it would have been confirmed under FCR (the first time its block is at or below `safe`). Once each block finalizes, check that it's the block FCR confirmed. A few days give you your own numbers.

## 2. Test failures

Make sure your code does the right thing when `safe` misbehaves:

| Test | Expected |
| --- | --- |
| The RPC rejects the `safe` tag | Fall back to `finalized`, alert |
| `safe` returns `null` (node still syncing) | Fall back to `finalized` for that cycle |
| `safe` stops advancing for several minutes | Keep waiting; nothing is processed twice |
| `safe` moves backwards | Nothing is processed twice; your record of the last block you processed doesn't move back |
| A processed block is replaced before finality | The re-check flags it and alerts |

Gnosis's bridge validator has tests for most of these against mock RPCs: see [`tests/`](https://github.com/gnosischain/bridge-validator/tree/main/bridge_validator/tests).


## 3. Go live

Make FCR a setting you can switch, so going back is easy. Gnosis did this with one setting per chain (`ETH_BLOCK_PROCESSING_MODE`): `fcr` reads up to `safe`, `block-finality` reads up to `finalized`. Then switch it on and watch the [monitoring](../operate/monitoring) signals.

## 4. Roll back, if needed

Switching the setting back returns you to your previous rule. Nothing else needs to change: blocks you processed under FCR either finalized as expected, or were flagged by your re-check.
