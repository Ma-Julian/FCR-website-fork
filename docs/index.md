# What is FCR?

The **Fast Confirmation Rule (FCR)** lets you treat an Ethereum block as safe to act on in as little as 24 seconds, instead of waiting a number of blocks or about 13 minutes for finality.

It works by counting the attestations Ethereum's validators make for every block. When enough of them have attested to a block, and the network is behaving normally, that block is **fast-confirmed**: it won't be reorged, under stated network and stake assumptions.

A one-year replay of mainnet through the clients' FCR code found 0 false confirmations: no block was fast-confirmed and then reorged. Its safety is formally verified in Lean 4, and it is covered by the Ethereum Foundation bug bounty. See [Security](./evaluate/security).

::: info About "24 seconds"
These docs say a block can be fast-confirmed in as little as 24 seconds. Today it can happen in 12. After the [Glamsterdam upgrade](https://forkcast.org/upgrade/glamsterdam/), expected at the end of 2026, `safe` points at the payload of the confirmed block's parent, so the minimum becomes 24 seconds. We use 24 seconds throughout so the docs stay true across the upgrade. These are FCR's own times; a bridge adds its own steps on top ([Gnosis Chain, measured](./reference/numbers#gnosis-chain-before-and-after-fcr)).
:::

## What you need to know

- **Served under `safe`.** Nodes that turned FCR on, and nodes running Nimbus, return the latest fast-confirmed block for the `safe` block tag.
- **Same validators.** There's no new committee, multisig or oracle. FCR counts the attestations Ethereum already produces.
- **Secure, but not final.** When the network is in exceptionally bad shape, FCR will most likely confirm more slowly than 24 seconds. In the worst case, a fast-confirmed block could be reorged, and `safe` could then move back to a lower block number, but never past the finalized block. Your product has to be able to handle that.
- **Use at least two clients.** Client implementations of FCR are new. We strongly recommend treating a block as fast-confirmed only when nodes running two different consensus clients agree on it. See [Security recommendations](./operate/security-recommendations#use-at-least-two-different-clients).
- **Use a provider that serves it, or your own node.** Some providers already serve FCR; many still return the justified block under `safe`. See [RPC providers](./integrate/rpc-providers).

## How ready it is

- **Clients.** Five of the six major consensus clients have FCR. Lighthouse (v8.3.0+), Prysm (v7.2.0+) and Lodestar (v1.44.0+) have it behind a flag. Nimbus has served it under `safe` by default since v26.6.0. Teku has it behind a hidden, experimental flag. Grandine doesn't have it. See [Client support](./reference/clients).
- **Your software.** Anything that already reads Ethereum's `safe` block picks up FCR as soon as its node turns it on, with no other change. Arbitrum Nitro does this by default. Software that waits a number of blocks or for `finalized` needs to read `safe` instead: a config change for some (Agglayer CDK), a code change for others (OP Stack, the ZK Stack, the Starknet sequencer, bridge validators that wait for finality). See [Rollups](./integrate/rollups) and [Bridges and messaging](./integrate/bridges).

## Where to start

| You want to | Read |
| --- | --- |
| Decide whether FCR is safe enough for you | [How FCR works](./evaluate/how-it-works), [Assumptions and attacks](./evaluate/assumptions-and-attacks), [Security](./evaluate/security), [Compare with alternatives](./evaluate/comparison) |
| Try it | [Quick start](./integrate/quick-start), [Run a node with FCR](./integrate/run-a-node) |
| Integrate it in a rollup | [Rollups](./integrate/rollups): [Arbitrum Nitro](./integrate/arbitrum-nitro), [OP Stack](./integrate/op-stack) |
| Integrate it in a bridge or messaging protocol | [Bridges and messaging](./integrate/bridges), with Gnosis's implementation as an example |
| Serve it from an RPC service | [RPC providers](./integrate/rpc-providers) |
| Credit deposits at an exchange or custodian | [Exchanges and custodians](./integrate/exchanges) |
| Roll it out safely | [Test and roll out](./integrate/rollout) |
| Run it in production | [Monitoring](./operate/monitoring), [Reorgs and fallback](./operate/reorgs-and-fallback), [Security recommendations](./operate/security-recommendations) |

## Who uses it

**Gnosis** has run FCR in production since 7 October 2026 for Ethereum deposits through the xDAI bridge and Omnibridge. Its bridges now wait for FCR instead of finality ([before and after, measured](./reference/numbers#gnosis-chain-before-and-after-fcr)). See [Bridges and messaging](./integrate/bridges#example-gnosis-bridges).

**Chainlink** is testing FCR: it is built into CCIP 2.0 and live on testnet, with mainnet lanes next. See [Bridges and messaging](./integrate/bridges#example-chainlink-ccip-2-0).
