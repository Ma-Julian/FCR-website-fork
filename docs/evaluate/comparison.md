# Compare FCR with the alternatives

Four ways to decide an Ethereum block is safe to act on. We believe waiting *k* blocks is strictly worse than FCR: FCR is more secure, and usually faster.

|  | Wait *k* blocks | FCR (`safe` with FCR) | Justified (`safe` without FCR) | Finality |
| --- | --- | --- | --- | --- |
| Time to confirm | *k* × 12 s | As little as 24 s | 6–13 min | ~13 min |
| What it checks | Counts blocks | Attestations for the block, and that the current checkpoint will be justified and no conflicting one can be | Two-thirds of stake attested to an epoch checkpoint at or after the block | Two-thirds of stake attested to it, twice |
| Safety assumptions | None: it isn't proven safe under any assumptions | Proven safe if less than 25% of each committee is against it and the network is in sync | Argued safe if less than about 1/6 of stake is against it (less with proposer boost) and the network is in sync during and after the justification epoch | Proven safe unless a third of stake signs messages that can be slashed; no network assumption |
| What a reorg needs | Unknown: no analysis says how deep a reorg can go | More than 25% of a committee and an eclipse of your node | Delayed messages, so that about a third of validators miss a justification in time; an attacker can help by withholding attestations | A third of stake signing messages that can be slashed |
| Stake slashed if reorged | None | None | None | At least a third of staked ETH |
| Implementation risk | Low | Higher for now: new code that counts live network messages. Shrinks as the implementations mature; [use two clients](../operate/security-recommendations#use-at-least-two-different-clients) meanwhile | Low | Low |
| Track record | Used for years by exchanges and bridges | No false confirmations in a [one-year replay](./security#mainnet-track-record) of mainnet through the clients' FCR code; live at Gnosis bridges since October 2026; live on testnet in Chainlink CCIP 2.0 | Served under `safe` since the Merge (2022); no publicly reported reorg of a justified checkpoint on mainnet | No finalized block reverted since the Merge |
| Where you get it | Any node or RPC | Your own node, for now | Any node or RPC, under `safe` today | Any node or RPC, under `finalized` |
| When the network is unhealthy | Runs no checks, so it's more exposed to attacks | Runs [checks](./assumptions-and-attacks#when-the-assumptions-don-t-hold) and most likely confirms more slowly; in the worst case a fast-confirmed block is reorged | Stalls if less than two-thirds of stake attests; runs no further checks, so split views can still reorg it | Stalls until two-thirds is back |

## Which to use

**Our view:** use FCR or `finalized`. FCR is much faster and very secure; finality adds economic guarantees when you need them. Justification sits awkwardly in between: minutes slower than FCR, without finality's guarantees.

That said, FCR is not better on every count, so start from your own risk:

- **If you wait a number of blocks today,** switch to FCR: it's more secure, and usually faster. It counts attestations instead of assuming no reorg goes deeper than *k*. Some stacks already wait only a few blocks; for them FCR is mostly about the guarantee, not the speed: see [OP Stack](../integrate/op-stack).
- **If you wait for justified today,** the choice depends on what worries you more:
  - *Software bugs, or running your own nodes:* justified uses simple, long-tested code and is available from any RPC provider.
  - *A network-level attack, or the cost of waiting:* FCR is 6–13 minutes faster, checks more than justification does, and needs a much harder attack to fool. Run [at least two clients](../operate/security-recommendations#use-at-least-two-different-clients) to cover the implementation risk.
- **If neither is acceptable,** wait for `finalized`.

## About justification

**Justification isn't a confirmation rule.** It's a step on the way to finality, and `safe` borrowed it as a stopgap. `safe` was always meant to point at a block confirmed close to the head of the chain. When it was proposed around the Merge ([execution-apis PR #93](https://github.com/ethereum/execution-apis/pull/93), October 2021), it was described as a recent block protected by the attestations seen for it, under synchrony and honesty assumptions, with the exact algorithm still to be defined. In 2022, client teams picked the justified checkpoint as an interim answer ([All Core Devs #134](https://github.com/ethereum/pm/blob/7c36d36453dc0fe9e423ba073d38396c5f042fc5/AllCoreDevs-EL-Meetings/Meeting%20134.md#L116)), and the [safe-block spec](https://github.com/ethereum/consensus-specs/blob/c97cc6f4dc8c3a25c7727b5aba859df00e6c4c9c/fork_choice/safe-block.md) called it a stopgap, to be improved later. FCR is that improvement: the consensus spec now defines `safe` as the fast-confirmed block.

In the meantime, some applications have come to rely on `safe` meaning the justified block. That raises backwards-compatibility concerns as nodes and RPC providers switch: see [below](#if-you-rely-on-safe-meaning-justified) and [RPC providers: backwards compatibility](../integrate/rpc-providers#backwards-compatibility).

Some facts to weigh:

- **Reverting a justified block isn't slashable.** Slashing protects finalized checkpoints, and catches conflicting justifications within the same epoch. Validators can attest to a justified checkpoint in one epoch and to a competing branch in the next without signing anything slashable.
- **It can be reorged when the network is out of sync.** If enough validators don't see a justification in time, because messages are delayed or an attacker withholds attestations while honest views are split, a later justification on a competing branch takes over and fork choice follows it. We reproduced this in the executable consensus spec, with no slashable message signed. Known variants are the [bouncing attack](https://ethresear.ch/t/6113) and [justification-withholding reorgs](https://notes.ethereum.org/@djrtwo/2023-fork-choice-reorg-disclosure).
- **Its safety argument needs a smaller attacker than FCR's.** Treating any justified checkpoint as confirmed is only shown to be safe if less than about 1/6 of stake is adversarial (less once proposer boost is counted), and the network stays in sync during the justification epoch and the voting after it. The execution API's own [definition of `safe`](https://github.com/ethereum/execution-apis/blob/main/src/schemas/block.yaml) promises no more than safety under honest-majority and synchrony assumptions; only `finalized` is crypto-economically secure. Measured in all stake rather than per committee, the gap is smaller than 25% versus 1/6 suggests: a fully consolidated attacker can occasionally reach 25% of a committee with about 18–20% of all stake (see [Committee share and total stake](./assumptions-and-attacks#committee-share-and-total-stake)).
- **A fresh justification is stronger.** A justification that every honest validator sees before the next epoch starts gives them all the same starting point for fork choice, and from then on it tolerates a much larger attacker, even if the network later goes out of sync. FCR uses exactly this case: at the start of an epoch it restarts from the justified checkpoint it observed in time.
- **Its implementation is simpler.** Justification is read from on-chain data with simple logic that has run for years. FCR is newer code that counts attestations as they arrive.

Justification roughly halves the wait compared with finality, at the cost of adding a synchrony assumption. Once that assumption is accepted, FCR cuts the wait much further, from minutes to seconds.

## If you rely on `safe` meaning justified

`safe` is a block tag, not a fixed rule: with FCR on, it returns the fast-confirmed block instead of the justified one, through the same methods. That is already true on nodes that turned FCR on, on Nimbus v26.6.0 or later, and at the [RPC providers that serve FCR](../integrate/rpc-providers). Most other providers haven't switched, because FCR isn't a clean upgrade for every customer: justification combined with extra checks of your own can be more secure in some settings.

If you need justification specifically, don't rely on `safe`. Read the justified checkpoint directly, from a beacon node's `/eth/v1/beacon/states/head/finality_checkpoints`. See [RPC providers: backwards compatibility](../integrate/rpc-providers#backwards-compatibility).
