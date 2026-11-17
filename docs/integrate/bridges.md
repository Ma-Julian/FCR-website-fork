# Bridges and messaging

Before relaying a message from Ethereum, a bridge waits so that the transaction that sent it won't be reorged: some wait a number of blocks, others for finality. With FCR, a bridge can relay once the block is fast-confirmed, in as little as 24 seconds.

## What changes

| | Today | With FCR |
| --- | --- | --- |
| When a message is relayed | After *k* blocks, or ~13 min for finality | When its block is fast-confirmed |
| What it relies on | That no reorg goes deeper than *k* blocks | Attestations for the block, under stated assumptions |
| Capital locked while waiting | For the full wait | For as little as 24 s |

## Integrate

1. **Run an L1 node with FCR** behind every relayer or validator that watches Ethereum. See [Run a node with FCR](./run-a-node).
2. **Index up to `safe` instead of `finalized`.** Process events in blocks at or below the `safe` block. Keep your own "last processed" block number, and only process `(last processed, safe]`. Don't assume `safe` only goes up.
3. **Check that the RPC serves FCR.** At startup, check it accepts the `safe` tag; while running, check `safe` stays close to `latest` (see [RPC providers](./rpc-providers#don-t-assume-check)). If either fails, fall back to `finalized` and say so loudly.
4. **Re-check at finality.** Once a fast-confirmed block finalizes, compare its hash with the one you processed. If they differ, you acted on a reorged block: record it and alert.
5. **Keep finality for large transfers**, above a threshold you choose.

## Example: Gnosis bridges

Gnosis runs FCR in production for Ethereum deposits through the xDAI bridge and Omnibridge ([announcement coverage](https://thedefiant.io/news/infrastructure/gnosis-bridges-adopt-fast-confirmation-for-ethereum-deposits)). Their bridge validator, [gnosischain/bridge-validator](https://github.com/gnosischain/bridge-validator), is open source; the FCR change is [PR #9](https://github.com/gnosischain/bridge-validator/pull/9) and the design is in [`FCR_INTEGRATION.md`](https://github.com/gnosischain/bridge-validator/blob/main/FCR_INTEGRATION.md).

### Configuration

| Variable | Values | What it does |
| --- | --- | --- |
| `ETH_BLOCK_PROCESSING_MODE` | `fcr` or `block-finality` | Process Ethereum events up to `safe` (`fcr`) or `finalized`. |
| `GC_BLOCK_PROCESSING_MODE` | `fcr` or `block-finality` | The same for Gnosis Chain events. |
| `FCR_CHECK_INTERVAL_SECS` | seconds, default `30` | How often finalized blocks are re-checked. |

By default the Ethereum side runs in `fcr` mode and the Gnosis Chain side in `block-finality`. An unknown value stops the validator at startup instead of quietly falling back.

### How it works

- **Indexing:** in `fcr` mode, the indexer reads `eth_getBlockByNumber("safe")` and processes events up to that block. If no `safe` block is available yet, it falls back to `finalized` for that cycle and logs it.
- **Startup check:** it asks each configured RPC for `safe` and tells apart four answers: a block (supported), a JSON-RPC error (the provider doesn't support `safe`: misconfiguration, logged as an error), `null` (supported, no block yet) and a connection or HTTP failure (says nothing about support). Only if every provider that answered rejects `safe` does it switch that chain back to finality. This checks that `safe` is supported, not that it's FCR rather than the justified block.
- **Re-check at finality:** a separate task takes each block processed in `fcr` mode, waits until it's finalized, and compares its hash with the canonical block at that number. A mismatch is recorded in a `fcr_false_positives` table and logged as an error. Nothing is undone on-chain: a signature can't be taken back. The check is what makes a reorg visible.

This is a good template for any service that signs or relays based on Ethereum events.

## Example: Chainlink CCIP 2.0

CCIP 2.0 has a "faster than finality" mode that can wait for Ethereum's `safe` block. It is live on testnet; Chainlink switches it on for mainnet lanes next. Every layer (sender, receiver, token pool, executor and verifiers) has to opt into it. Fast transfers get their own rate limits and fees.
