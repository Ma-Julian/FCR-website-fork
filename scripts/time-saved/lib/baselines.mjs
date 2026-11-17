// What a transfer would have waited for without FCR, as a floor: the earliest moment the old rule
// could have let it through. Time saved = floor − actual time, so the total is a lower bound.
// Each route in an integration names one baseline; add a kind here when an integration needs it.
//
// All floors are measured from the Ethereum block the transfer started in (its timestamp), and
// leave out everything the old path added on top (polling, signing, the destination's block time).

export const GENESIS = 1606824023 // Ethereum beacon chain genesis, 1 Dec 2020 12:00:23 UTC
export const SLOT = 12
export const EPOCH = 32

const slotOf = (t) => Math.floor((t - GENESIS) / SLOT)

export const BASELINES = {
  // Waited for the block to be finalized. A block is finalized with the first epoch checkpoint at
  // or after it (epoch c), and checkpoint c is finalized at the earliest when epoch c + 1 is
  // justified, at the start of epoch c + 2. So 768–1,152 s after the block; late finality only
  // adds to this, never subtracts.
  finality: {
    label: 'Ethereum finality',
    floor: (t) => {
      const c = Math.ceil(slotOf(t) / EPOCH)
      return GENESIS + (c + 2) * EPOCH * SLOT - t
    },
  },
  // Waited for `safe` before FCR, which clients served as the justified checkpoint. The first
  // checkpoint at or after the block (epoch c) is justified at the earliest at the start of epoch
  // c + 1, so 384–756 s after the block. (If a client exposed unrealized justification earlier,
  // the check against old transfers would catch it.)
  justified: {
    label: 'Ethereum justification',
    floor: (t) => {
      const c = Math.ceil(slotOf(t) / EPOCH)
      return GENESIS + (c + 1) * EPOCH * SLOT - t
    },
  },
  // Waited for n blocks on top of the transfer's block. Empty slots only make it longer.
  blocks: {
    label: (b) => `${b.blocks} Ethereum blocks`,
    floor: (t, b) => b.blocks * SLOT,
    check: (b) => Number.isInteger(b.blocks) && b.blocks > 0,
  },
  // A fixed delay the old rule always applied (e.g. a challenge or timeout window).
  seconds: {
    label: (b) => `${b.seconds} s`,
    floor: (t, b) => b.seconds,
    check: (b) => Number.isFinite(b.seconds) && b.seconds > 0,
  },
}

export function baselineOf(b) {
  const kind = BASELINES[b?.kind]
  if (!kind) throw new Error(`unknown baseline kind "${b?.kind}" (known: ${Object.keys(BASELINES).join(', ')})`)
  if (kind.check && !kind.check(b)) throw new Error(`baseline "${b.kind}" is missing its parameters`)
  return {
    label: typeof kind.label === 'function' ? kind.label(b) : kind.label,
    floor: (t) => kind.floor(t, b),
  }
}
