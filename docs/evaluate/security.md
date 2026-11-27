# Security

What backs FCR's security, and how to report a problem.

## At a glance

| | Status |
| --- | --- |
| Research | [Research paper on arXiv](https://arxiv.org/abs/2405.00549) |
| Specification | In the Ethereum consensus specs from v1.7.0-beta.0: `specs/phase0/fast-confirmation.md` ([PR #4747](https://github.com/ethereum/consensus-specs/pull/4747)) |
| Formal verification | Safety proved in Lean 4 ([fradamt/verified-fast-confirmation](https://github.com/fradamt/verified-fast-confirmation)) |
| Bug bounty | In scope of the [Ethereum Foundation bug bounty](https://ethereum.org/bug-bounty/) |
| Mainnet track record | No false confirmations in a one-year replay of mainnet through four clients' FCR code |
| In production | Gnosis bridges (xDAI bridge, Omnibridge) |
| Clients | Lighthouse v8.3.0+, Prysm v7.2.0+ and Lodestar v1.44.0+ behind a flag; Nimbus v26.6.0+ by default; Teku behind a hidden, experimental flag. See [Client support](../reference/clients) |

## Formal verification

Francesco D'Amato's (Ethlabs) [Lean 4 proof](https://github.com/fradamt/verified-fast-confirmation) shows that FCR is **safe**: once a block is fast-confirmed, from the next slot on, every honest node stores that block and keeps it in its chain. The Lean kernel checks the proof.

The proof holds under stated premises, which match the [assumptions](./assumptions-and-attacks): timely delivery of blocks and attestations from the start, honest behaviour within the stake threshold, and an idealised model of how validators are assigned to slots. The model leaves out slashings, exits and changes to the validator set, follows a Gloas version of the spec (a fork at tag `fcr-gloas-fix`), and covers a finite horizon. The repository lists what is still open, such as queries in the middle of a slot.

The [repository's README](https://github.com/fradamt/verified-fast-confirmation#readme) states the theorem, its assumptions and what it doesn't cover. The work has already paid off: adapting the proof to Gloas found a bug in the spec itself, since fixed in [consensus-specs PR #5672](https://github.com/ethereum/consensus-specs/pull/5672).

## Mainnet track record

EthPandaOps replayed mainnet through the FCR code of four consensus clients: Lighthouse for 12 months (29 May 2025 to 20 May 2026, 2.56 million slots), Lodestar from 31 December 2025, and Grandine and Teku from 28 January 2026. That is 5.15 million slot evaluations in all, counting each client's slots separately. There were **no false confirmations**: no client ever fast-confirmed a block that ended up off the finalized chain, including during the unstable period after the Fusaka upgrade on 4 December 2025. About 96 of every 100 slots would have been fast-confirmed within 12 seconds, one slot. ([EthPandaOps](https://ethpandaops.io/posts/fcr-simulator/))

This is a replay, not a live run. The clients ran their real FCR code on historical mainnet data, with some simplifications, mainly in which attestations each client saw and when. See the [EthPandaOps write-up](https://ethpandaops.io/posts/fcr-simulator/) for the details.

## Bug bounty

FCR is in scope of the Ethereum Foundation's bug bounty, which covers the consensus specs and the consensus clients (Grandine, Lighthouse, Lodestar, Nimbus, Prysm and Teku).

- **Rewards:** up to $2,000 (low), $10,000 (medium), $50,000 (high) and $1,000,000 (critical).
- **Report:** through the form on [ethereum.org/bug-bounty](https://ethereum.org/bug-bounty/). Don't report security issues in public channels.

## Audits

No security audit has covered FCR's spec or its client implementations yet. What it has instead:

- The spec was reviewed by client teams before it was merged ([consensus-specs PR #4747](https://github.com/ethereum/consensus-specs/pull/4747)).
- Its safety is [formally verified](#formal-verification), and that work has already found and fixed a spec bug.
- The spec and all client implementations are in scope of the [Ethereum Foundation bug bounty](#bug-bounty).

Client implementations are younger than the spec, which is why we [strongly recommend at least two different clients](../operate/security-recommendations#use-at-least-two-different-clients).
