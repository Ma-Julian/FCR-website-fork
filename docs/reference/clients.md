# Client support

FCR is a consensus-client feature. Support is rolling out client by client.

| Client | Status | How to turn it on |
| --- | --- | --- |
| Lighthouse | <span class="pill live">v8.3.0+</span> | `--enable-fast-confirmation` |
| Prysm | <span class="pill live">v7.2.0+</span> | `--enable-fast-confirmation` |
| Nimbus | <span class="pill live">v26.6.0+, on by default</span> | Nothing: `safe` is the fast-confirmed block |
| Lodestar | <span class="pill live">v1.44.0+</span> | `--chain.fastConfirmation` |
| Teku | <span class="pill dev">v26.9.0+, hidden, experimental</span> | `--Xfast-confirmation-enabled` |
| Grandine | <span class="pill">Not available</span> | Not available: `safe` is the justified block |

Last checked 22 Oct 2026 against each client's source code and releases.

::: tip Leave CPU headroom
FCR adds work on every slot. Lodestar describes it as computationally heavy: watch CPU headroom, and validator effectiveness if the node also serves validators. Teku's flag is hidden and experimental.
:::

## Lighthouse

Since v8.3.0 (19 Oct 2026). `--enable-fast-confirmation` computes a confirmed block every slot and feeds it into the execution client's `safeBlockHash`. Lighthouse's own description: confirmation "typically within 1–2 slots of the head". ([Source](https://github.com/sigp/lighthouse/blob/stable/beacon_node/src/cli.rs))

## Prysm

Since v7.2.0 (25 Sep 2026). `--enable-fast-confirmation` runs the rule and sends the confirmed block to the execution client as `safeBlockHash`. If the confirmed block isn't available (for example, briefly after finalization prunes fork choice), Prysm sends the unrealized justified block instead. That differs from the spec, which only ever exposes the confirmed block or, after a reset, the finalized block. It's a narrow edge case, and the unrealized justified block is never behind the finalized one. It also emits the `fast_confirmation` event on `/eth/v1/events`, and exports `beacon_fast_confirmation_*` metrics (confirmed slot, distance to head, reorgs, fallbacks). ([Source](https://github.com/OffchainLabs/prysm/blob/develop/beacon-chain/blockchain/service.go), [changelog](https://github.com/OffchainLabs/prysm/blob/develop/CHANGELOG.md))

## Nimbus

FCR is always on; there is no flag. Since v26.6.0 (22 Jun 2026), the execution client's `safe` is the fast-confirmed block. If that block is no longer known, Nimbus sends the finalized block. Nimbus first shipped FCR in v26.3.1, then turned it off in the engine API in v26.5.0 because of an execution-client incompatibility. The `fast_confirmation` event is available from v26.6.0. ([Source](https://github.com/status-im/nimbus-eth2/blob/unstable/beacon_chain/consensus_object_pools/attestation_pool.nim), [changelog](https://github.com/status-im/nimbus-eth2/blob/unstable/CHANGELOG.md))

## Teku

Since 26.9.0 (17 Sep 2026), off by default, behind the hidden flag `--Xfast-confirmation-enabled`. Teku's own description calls it experimental, and it isn't in Teku's changelog yet. ([Source](https://github.com/Consensys/teku/blob/master/teku/src/main/java/tech/pegasys/teku/cli/options/Eth2NetworkOptions.java))

## Lodestar

Since v1.44.0 (1 Jul 2026). It was labelled experimental until v1.50.0 (12 Oct 2026). With the flag on, the confirmed block is sent to the execution client as `safeBlockHash`; if it isn't available, Lodestar sends the finalized block (from v1.48.0; earlier versions sent a zero hash). While the node is syncing, FCR pauses and `safe` stays at the finalized block. ([Source](https://github.com/ChainSafe/lodestar/blob/unstable/packages/fork-choice/src/forkChoice/safeBlocks.ts))

| Option | Default | What it does |
| --- | --- | --- |
| `--chain.fastConfirmation` | Off | Runs the rule every slot |
| `--params.CONFIRMATION_BYZANTINE_THRESHOLD` | `25` | The share of stake (in %) the rule assumes may act against it |
| `--rest.namespace lodestar` | Off | Enables the `/eth/v1/lodestar/fast_confirmation` endpoint |

Lodestar describes the feature as new and computationally heavy: watch CPU headroom and validator effectiveness, and be ready to turn it off. ([Source](https://blog.chainsafe.io/fast-confirmation-in-lodestar/))

## Grandine

No FCR implementation: `safe` is the justified block. ([Source](https://github.com/grandinetech/grandine/blob/develop/fork_choice_store/src/store.rs))
