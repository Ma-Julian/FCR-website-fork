# Attacker share of one slot's committee (21 October 2026)

Question: FCR is proven safe if less than 25% of **each committee's** stake is adversarial. How
often does an attacker with a share β of **all** stake hold more than 25% of a slot's committee?

Used in `docs/evaluate/assumptions-and-attacks.md` ("Committee share and total stake"). Issue #17.

## Data

Active validators (`active_ongoing`, `active_exiting`, `active_slashed`) from
ethereum-beacon-api.publicnode.com at slot 15,479,993 (21 Oct 2026, ~14:00 CEST):

| | Validators | Effective balance | Share of stake |
| --- | --- | --- | --- |
| 0x00 credentials | 8,846 | 282,817 ETH | 0.6% |
| 0x01 credentials | 792,246 | 25,351,482 ETH | 57.9% |
| 0x02 (consolidated) | 23,945 | 18,122,975 ETH | 41.4% |
| **All** | **825,037** | **43,757,274 ETH** | |

0x02 balances: median 165 ETH, 75th percentile 1,816, 90th 1,979; 1,271 validators at exactly
2,048 ETH (5.9% of stake). A slot committee is ~25,782 validators and ~1.37M ETH; one 2,048 ETH
validator is 0.15% of a committee.

## Model

Each epoch the active set is shuffled (`compute_shuffled_index`) and split into 32 slot
committees; every validator is in exactly one, whatever its balance; votes weigh effective
balance. Attacker committee share R = attacker balance in committee / balance in committee.
R > 25% ⇔ Σ over members of (a_i − 0.25·b_i) > 0.

- **Saddlepoint** (Lugannani–Rice) on that sum, membership as independent Bernoulli(1/32).
- **Monte Carlo** of the real partition (random permutation cut into 32 committees) as a check.
- "Once every" = 12 s / P(one slot).

Attacker types:
- `max2048`: all attacker stake in 2,048 ETH validators (replacing the same ETH of honest 32 ETH
  validators). Worst case; used in the docs.
- `largest`: attacker owns the largest validators that exist today (Mikhail's worst case).
- `small`: attacker owns only 32 ETH validators.

## Results: P(attacker > 25% of one slot's committee)

| β | max2048: P(slot) | once every | largest: P(slot) | once every | small: P(slot) | once every |
| --- | --- | --- | --- | --- | --- | --- |
| 15% | 3.6e-14 | 1.1e7 years | 3.7e-15 | 1.0e8 years | 5.6e-102 | never |
| 16% | 1.8e-11 | 22,000 years | 2.5e-12 | 150,000 years | 2.4e-77 | never |
| 16.7% (1/6) | 6.5e-10 | 580 years | 1.2e-10 | 3,200 years | 7.6e-64 | never |
| 17% | 3.4e-9 | 114 years | 6.9e-10 | 553 years | 6.3e-58 | never |
| 18% | 2.9e-7 | 1.3 years | 8.3e-8 | 4.6 years | 1.6e-42 | never |
| 19% | 1.2e-5 | 11.5 days | 4.6e-6 | 30.5 days | 2.5e-30 | never |
| 20% | 2.6e-4 | 13 hours | 1.3e-4 | 1.1 days | 9.0e-21 | 4e13 years |
| 21% | 3.0e-3 | 1.1 hours | 1.9e-3 | 1.8 hours | 1.9e-13 | 2.0e6 years |
| 22% | 2.1% | 9.6 minutes | 1.6% | 12.8 minutes | 4.5e-8 | 8.4 years |
| 23% | 9.0% | 2.2 minutes | 7.7% | 2.6 minutes | 2.4e-4 | 14 hours |
| 24% | 25% | 48 s | 24% | 50 s | 4.3% | 4.6 minutes |
| 25% | 50% | 24 s | 50% | 24 s | 50% | 24 s |

Monte Carlo check (12,000 epochs = 384,000 slots each):

| Attacker | β | Saddlepoint P(slot) | Monte Carlo P(slot) | Slots over 25% (of 384,000) |
| --- | --- | --- | --- | --- |
| largest | 20% | 1.27e-4 | 0.94e-4 | 36 |
| max2048 | 21% | 3.04e-3 | 3.15e-3 | 1,210 |
| largest | 22% | 1.56% | 1.54% | 5,914 |
| small | 23% | 2.35e-4 | 2.11e-4 | 81 |

Agreement within simulation noise (20% row: 36 hits, ±17%). The saddlepoint is at most slightly
high, as expected: Bernoulli membership adds a little variance from the committee size, which is
fixed in reality. So the published intervals are, if anything, slightly too frequent.

## Comparison with the tables in the Telegram thread (Mikhail Kalinin, 24 Sep 2026)

- **Per-committee probabilities agree.** Largest validators: 20% → 1.32e-4 there vs 1.27e-4
  here; 22% → 1.56% vs 1.56%; 23% → 7.7% vs 7.7%. Small differences at 17–19% come from the
  validator set having changed (42.8M ETH then, 43.8M now, more consolidation).
- **The "Expected Interval" column is too short by up to 32×.** It is 12 s ÷ P(>25% in any of the
  32 committees of an epoch), e.g. 20% → 12 s / 0.42% = 47 minutes. But "any of 32" is a
  per-epoch probability (one per 6.4 minutes), so the interval is 384 s ÷ P(any of 32) ≈
  12 s ÷ P(one committee): about 25 hours at 20%, not 47 minutes. At 15–18% the interval column
  is also shifted one row against the probability columns (e.g. 11.4 months = 12 s / 4e-7, which
  is the 18% probability, but sits in the 17% row).
- So "17% can attack once a year" doesn't hold: 17% gives roughly once a century (worst case) to
  once in 550 years (today's largest validators). About once a year needs ~18%.
- The third table (labelled small validators in the thread) is a 50% 0x01 / 50% 0x02 attacker:
  its validator counts equal β·stake/2 / 32 + β·stake/2 / 2048. Its 17% row has shifted columns.
- Roberto's point holds: at exactly 25% of stake, an attacker exceeds 25% of a committee about
  half the time, whatever its validator sizes.

## Not modelled

- RANDAO manipulation (withholding the last block(s) of an epoch to re-roll the shuffle) would
  make the attacker somewhat luckier.
- Multi-slot confirmations count several committees together; their combined share fluctuates
  less. The numbers are for one committee (FCR's first check).
- An actual reorg needs more than this: eclipse of the observer and honest validators, the next
  proposer, and slashable double attestations (see the docs).

## Reproduce

```
curl -H 'Accept: application/json' -o validators.json \
  "https://ethereum-beacon-api.publicnode.com/eth/v1/beacon/states/head/validators?status=active_ongoing,active_exiting,active_slashed"
python3 committee_share.py validators.json --kinds max2048,largest,small
python3 committee_share.py validators.json --mc 12000 --kinds largest --betas 0.20
```
