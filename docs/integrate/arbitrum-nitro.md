# Arbitrum Nitro

Nitro already reads deposits at L1 `safe`. Turning FCR on in the L1 node that Nitro reads from is enough: deposits are included as soon as their L1 block is fast-confirmed, instead of when it's justified.

## How Nitro reads deposits

Deposits from Ethereum arrive as delayed messages. The delayed sequencer includes a delayed message once the L1 block holding it has passed a check, chosen by two settings:

| `use-merge-finality` | `require-full-finality` | Nitro waits for | With FCR on the L1 node |
| --- | --- | --- | --- |
| `true` (default) | `false` (default) | L1 `safe` | **Fast-confirmed block** |
| `true` | `true` | L1 `finalized` | No change (~13 min) |
| `false` | — | `finalize-distance` blocks behind the head (default 20) | No change |

Source: [`arbnode/delayed_sequencer.go`](https://github.com/OffchainLabs/nitro/blob/master/arbnode/delayed_sequencer.go) (`LatestSafeBlockHeader` when `RequireFullFinality` is false). If the L1 header doesn't show finality support, Nitro uses `finalize-distance` instead.

## Integrate

1. **Check your settings.** Keep the defaults:

   ```sh
   --node.delayed-sequencer.use-merge-finality=true
   --node.delayed-sequencer.require-full-finality=false
   ```

2. **Point the parent-chain connection at an L1 node with FCR on.** The sequencer's `--parent-chain.connection.url` must be an execution client paired with a consensus client running FCR. See [Run a node with FCR](./run-a-node).

3. **Check it's working.** The gap between a deposit's L1 block and its inclusion on L2 should drop from minutes to under a minute.

Arbitrum One and Arbitrum Nova run these defaults.

## What changes for your users

Today, with the default settings, a deposit waits for L1 justification: usually 6–13 minutes. With FCR it can be included in as little as 24 seconds.
