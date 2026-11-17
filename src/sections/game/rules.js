// The rules of the F+C+R bridge game, kept apart from drawing so they can be checked
// against the spec. Numbers that come from the Fast Confirmation Rule spec
// (consensus-specs, specs/phase0/fast-confirmation.md) are marked "spec".
//
// How the game maps onto the spec:
// - An envelope is one unit of attestation weight. The first 24 s carry one committee: every
//   honest envelope sent before the first check line, including ones the eclipse held back.
//   Every slot you wait adds one more committee of exactly the same size (spec: all committees
//   weigh the same, total_active_balance / SLOTS_PER_EPOCH). The committees together (W) are the
//   spec's maximum_support: their full weight, whether or not their votes reach you.
// - Support is the envelopes you collected, all of them for your block: votes from later slots
//   are for its descendants, which count for it too (get_attestation_score counts the whole
//   subtree). In FCR support only falls if voters switch branches; in the game a pothole also
//   knocks POTHOLE_LOSS out (a game choice: in reality asynchrony delays votes to a later slot).
// - Waiting a slot therefore raises both sides: one more committee's votes become possible and
//   the threshold covers one more committee, but as a share it drops (95% → 85% → 81.7%).
// - The adversary's weight is never measured in the spec; it is assumed to be at most
//   CONFIRMATION_BYZANTINE_THRESHOLD (25%) of the committees' weight and added to the threshold.
//   In the game a red envelope is an adversary vote you were tricked into counting. More than
//   25% of the committee in red means the assumption the confirmation rests on is broken.

export const SLOT_S = 12 // spec: seconds per slot
export const RUN_SLOTS = 2 // the first check comes after two slots: 24 s
export const MAX_SLOTS = 4 // after this the run falls back to finality
export const BYZANTINE = 0.25 // spec: CONFIRMATION_BYZANTINE_THRESHOLD = 25 (%)
export const PROPOSER_BOOST = 0.4 // spec (fork choice): PROPOSER_SCORE_BOOST = 40 (% of one committee)
// A pothole knocks this many collected attestations out of the truck. (Less faithful than
// delaying them to the next slot, but clearer as a game; chosen by Julian, 21 Oct 2026.)
export const POTHOLE_LOSS = 2
// A course must allow a 24 s confirmation even if the driver hits this many potholes.
export const POTHOLES_ALLOWED = 3

// The first check weighs one committee, like the fastest real confirmation (the block's
// support comes from the next slot's committee). Every slot you wait adds a committee.
export const committeesAt = (slots) => Math.max(1, slots - 1)

// spec, compute_safety_threshold: (maximum_support + proposer_score) / 2 + adversarial_weight.
// With c committees as a share of their weight: 1/2 + boost/(2c) + 25%,
// so 95% for one committee, 85% for two, 81.7% for three (tending to 75%).
export const neededShare = (committees) => 0.5 + PROPOSER_BOOST / (2 * committees) + BYZANTINE

// spec, is_one_confirmed: support > safety threshold. Returned as the envelopes you need.
export const neededCount = (committee, committees) => Math.floor(neededShare(committees) * committee) + 1
export const isConfirmed = (support, committee, committees) => committee > 0 && support >= neededCount(committee, committees)

// Red envelopes you may count before the 25% assumption breaks.
export const redLimit = (committee) => Math.floor(BYZANTINE * committee)
export const isEclipsed = (red, committee) => red > redLimit(committee)

export const fmtTime = (s) => `${s.toFixed(1)} s`
export function fmtDuration(s) {
  if (s < 90) return `${Math.round(s)} s`
  const m = Math.floor(s / 60), r = Math.round(s % 60)
  return r ? `${m} min ${r} s` : `${m} min`
}
