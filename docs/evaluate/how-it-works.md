# How FCR works

## Attestations

Ethereum produces a block every slot (12 seconds). In each slot, a committee of about 1/32 of all validators attests to the block they see as the head of the chain. Over an epoch (32 slots), every validator attests once.

Today, most chains, bridges and exchanges don't rely on attestations. Instead, they count blocks: they consider an Ethereum block safe once a few blocks are built on top of it. Those that do rely on attestations usually wait for finality, which takes about 13 minutes.

FCR is based on attestations, which are what actually make a block canonical (counting blocks doesn't). The rule is very secure, and fast-confirms blocks in as little as 24 seconds.

## The rule

FCR counts the attestations directly. After the attestations for a slot are in, the consensus client asks: given the attestations it has seen, could any block other than this one become the head of the chain, even if up to 25% of stake were acting against it? If not, the block is **fast-confirmed**.

The rule runs every slot. It starts from a safe point the client already trusts and moves the confirmed block forward along the canonical chain. The result carries over to the next slot.

## Fast-confirmed, then finalized

A block goes through four states:

1. **Head:** the latest block. It can still be reorged.
2. **Fast-confirmed:** enough validators have attested to it that it will stay, unless FCR's assumptions break. As little as 24 seconds after it's proposed. This is what `safe` returns with FCR on.
3. **Justified:** two-thirds of stake has attested to an epoch checkpoint at or after it, usually 6–13 minutes after it's proposed. This is what `safe` returns without FCR, as a stopgap: justification is a step towards finality, not a confirmation rule. It is safe as long as the network stays in sync, but reverting it isn't slashable: if messages are delayed, it can be reorged without anyone losing stake. See [About justification](./comparison#about-justification).
4. **Finalized:** two-thirds of stake has locked it in, about 13 minutes after it's proposed. Reverting it would cost at least a third of all staked ETH.

## Where it's specified

FCR is specified in the Ethereum consensus specs as `specs/phase0/fast-confirmation.md` ([consensus-specs PR #4747](https://github.com/ethereum/consensus-specs/pull/4747), in releases from v1.7.0-beta.0). The research behind it is in the [research paper](https://arxiv.org/abs/2405.00549).

Next: [Assumptions and attacks](./assumptions-and-attacks) covers what FCR relies on and what can go wrong; [Security](./security) covers the proof, the bug bounty and the track record.

