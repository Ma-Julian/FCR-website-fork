# FAQ

## Does FCR need a hard fork?

No. It's a consensus-client feature each node runs locally. You turn it on with a flag.

## How much faster is it?

A block can be fast-confirmed in as little as 24 seconds, against about 13 minutes for finality.

## Is it as secure as finality?

No. Finality is backed by stake that would be burned to revert it. FCR gives a deterministic guarantee as long as the network is on time and less than 25% of each committee's stake acts against it ([how that relates to all stake](./evaluate/assumptions-and-attacks#committee-share-and-total-stake)). Its safety is [formally verified](./evaluate/security#formal-verification) under those assumptions. Use it where you wait a fixed number of blocks today; keep finality where you need economic security.

## Can a fast-confirmed block be reorged?

Yes, if the assumptions break: a network split, or more than 25% of a committee's stake acting against it. It's extremely unlikely and hasn't been observed in the past year of mainnet data. Re-check each block at finality so you'd know. See [Reorgs and fallback](./operate/reorgs-and-fallback).

## What happens when the network is slow?

FCR most likely confirms more slowly: `safe` pauses, and if FCR can't re-confirm its block, it resets to the finalized block. In the worst case, a fast-confirmed block could be reorged. See [Reorgs and fallback](./operate/reorgs-and-fallback).

## Can an attacker slow it down?

Yes, by not attesting, but it can't make FCR confirm a wrong block that way. If more than 5% of a committee doesn't attest in time (an attacker plus any offline or late validators), confirmation takes one extra slot; more than 15%, two; more than about 18%, three; more than 20%, four or more. See [why withholding slows FCR down](./evaluate/assumptions-and-attacks#why-withholding-slows-fcr-down).

## Can I use my RPC provider?

Yes, if it serves FCR. Some providers already do; many still return the justified block under `safe`, so check what you get. See [RPC providers](./integrate/rpc-providers).

## Does FCR change my rollup's security model?

It changes which L1 blocks your rollup builds on, not how it handles them. A rollup that reads L1 before finality already handles L1 reorgs, and FCR makes them much less likely for the blocks it reads. A rollup that reads at `finalized` today has to add L1 reorg handling before it switches. See [Rollups](./integrate/rollups#how-stacks-handle-l1-reorgs-today).

## Do I need a new endpoint?

No. Keep using `eth_getBlockByNumber("safe")` and other methods that take a block tag. See [APIs](./reference/apis).

## Is there a bug bounty?

Yes. FCR is in scope of the [Ethereum Foundation bug bounty](https://ethereum.org/bug-bounty/). See [Security](./evaluate/security#bug-bounty).

## Which clients support it?

Lighthouse, Prysm, Nimbus, Lodestar and Teku. Grandine doesn't. See [Client support](./reference/clients).
