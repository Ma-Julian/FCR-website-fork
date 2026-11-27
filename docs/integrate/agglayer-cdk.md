# Agglayer CDK

On Agglayer CDK chains such as X Layer and Katana, deposits from Ethereum go through the Agglayer bridge. A deposit can be claimed on L2 once the L2 has an L1 exit root that includes it. aggkit reads those exit roots from Ethereum and brings them to L2, and one setting decides how far behind the L1 head it reads. With FCR, you change that setting to `SafeBlock`; no code change.

## How it reads deposits today

aggkit's AggOracle injects into L2 the newest exit root that aggkit's L1 info tree syncer has read ([`oracle.go`](https://github.com/agglayer/aggkit/blob/f130d2af7b210856bb8dc924e10f83b5b204d813/aggoracle/oracle.go#L80-L82)). The syncer reads L1 up to the block set by `[L1InfoTreeSync] BlockFinality`:

| Setting | Default | What it does |
| --- | --- | --- |
| `[L1InfoTreeSync] BlockFinality` | `"FinalizedBlock"` | How far the syncer reads L1 exit roots, and so how soon deposits can be claimed on L2. |
| `[BridgeL1Sync] BlockFinality` | `"LatestBlock"` | How far the bridge indexer reads L1 deposits. Already the L1 head. |
| `[AggSender] BlockFinalityForL1InfoTree` | `"FinalizedBlock"` | Which exit root certificates to the Agglayer are proven against. Not on the deposit path. |

Each takes `FinalizedBlock`, `SafeBlock`, `LatestBlock` or `PendingBlock`, optionally with an offset such as `LatestBlock/-12`. Source: aggkit's [default config](https://github.com/agglayer/aggkit/blob/f130d2af7b210856bb8dc924e10f83b5b204d813/config/default.go#L104-L108) and its [notes on the L1 finality settings](https://github.com/agglayer/aggkit/blob/f130d2af7b210856bb8dc924e10f83b5b204d813/docs/aggsender.md#l1-finality-knobs).

Measured on mainnet in October 2026: X Layer runs the default, so exit roots reached L2 just after L1 finality. Katana's exit roots reached L2 12–15 blocks behind the L1 head, a shorter setting than the default.

## Integrate

1. **Read exit roots at L1 `safe`:**

   ```toml
   [L1InfoTreeSync]
   BlockFinality = "SafeBlock"
   ```

2. **Leave the other two settings as they are.** aggkit's own notes recommend relaxing only the syncer and keeping certificates on finalized exit roots. A certificate leaves out a claim whose exit root isn't final yet and includes it in a later one, so settlement stays as safe as today.

3. **If your chain uses the AggOracle committee,** each GER validator signs an exit root only once it's final by its own `BlockFinality`. Set theirs to `SafeBlock` as well, or the oracle still waits for them.

4. **Point aggkit's `L1URL` at an L1 node with FCR on.** See [Run a node with FCR](./run-a-node).

## What FCR changes

- **X Layer:** deposits could be claimed after FCR, at minimum 24 seconds, instead of after finality, about 13 minutes.
- **Katana:** 12–15 blocks is about 2.5–3 minutes. FCR is faster, and adds a guarantee: a block count is a guess that no reorg goes deeper, while a fast-confirmed block has been checked against attestations.

## Handle L1 reorgs

aggkit already has an L1 reorg detector that its syncers use, so reading before finality is supported. With FCR, a reorg of a fast-confirmed block is very unlikely, but possible. See [Reorgs and fallback](../operate/reorgs-and-fallback).
