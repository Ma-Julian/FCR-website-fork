// The course of one run: where the honest and red attestations, potholes and the eclipse are.
// Pure (no DOM), so scripts/game/check-courses.mjs can test it and the game can prove each
// course before it starts.
//
// Two promises hold for every course the game hands out (verifyCourse checks both):
// 1. Fast confirmation at 24 s is possible even after hitting POTHOLES_ALLOWED potholes: some
//    path collects enough honest attestations by the first check, with POTHOLES_ALLOWED ×
//    POTHOLE_LOSS to spare, without counting a red attestation.
// 2. The eclipse is a real threat: some path counts enough red attestations to pass the 25%
//    limit, so a careless driver can lose the run.
// The proof is clairvoyant: it doesn't model that attestations only show up DROP_S ahead.
import { EDGES } from '../intro/bridge-world.js'
import { SLOT_S, RUN_SLOTS, neededCount, redLimit, committeesAt, POTHOLE_LOSS, POTHOLES_ALLOWED } from './rules.js'

export const V = 1875 // world px per second at full speed
export const LANE_W = EDGES[1] - EDGES[0]
export const laneX = (i) => (EDGES[i] + EDGES[i + 1]) / 2
export const TRUCK_LANES = [1, 2, 3, 4] // the boom covers the truck's lane and both neighbours
export const START_LANE = 2
export const STEER = 900 // sideways speed, world px per second
export const TRUCK = { z: 440, len: 150, w: 92, h: 70 } // rear of the truck sits z px in front of the camera
export const HEAD_R = -(TRUCK.z - TRUCK.len - 18) // attestations are hoovered when they reach this line
export const BODY_R = -(TRUCK.z - TRUCK.len / 2) // potholes hit under the middle of the truck
export const FIRST_CHECK_D = RUN_SLOTS * SLOT_S * V

// Waves are full (2 or 3 attestations) and frequent so a committee is ~170 attestations: at 95%
// that leaves the 6+ spare that three potholes (3 × POTHOLE_LOSS) can cost.
const WAVE_S = 0.33 // honest attestations arrive in a wave every 0.33 s
const RED_S = 0.125 // the adversary's waves during an eclipse
const RED_WAVES = 54 // enough to pass 25% of the largest committee a course produces (checked)
const BURST_S = 0.22 // the held-back honest waves after it
const COVER_LEAD = 0.25 // the covers close this long (s) before the first red wave
const GAP_MOVES = 0.4 // share of red waves on which the two-lane gap in the red wall shifts a lane
const POTHOLE_CHANCE = 0.45 // per calm wave
// Asynchrony: every attestation, honest or red, only shows up this long (s) before it reaches you.
export const LATER_WAVES = 72 // waves per slot after the first check (every 1/6 s), carrying one committee
export const DROP_S = 0.7

// Where the head line is at a check, and which lanes a truck in lane T collects from:
// its own and both neighbours, or only its own while two vacuums are covered.
export const checkW = (finishD) => finishD + HEAD_R
export const collects = (T, lane, capped) => (capped ? lane === T : Math.abs(lane - T) <= 1)

const clamp = (l, a, b) => Math.max(a, Math.min(b, l))

export function createCourse(rng) {
  const eclipseAt = (5 + rng() * 4) * V // between 5 s and 9 s, so its backlog lands before 24 s
  const eclipseEnd = eclipseAt + (RED_WAVES * RED_S + 4) * V
  const c = {
    objects: [], honestWs: [], eclipse: null,
    nextW: 1.0 * V, prevStart: 1, held: 0, heldT: 0, redLeft: 0, gap: 2,
  }

  c.isCapped = (headW) => !!c.eclipse && headW >= c.eclipse.capFrom && headW < c.eclipse.capTo
  c.committee = (finishD) => {
    const w = checkW(finishD)
    let n = 0
    for (const x of c.honestWs) if (x <= w) n++
    return n
  }

  const envelope = (w, lane, red) => {
    c.objects.push({ kind: 'envelope', w, lane, red })
    if (!red) c.honestWs.push(w)
  }

  function honestWave(w, potholeChance, count = rng() < 0.75 ? 3 : 2) {
    const start = clamp(c.prevStart + Math.floor(rng() * 3) - 1, 0, 3)
    c.prevStart = start
    const lanes = [start, start + 1, start + 2].sort(() => rng() - 0.5).slice(0, count)
    for (const l of lanes) envelope(w, l, false)
    if (rng() < potholeChance) {
      // A pothole goes on your line: usually in a lane you would sit in to collect the whole wave.
      // It never blocks the wave, though: at least one other lane that collects it all stays clear.
      const fits = TRUCK_LANES.filter((T) => lanes.every((l) => collects(T, l, false)))
      const ok = (P) => fits.some((T) => T !== P)
      const onLine = fits.filter(ok)
      const free = [0, 1, 2, 3, 4, 5].filter(ok)
      const P = onLine.length && rng() < 0.8 ? onLine[Math.floor(rng() * onLine.length)] : free[Math.floor(rng() * free.length)]
      const pw = w - 0.3 * V + (HEAD_R - BODY_R)
      c.objects.push({ kind: 'pothole', w: pw, lane: P })
      c.objects.push({ kind: 'hazard', w: pw - 10, lane: P })
    }
  }

  function redWave(w) {
    // A wall of red across every lane but a gap exactly two lanes wide (lanes c.gap and c.gap + 1).
    // The gap shifts one lane on GAP_MOVES of the waves (bouncing off the edges); consecutive gaps
    // always share a lane, so you only have to move when it keeps drifting the same way.
    if (rng() < GAP_MOVES) {
      const steps = [c.gap - 1, c.gap + 1].filter((g) => g >= 1 && g <= 3)
      c.gap = steps[Math.floor(rng() * steps.length)]
    }
    for (let l = 0; l < 6; l++) if (l !== c.gap && l !== c.gap + 1) envelope(w, l, true)
  }

  // After the first check every slot is one more committee, the same size as the first: its
  // honest attestations are spread over LATER_WAVES waves of one or two.
  const cw1 = checkW(FIRST_CHECK_D)
  const slotW = SLOT_S * V
  const laterGap = slotW / LATER_WAVES
  let quota = []
  function laterWave(w) {
    const i = Math.round((w - cw1) / laterGap - 0.5) % LATER_WAVES
    if (i === 0 || !quota.length) {
      const n1 = c.committee(FIRST_CHECK_D)
      quota = Array.from({ length: LATER_WAVES }, (_, j) => Math.floor(n1 / LATER_WAVES) + (j < n1 % LATER_WAVES ? 1 : 0))
      quota.sort(() => rng() - 0.5)
    }
    honestWave(w, POTHOLE_CHANCE, quota[i])
  }

  c.plan = (untilW) => {
    while (c.nextW <= untilW) {
      const w = c.nextW
      if (w > cw1) {
        if (!c.later) { c.later = true; c.nextW = cw1 + laterGap / 2; continue }
        laterWave(w)
        c.nextW += laterGap
        continue
      }
      if (!c.eclipse && w >= eclipseAt) {
        c.eclipse = { capFrom: w - COVER_LEAD * V, from: w, to: w + RED_WAVES * RED_S * V }
        c.eclipse.capTo = c.eclipse.to
        c.redLeft = RED_WAVES
        c.gap = clamp(c.prevStart + 1, 1, 3)
      }
      if (c.redLeft > 0) {
        // Eclipse: honest attestations are held back and the adversary's arrive instead.
        redWave(w)
        c.redLeft--
        c.heldT += RED_S
        while (c.heldT >= WAVE_S - 1e-9) { c.held++; c.heldT -= WAVE_S }
        c.nextW = c.redLeft ? w + RED_S * V : c.eclipse.to + 0.2 * V
        continue
      }
      if (c.held > 0) {
        // After the eclipse, the held-back honest attestations arrive in quick waves.
        honestWave(w, 0)
        c.held--
        c.nextW += BURST_S * V
        continue
      }
      const calm = w > 2.2 * V && !(w > eclipseAt - 1.4 * V && w < eclipseEnd)
      honestWave(w, calm ? POTHOLE_CHANCE : 0)
      c.nextW += WAVE_S * V
    }
  }

  return c
}

// The best a driver can do on this course, found by dynamic programming over the moments
// something reaches the truck. The truck sits in one of four lanes and needs |Δlane| × lane
// width / steering speed seconds to change lanes, the same limits the game enforces.
function bestPath(events, gain) {
  let best = TRUCK_LANES.map((T) => (T === START_LANE ? 0 : -Infinity))
  const back = []
  let prevT = 0
  for (const { t, items } of events) {
    const dt = t - prevT
    const from = TRUCK_LANES.map(() => -1)
    best = TRUCK_LANES.map((T, i) => {
      const g = gain(T, items)
      if (g === -Infinity) return -Infinity
      let top = -Infinity
      TRUCK_LANES.forEach((T2, j) => {
        if (Math.abs(T - T2) * LANE_W <= STEER * dt + 1e-6 && best[j] > top) { top = best[j]; from[i] = j }
      })
      return top + g
    })
    back.push(from)
    prevT = t
  }
  // Walk back to recover the lane at each moment.
  let i = best.indexOf(Math.max(...best))
  const score = best[i]
  const lanes = []
  for (let k = back.length - 1; k >= 0 && i >= 0; k--) { lanes.unshift(TRUCK_LANES[i]); i = back[k][i] }
  return { score, lanes }
}

export function verifyCourse(c, finishD = FIRST_CHECK_D) {
  const cw = checkW(finishD)
  const W = c.committee(finishD)
  const groups = new Map()
  for (const o of c.objects) {
    let t
    if (o.kind === 'envelope' && o.w <= cw) t = (o.w - HEAD_R) / V
    else if (o.kind === 'pothole' && o.w - BODY_R <= finishD) t = (o.w - BODY_R) / V
    else continue
    const k = t.toFixed(6)
    if (!groups.has(k)) groups.set(k, { t, items: [] })
    groups.get(k).items.push(o)
  }
  const events = [...groups.values()].sort((a, b) => a.t - b.t)
  const capped = (o) => c.isCapped(o.w)

  // 1. Honest attestations, with no pothole and no red attestation on the way.
  const honest = bestPath(events, (T, items) => {
    let g = 0
    for (const o of items) {
      if (o.kind === 'pothole') { if (o.lane === T) return -Infinity; continue }
      if (!collects(T, o.lane, capped(o))) continue
      if (o.red) return -Infinity
      g++
    }
    return g
  })
  // 2. Red attestations, whatever else happens.
  const red = bestPath(events, (T, items) => items.filter((o) => o.kind === 'envelope' && o.red && collects(T, o.lane, capped(o))).length)
  const bestHonest = honest.score, maxRed = red.score

  const need = neededCount(W, committeesAt(RUN_SLOTS))
  const spareNeeded = POTHOLES_ALLOWED * POTHOLE_LOSS
  const redNeed = redLimit(W) + 1
  return {
    W, need, spareNeeded, bestHonest, redNeed, maxRed, ok: bestHonest - spareNeeded >= need && maxRed >= redNeed,
    paths: { honest: { times: events.map((e) => e.t), lanes: honest.lanes }, red: { times: events.map((e) => e.t), lanes: red.lanes } },
  }
}
