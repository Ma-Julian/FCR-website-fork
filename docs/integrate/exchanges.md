# Exchanges and custodians

Exchanges credit Ethereum deposits after a number of confirmations, or once they're finalized. With FCR you can credit them once the deposit's block is fast-confirmed, in as little as 24 seconds, by counting attestations instead of blocks.

## Integrate

1. **Run an L1 node with FCR** behind your deposit watcher. See [Run a node with FCR](./run-a-node).
2. **Credit at `safe`.** Credit a deposit once its block number is at or below the `safe` block, instead of after *k* confirmations.
3. **Re-check at finality** and alert on any mismatch, as in [Gnosis's bridge validator](./bridges#example-gnosis-bridges).

If you want an extra margin, you can choose to keep waiting for `finalized` above a deposit size you set. That's up to you; FCR is built to handle large deposits too.

## Before you ship

Read [Reorgs and fallback](../operate/reorgs-and-fallback): when the network is unhealthy, deposits most likely wait longer, and in the worst case a fast-confirmed deposit could be reorged.
