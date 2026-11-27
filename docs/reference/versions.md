# Versions and changes

## Specification

| Item | Where | Status |
| --- | --- | --- |
| The rule | `specs/phase0/fast-confirmation.md`, [consensus-specs PR #4747](https://github.com/ethereum/consensus-specs/pull/4747) | Merged; in spec releases from v1.7.0-beta.0 |
| Original algorithm | [consensus-specs PR #3339](https://github.com/ethereum/consensus-specs/pull/3339) | #4747 is a revised version |
| `fast_confirmation` event | beacon-APIs [PR #598](https://github.com/ethereum/beacon-APIs/pull/598), [PR #616](https://github.com/ethereum/beacon-APIs/pull/616) (`current_slot`) | Merged; in v5.0.0-beta.0 |

## Upcoming changes

- **Glamsterdam (Gloas).** The spec's Gloas version (`specs/gloas/fast-confirmation.md`) points `safe` at the confirmed block's parent payload, so the minimum time to fast-confirm a payload becomes 24 seconds.
- **A separate block tag.** Client teams have discussed a dedicated tag for fast-confirmed blocks, so RPC providers can keep `safe` as the justified block. It would need coordination across consensus and execution clients and is unlikely before Glamsterdam ([FCR call #9](https://ethereum-magicians.org/t/fast-confirmation-rule-fcr-9-june-23-2026/28619)).

## Changelog

| Date | Change |
| --- | --- |
| 19 Oct 2026 | Lighthouse v8.3.0: first release with `--enable-fast-confirmation` |
| 12 Oct 2026 | Lodestar v1.50.0: FCR no longer labelled experimental |
| 7 Oct 2026 | Gnosis switches its bridges' Ethereum side to FCR |
| 25 Sep 2026 | Prysm v7.2.0: first release with `--enable-fast-confirmation` |
| 17 Sep 2026 | Teku 26.9.0: first release with the hidden `--Xfast-confirmation-enabled` flag |
| 16 Sep 2026 | Gnosis bridge validator adds FCR mode ([PR #9](https://github.com/gnosischain/bridge-validator/pull/9)) |
| 3 Sep 2026 | consensus-specs v1.7.0-beta.0: first spec release with FCR (`specs/phase0/fast-confirmation.md`) |
| 1 Jul 2026 | Lodestar v1.44.0: first release with `--chain.fastConfirmation` (experimental) |
| 22 Jun 2026 | Nimbus v26.6.0: `safe` follows FCR by default again |
| 11 May 2026 | Nimbus v26.5.0: FCR turned off in the engine API (execution-client incompatibility) |
| 28 Mar 2026 | Nimbus v26.3.1: first release with FCR |

Grandine doesn't implement FCR.

## Get notified

- **Discussions:** the [FCR implementers' calls](https://ethereum-magicians.org/t/fast-confirmation-rule-fcr-9-june-23-2026/28619) on Ethereum Magicians, where changes are discussed first.
- **Releases:** each project's GitHub releases have an Atom feed you can subscribe to in a feed reader or Slack: add `.atom` to the releases URL, for example [consensus-specs](https://github.com/ethereum/consensus-specs/releases.atom), [Lighthouse](https://github.com/sigp/lighthouse/releases.atom), [Prysm](https://github.com/OffchainLabs/prysm/releases.atom), [Lodestar](https://github.com/ChainSafe/lodestar/releases.atom), [Teku](https://github.com/Consensys/teku/releases.atom) and [Nimbus](https://github.com/status-im/nimbus-eth2/releases.atom).
- **This page:** changes that affect integrators are added to the changelog above.
