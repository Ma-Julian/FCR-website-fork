# Assumptions and attacks

A fast-confirmed block won't be reorged as long as two assumptions hold. We explain here what the assumptions are and what attacks would look like.

## The assumptions

FCR depends on two assumptions. If these assumptions hold, a fast-confirmed block will with certainty be finalized eventually: the rule is deterministic, not probabilistic.

**1. The network is synchronous.** Attestations reach all honest validators by the end of the slot they were sent in. Validators attest 4 seconds into the 12-second slot, so this means within about 8 seconds of being sent.

**2. Less than 25% of each committee acts against it.** The rule budgets for up to a quarter of the stake in each slot's committee being adversarial, across the committees it counts. That is close to, but not the same as, 25% of all stake: see [Committee share and total stake](#committee-share-and-total-stake) below.

Honest validators whose attestations are late or missing count against that same 25% budget, just like adversarial ones. So the network only has to be synchronous for the validators FCR relies on: a few slow or offline validators don't break the assumption, as long as they and any attackers together stay below 25% of a committee. That makes the synchrony assumption less strict than it may initially appear.

### Committee share and total stake

The 25% is a share of one committee, not of all stake. The two are close, but an attacker with somewhat less than 25% of all stake can occasionally hold more than 25% of a committee. This is how Ethereum picks committees, not something specific to FCR, and on its own it doesn't break anything. Here is how it works and how often it happens.

**How committees are picked.** Every epoch, Ethereum shuffles all active validators and splits them into 32 committees, one per slot. Each validator lands in exactly one committee, whatever its balance, and its attestation counts with its balance. So a committee is a random sample of about 25,800 validators holding about 1.37 million ETH, and an attacker's share of a committee moves around its share of all stake, a little up in some slots and a little down in others.

**Why validator size matters.** Since the Pectra upgrade, a validator can hold up to 2,048 ETH (a consolidated validator, with 0x02 withdrawal credentials) instead of 32 ETH. Large validators make committees lumpier: an attacker whose stake sits in a few thousand large validators gets them in larger, rarer chunks than one whose stake sits in hundreds of thousands of small validators, so its committee share swings more. Today about 41% of stake is in consolidated validators.

**How often.** The table shows how often an attacker would hold more than 25% of one slot's committee, for the mainnet validator set of 21 October 2026.

| Attacker's share of all stake | Stake in 2,048 ETH validators (worst case) | Stake in 32 ETH validators |
| --- | --- | --- |
| 16% | Once in about 20,000 years | Never in practice |
| 17% | Once in about 100 years | Never in practice |
| 18% | Once in about 1.3 years | Never in practice |
| 19% | About once in 12 days | Never in practice |
| 20% | About twice a day | Never in practice |
| 21% | About once an hour | Once in about 2 million years |
| 22% | About every 10 minutes | Once in about 8 years |
| 23% | About every 2 minutes | About every 14 hours |
| 25% | Every other slot | Every other slot |

"Never in practice" means less than once in 10¹³ years. An attacker with exactly 25% of all stake holds more than 25% of a committee about half the time, whatever the size of its validators. An attacker with a mix of sizes sits between the two columns. One that bought up the largest validators that exist today comes close to the worst case: about once a day at 20%.

**What this means.**

- **Holding more than 25% of a committee is a precondition for an attack, not an attack.** To get a fast-confirmed block reorged, the attacker also has to control which attestations reach your node and which reach honest validators, and propose the next block. See [Large adversarial stake](#large-adversarial-stake) below. The attacker can't choose its slot either: committees are shuffled at random, and it learns its lucky slots only about an epoch ahead.
- **In terms of all stake, the practical bound is a bit below 25%.** A fully consolidated attacker needs about 18% of all stake to get past 25% of a committee once a year, and about 20% to do so daily. Below about 1/6 of stake, the bound under which [justification](./comparison) is argued safe, it happens less than once in 500 years.
- **Waiting longer helps.** When FCR needs more than one slot to confirm a block, it counts several committees together, and their combined share fluctuates less than a single committee's.
- **The numbers move with consolidation.** As more stake moves into large validators, both columns shift. Removing the effect entirely would mean picking committees by balance rather than by validator count, which is a change to Ethereum itself. The [research paper](https://arxiv.org/abs/2405.00549) and the [formal proof](./security#formal-verification) both state their guarantee per committee.

::: details How these numbers were calculated
We took the effective balance of every active validator on mainnet (825,037 validators, 43.76 million ETH, at slot 15,479,993) from a beacon node. For each attacker share, we gave the attacker validators worth that share of stake: 2,048 ETH validators in the worst case (replacing the same amount of honest 32 ETH validators, since the attacker re-stakes the same ETH), or 32 ETH validators. A committee holds more than 25% attacker stake when the sum over its members of (attacker balance − 25% × balance) is positive. We computed that probability with a saddlepoint approximation, treating each validator as in a given committee with probability 1/32, and checked it with a simulation of the real shuffle (random permutations split into 32 committees). "Once in" is 12 seconds divided by the probability for one slot.

The calculation doesn't model an attacker nudging the shuffle by withholding blocks at the end of an epoch (RANDAO manipulation), which would make it somewhat luckier.

For the script and full results, [ask us](/../#talk).
:::

## Attacks

Breaking one of the assumptions is necessary for an attack, but not enough. Controlling more than 25% of a committee doesn't by itself get a fast-confirmed block reorged: the attacker also has to control which attestations reach which validators.

An adversary may be able to cause a fast-confirmed block to reorg under one or both of these conditions:

- The adversary controls more than 25% of a committee's stake (with less than 25% of all stake this happens only occasionally; see [Committee share and total stake](#committee-share-and-total-stake)).
- The adversary causes the network to partition in a very precise way.

Based on the past year's mainnet data, the conditions that would cause FCR to reorg have not happened, and it's extremely unlikely for them to happen in the future. While it's impossible to pinpoint the exact likelihood, we're confident saying that FCR has comparable security assumptions to justification (which is what `safe` returns on nodes that haven't turned FCR on), while providing much lower latency.

### Large adversarial stake

How can an adversary attack FCR if they control 25% or more of a committee? The images below illustrate an attack.

![In slot t the observer sees 95.5% support for block B: 69.5% honest and 26% adversarial. B′ has 4.5%.](/images/attacks/fcr-attack-1-observer-view.png){.diagram}

In slot t, we observe attestations from 95.5% of the committee for block B, so we fast-confirm it. However, 26% of those attestations are actually adversarial, but we don't know that.

![Honest validators never received the adversary's 26% for B. To them B has 69.5%, and B′ has 4.5% + 26% + 40% proposer boost = 70.5%, so they vote for C on B′.](/images/attacks/fcr-attack-2-honest-view.png){.diagram}

In slot t+1, honest validators attest to B′, because from their perspective they never received the 26% for B. Instead, they received the 26% for B′, since the adversary attested to both B and B′. The math works out such that B′ has more support than B from the honest validators' perspective, because of a mechanism called proposer boost: the proposer of slot t+1, which the attacker controls, adds 40% weight to its block C on B′. So honest validators attest to C on B′ instead of B, and the fast confirmation of B is reorged.

For this attack to work, it's not enough that the attacker controls more than 25% of the committee. They also must propose the next block, and manipulate the network so that your node and honest validators see different attestations.

In practice, manipulating the network means eclipsing your node. Your node has to see the attacker's attestations for B but not those for B′, while honest validators see the reverse. If your node had honest peers, it would pass the attestations for B on to them, or receive the ones for B′ from them, and the attack would fail. Eclipse attacks are very hard to pull off: nodes pick their peers at random from a large peer-to-peer network, so an attacker can't easily surround one particular node.

### Network asynchrony

FCR's safety is proven under a network model known as synchrony, which roughly means that an attestation sent by an honest validator is received by all honest validators by the end of that slot: within about 8 seconds, since validators attest 4 seconds into the slot.

If this assumption sounds strong (what if just one honest validator goes offline?), keep in mind that any honest validator that has network issues is simply counted as adversarial, towards the 25% budget above. In practice, more than 25% of validators must have network issues or be adversarial for this model to be broken.

How could an adversary attack FCR if synchrony breaks? The simplest example is an eclipse attack. The attacker takes over all the peer-to-peer connections of your node, so everyone you talk to is an adversary. But attestations are signed, so controlling your neighbours doesn't let the attacker fake attestations: honest validators still have to attest to a fork themselves.

And because the network is a gossip network, honest validators can always spread their attestations across the whole network, unless they are eclipsed too. For the attacker to create a situation where only you see the attestations of some honest validators, they must eclipse both you and those honest validators. Only then could you fast-confirm a block that has overwhelming support from your perspective, while other nodes build on a competing branch.

![Top: the observer is eclipsed, but honest validator V is connected to the rest of the network, so V's attestation reaches everyone and the attack fails. Bottom: both the observer and V are eclipsed; the adversary relays V's attestation to the observer but blocks it from the rest of the network, and the attack works.](/images/attacks/fcr-eclipse-observer-vs-validator.png){.diagram}

**Eclipsing the observer alone does not stop a connected honest validator from gossiping the same attestations to the rest of the network. Your node can be completely surrounded by adversarial nodes, and this still does not break FCR.**

This attack is mostly theoretical: Ethereum's validator network is a randomised peer-to-peer network, so it's extremely unlikely that an attacker could eclipse both you and enough validators to get your fast confirmation reorged.

### Summary

| Attacker | Can they… | What you see |
| --- | --- | --- |
| Less than ~5% of stake | Nothing measurable | `safe` advances about once per slot |
| 5–25% of stake, withholding or delaying attestations | Delay confirmation (liveness) | One extra slot from 5%, two from 15%, three from about 18%, four from 20%; see [below](#why-withholding-slows-fcr-down) |
| More than 25% of a committee, plus the next block and control of the network | Break safety: get a fast-confirmed block reorged | A reorg of blocks you treated as confirmed |
| Network-level: eclipsing only your node | Feed your node a chosen view, but not forge attestations | FCR stalls and falls back; no false confirmation |
| Network-level: eclipsing your node and enough honest validators | Break synchrony for part of the network | FCR usually stalls and falls back; in rare cases a reorg |

Two things to note:

- **Safety and liveness fail differently.** Below 25% of a committee, an attacker can only slow FCR down; your application waits longer, as it would for finality. Breaking safety needs more than that, together with control over the network.
- **An attack needs your node to be eclipsed.** FCR runs on your own consensus client, using the attestations it has seen, so every safety attack above needs control over what your node sees. That is very hard against a node that picks its peers at random from the peer-to-peer network. A node with few or untrusted peers is easier to eclipse, so keep yours well connected. See [Security recommendations](../operate/security-recommendations).

### Why withholding slows FCR down

An attacker below 25% can't make FCR confirm a wrong block, but it can make it slower, by not attesting. Here's why, from the rule's check in the spec (`compute_safety_threshold`) and Section 5.1 of the [research paper](https://arxiv.org/abs/2405.00549):

- FCR confirms a block once the attestations supporting it, from the committees of the slots since the block, exceed a threshold. With *n* slots of committees counted, each of weight *W*, the threshold is **0.75 · n · W + 0.2 · W**: half of the possible votes plus the proposer boost (40% of one committee), plus the full 25% budget for adversarial votes.
- With one slot of attestations, that's 95% of a committee. An attacker who withholds more than 5% makes that impossible, so the block waits for the next slot's committee.
- With every extra slot, the proposer boost weighs less against the growing pool of votes, so the share needed drops: 85% of two committees, about 82% of three, 80% of four, approaching 75%.

So if a share *x* of a committee doesn't attest for the block, confirmation waits until *n* slots have passed, where *n* is the first number with 1 − *x* > 0.75 + 0.2 / *n*. The share *x* counts everything that doesn't attest in time: an attacker withholding, but also validators that are offline or late.

| Share not attesting | Slots of attestations needed | Extra delay |
| --- | --- | --- |
| Less than 5% | 1 | None |
| 5% to 15% | 2 | One slot |
| 15% to about 18% | 3 | Two slots |
| About 18% to 20% | 4 | Three slots |
| 20% to 25% | 5 or more, growing quickly towards 25% | Four slots or more |

On mainnet a few percent of attestations are normally late or missing, so an attacker's share adds to that. That's also why about 4 in 100 slots take longer than the minimum, with no attacker at all. The paper calls these numbers conservative: in practice confirmation may need fewer slots. The rule also checks that the epoch's checkpoint will be justified, which can add some delay around epoch boundaries when an attacker withholds a large share.

## When the assumptions don't hold

FCR runs a few checks on its own confirmed block. They catch some of the signs that its assumptions were broken, but not all of them, and they react after the fact. They don't make FCR fall back to finality in every bad case.

**Every slot, before moving forward.** FCR only advances `safe` to a block if:

- every block on the chain up to it is still winning fork choice with the attestations seen so far, with the 25% budget taken into account;
- for a block in the current epoch, the current epoch's checkpoint will be justified;
- no conflicting checkpoint can be justified, and the chain's justification isn't so old that fork choice could drop it in this or the next epoch.

If any of these fail, `safe` stays where it is. This is the common case on a slow network: confirmation is late, not wrong.

**Every slot, on the block already confirmed.** `safe` resets to the finalized block if the confirmed block is no longer on the node's canonical chain, or is older than the previous epoch. The first of these means the node has already seen a reorg of a block it confirmed: the check reports it, it doesn't prevent it.

**At the start of each epoch.** FCR re-checks the confirmed chain from the latest justified checkpoint it has seen, using the previous epoch's validator balances. If that chain no longer passes, `safe` resets to the finalized block. Because of this re-check, FCR only needs the network to have been synchronous since the start of the previous slot, not since the node started. At the start of an epoch FCR can also restart from the newly justified checkpoint, if that is more recent than its confirmed block.

**After a node restart,** confirmation starts again from the finalized block, unless the client restores the block it had confirmed before (the spec allows this only if the network has been synchronous for at least three epochs since the node went offline).

What the checks can't do: if the network was out of sync in a way your node didn't see, or an attack like the ones above succeeds, a fast-confirmed block can be reorged before any check fires.

This hasn't happened in the past year of mainnet data ([EthPandaOps replay](https://ethpandaops.io/posts/fcr-simulator/)). We strongly advise you to plan for it anyway: see [Reorgs and fallback](../operate/reorgs-and-fallback).

## What FCR is not

FCR is not economic finality. Reverting a finalized block would cost at least a third of all staked ETH. Reverting a fast-confirmed block has no such cost if the assumptions are broken. Where that matters, keep waiting for `finalized`.
