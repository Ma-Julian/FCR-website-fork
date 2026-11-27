# ZK Stack

ZK Stack chains credit a deposit once their L1 watcher has read it from Ethereum. There are two servers, and neither can read L1 at `safe` today:

- **ZKsync Era** runs the original server ([zksync-era](https://github.com/matter-labs/zksync-era)). On mainnet it waits for L1 finality.
- **ADI Chain** runs the newer [ZKsync OS server](https://github.com/matter-labs/zksync-os-server). It waits a fixed number of L1 blocks, 2 by default.

Reading L1 at `safe` takes a small code change in either server.

## How it reads deposits today

Deposits from Ethereum are L1 priority transactions. The watcher reads them up to an L1 block it chooses as follows:

| Server | Setting | Value | Reads deposits up to |
| --- | --- | --- | --- |
| zksync-era (ZKsync Era) | `eth.watcher.confirmations_for_eth_event` | unset on mainnet | L1 `finalized`, about 13 minutes behind |
| zksync-os-server (ADI Chain) | `l1_watcher.confirmations` | `2` (default) | 2 blocks behind the L1 head, about 24 seconds |

Sources:
- zksync-era: [`confirmed_block_number`](https://github.com/matter-labs/zksync-era/blob/438a5e2fda4e53b2c7fb3809e6a88b4b6aef86c8/core/node/eth_watch/src/client.rs#L557-L564) returns the head minus `confirmations_for_eth_event` when it's set, and `finalized` when it isn't. The [mainnet config](https://github.com/matter-labs/zksync-era/blob/438a5e2fda4e53b2c7fb3809e6a88b4b6aef86c8/etc/env/file_based/overrides/mainnet.yaml#L22) leaves it unset.
- zksync-os-server: the priority transaction watcher uses a [`Confirmed` block boundary](https://github.com/matter-labs/zksync-os-server/blob/e29a2c0a584b7f3f985e9a414bfbe179456c093d/lib/l1_watcher/src/watcher.rs#L10-L13), which is the head minus [`confirmations`](https://github.com/matter-labs/zksync-os-server/blob/e29a2c0a584b7f3f985e9a414bfbe179456c093d/node/bin/src/config/mod.rs#L1385-L1387).

Measured on mainnet in October 2026: ZKsync Era deposits arrived 800–1,159 seconds after their L1 block, and ADI Chain deposits 2 blocks after it.

## What FCR changes

- **ZKsync Era:** deposits would wait for FCR, at minimum 24 seconds, instead of finality, about 13 minutes.
- **ADI Chain:** 2 blocks is already about 24 seconds. FCR's gain is the **guarantee**: 2 blocks is a guess that no reorg goes deeper, while a fast-confirmed block has been checked against attestations.

## The change

Both servers already choose between the L1 head minus *k* and `finalized`. Reading at `safe` adds a third choice:

- **zksync-era:** let `confirmed_block_number` return the L1 `safe` block, selected by a new setting, as it returns `finalized` today.
- **zksync-os-server:** add a `Safe` boundary next to `Confirmed` and `Finalized`. It follows the L1 `safe` header, as `Finalized` follows the finalized one. Then let the priority transaction watcher use it.

::: warning Not available upstream yet
Neither server has this setting in a release. If you run a ZK Stack chain and want to use FCR, [talk to us](/../#talk).
:::

## Handle L1 reorgs

A server that waits for finality never sees a deposit's L1 block reorged, so ZKsync Era has no automatic L1 reorg handling today. Before it reads at `safe`, it needs a way to drop a deposit it has read if L1 reorgs. With FCR that's very unlikely, but possible. See [Reorgs and fallback](../operate/reorgs-and-fallback).

## The L1 node

The L1 node the watcher reads from must run FCR. See [Run a node with FCR](./run-a-node).
