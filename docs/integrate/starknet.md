# Starknet stack

Starknet and Paradex credit a deposit from Ethereum once the sequencer has read its L1-to-L2 message. The sequencer reads L1 a fixed number of blocks behind the head, 10 in its deployment config. It can't read L1 at `safe` today; that takes a small code change.

## How it reads deposits today

A deposit from Ethereum is a `LogMessageToL2` event on the Starknet core contract. The sequencer's L1 events scraper reads these events and passes them on as L1 handler transactions:

| Setting | Value | What it does |
| --- | --- | --- |
| `l1_events_scraper.finality` | `10` | Reads L1 events up to 10 blocks behind the L1 head, about 2 minutes. |
| `l1_events_scraper.polling_interval_seconds` | `30` | Scrapes L1 every 30 seconds. |
| `l1_events_provider.l1_handler_proposal_cooldown_seconds` | `70` | Waits 70 seconds before an L1 handler transaction can be proposed. |

Sources: the [scraper](https://github.com/starkware-libs/sequencer/blob/0e8dab024ca7dc9e367fd8655c2ab5e187b4c55d/crates/apollo_l1_events/src/l1_scraper.rs#L133-L143) takes the latest L1 block number minus `finality`, in [starkware-libs/sequencer](https://github.com/starkware-libs/sequencer). The values come from its [deployment config](https://github.com/starkware-libs/sequencer/blob/0e8dab024ca7dc9e367fd8655c2ab5e187b4c55d/deployments/sequencer/configs/jsonnet/lib/applicative_config/components/l1_events_scraper.libsonnet).

Measured on mainnet in October 2026: Starknet messages were included 204–235 seconds after their L1 block, and Paradex deposits 110–142 seconds after it, with 9–11 blocks on top.

## What FCR changes

The 10-block wait becomes FCR's, at minimum 24 seconds. 10 blocks is a guess that no reorg goes deeper; a fast-confirmed block has been checked against attestations. So deposits get both faster and better protected.

The 30-second poll and the 70-second cooldown come on top of the L1 wait, with or without FCR. Shorten them if you want deposits to arrive in well under a minute.

## The change

The scraper's ceiling is the L1 head minus `finality`. Reading at `safe` means taking the L1 `safe` block as the ceiling instead, chosen by a setting on the scraper. The base-layer client then also needs a call that returns the `safe` block number, next to the latest block number it uses today.

::: warning Not available upstream yet
The sequencer has no such setting in a release. If you run a Starknet stack chain and want to use FCR, [talk to us](/../#talk).
:::

## Handle L1 reorgs

At 10 blocks behind the head, the sequencer already assumes no L1 reorg goes deeper. With FCR, a reorg of a fast-confirmed block is very unlikely, but possible. Check how your sequencer handles an L1 message it has already read being reorged. See [Reorgs and fallback](../operate/reorgs-and-fallback).

## The L1 node

The L1 node the sequencer reads from must run FCR. See [Run a node with FCR](./run-a-node).
