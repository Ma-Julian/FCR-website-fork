# Rollups

A rollup credits an Ethereum deposit once its node has read the deposit from L1. When it reads depends on the stack: some wait a fixed number of blocks behind the L1 head, some read at L1 `safe`, some wait for finality. FCR helps differently in each case.

| How your stack reads L1 today | What FCR changes |
| --- | --- |
| At L1 `safe` | Turn FCR on in your L1 node. `safe` moves from the justified block (~6–13 min) to the fast-confirmed block. No rollup change. |
| *k* blocks behind the L1 head | We believe waiting *k* blocks is dominated by FCR: FCR is more secure and usually as fast. We strongly suggest reading at L1 `safe` instead of head minus *k*. |
| At L1 `finalized` | Finality may be the right choice if you want no risk of a reorg even in extreme scenarios, and fast deposits from Ethereum matter little to you and your users. Otherwise, reading at `safe` gives the largest speed-up: from ~13 min to as little as 24 s. |

## By stack

| Stack | Reads L1 at | FCR | Guide |
| --- | --- | --- | --- |
| Arbitrum Nitro (Arbitrum One, Nova, and Orbit chains that settle on Ethereum) | `safe` (default) | Turn on in your L1 node | [Arbitrum Nitro](./arbitrum-nitro) |
| OP Stack | Head minus `--sequencer.l1-confs` (default 4) | A setting is under review upstream (op-node PR #23791) | [OP Stack](./op-stack) |
| ZK Stack (ZKsync Era, ADI Chain) | `finalized` (zksync-era on mainnet), or 2 blocks behind the head (ZKsync OS server) | Small code change: neither server has a `safe` option | [ZK Stack](./zk-stack) |
| Starknet stack (Starknet, Paradex) | 10 blocks behind the head (`l1_events_scraper.finality`) | Small code change: the scraper has no `safe` option | [Starknet stack](./starknet) |
| Agglayer CDK (X Layer, Katana) | `finalized` by default (`[L1InfoTreeSync] BlockFinality`) | Config change: `BlockFinality = "SafeBlock"` | [Agglayer CDK](./agglayer-cdk) |
| Other stacks | — | [Tell us](/../#talk) | — |

Checked against each stack's source code on 21 October 2026; ZK Stack, Starknet stack and Agglayer CDK on 17 November 2026. A chain's production settings can differ from its stack's defaults.

## What every rollup needs

1. **An L1 node with FCR** for the sequencer and for any node that derives deposits. See [Run a node with FCR](./run-a-node), or use an [RPC provider that serves it](./rpc-providers).
2. **Handle L1 reorgs.** If your stack reads L1 before finality, it already has to, and the main stacks do (see below). If it reads at `finalized`, it needs to add this before switching. With FCR, a reorg of a fast-confirmed block is very unlikely, but possible: the rollup then reorgs with L1, as it would today. See [Reorgs and fallback](../operate/reorgs-and-fallback).

## How stacks handle L1 reorgs today

A stack that reads L1 before finality must already cope with L1 reorgs, and FCR doesn't change how. It makes them much less likely for the blocks the rollup acts on.

- **OP Stack.** Verifier nodes follow the L1 head by default (`--verifier.l1-confs` 0), so they already handle L1 reorgs when they happen. When op-node sees a new L1 block whose parent doesn't match, it resets its derivation pipeline and re-derives the L2 chain from a common point; L2 blocks derived from the replaced L1 data are dropped. The sequencer picks its L1 origin 4 blocks behind the head (`--sequencer.l1-confs`) to make it less likely that its own blocks are affected, but a deeper L1 reorg reorgs them too. L2 blocks only count as finalized once the L1 data behind them is finalized.
- **Arbitrum Nitro.** The inbox reader follows the latest L1 block by default (`--node.inbox-reader.read-mode latest`) and rewinds delayed messages and sequencer batches when it detects an L1 reorg. Deposits are included once their L1 block is `safe`, which today is the justified block, so Nitro already depends on a block that isn't final; with FCR that block is fast-confirmed instead.
- **Agglayer CDK.** aggkit has a dedicated L1 reorg detector that its syncers use.
- **Stacks that wait for finality** (such as ZKsync Era) have no automatic L1 reorg handling today, because at finality they don't need it. To use FCR they need to add it: rewinding L1 messages they've read when L1 reorgs.

