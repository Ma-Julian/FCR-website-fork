// Proves the game's two promises over many random courses (see src/sections/game/course.js):
// 1. fast confirmation at 24 s is possible even after 3 potholes, with no red attestation;
// 2. the eclipse can be lost: enough red attestations can be counted to pass 25%.
// The game rerolls any course that fails; this reports how often generation alone keeps them.
//   node scripts/game/check-courses.mjs [runs=2000]
import {
  createCourse, verifyCourse, FIRST_CHECK_D, V, LANE_W, laneX, STEER, START_LANE, HEAD_R, BODY_R, checkW,
} from '../../src/sections/game/course.js'
import { isEclipsed } from '../../src/sections/game/rules.js'

// Drives a path through the game's own rules (game.js step()): continuous steering at STEER,
// attestations judged when they cross the head line, potholes under the truck's middle.
// The driver heads for the next required lane as soon as the previous moment has passed.
function drive(c, path, dt) {
  const objs = c.objects.filter((o) => o.kind === 'envelope' || o.kind === 'pothole').map((o) => ({ ...o, done: false }))
  const W = c.committee(FIRST_CHECK_D)
  let x = laneX(START_LANE), t = 0, k = 0, honest = 0, red = 0, potholes = 0, eclipsed = false
  while (V * t < FIRST_CHECK_D) {
    while (k < path.times.length && path.times[k] < t - 1e-9) k++
    const target = laneX(path.lanes[Math.min(k, path.lanes.length - 1)])
    x += Math.max(-STEER * dt, Math.min(STEER * dt, target - x))
    t += dt
    const d = V * t
    for (const o of objs) {
      if (o.done) continue
      const r = o.w - d
      if (o.kind === 'envelope' && r <= HEAD_R) {
        o.done = true
        if (o.w > checkW(FIRST_CHECK_D)) continue
        const capped = c.isCapped(o.w)
        if ([-1, 0, 1].some((off) => (!capped || off === 0) && Math.abs(laneX(o.lane) - (x + off * LANE_W)) < LANE_W * 0.5)) {
          if (o.red) { red++; if (isEclipsed(red, W)) eclipsed = true } else honest++
        }
      } else if (o.kind === 'pothole' && r <= BODY_R) {
        o.done = true
        if (Math.abs(laneX(o.lane) - x) < 52) potholes++
      }
    }
  }
  return { honest, red, potholes, eclipsed }
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const runs = Number(process.argv[2] || 2000)
let fail1 = 0, fail2 = 0, slackHonest = Infinity, slackRed = Infinity, W = [Infinity, 0], driveFail = 0, driven = 0
for (let seed = 1; seed <= runs; seed++) {
  const c = createCourse(mulberry32(seed))
  c.plan(FIRST_CHECK_D + 8000)
  const r = verifyCourse(c)
  if (r.bestHonest - r.spareNeeded < r.need) fail1++
  if (r.maxRed < r.redNeed) fail2++
  slackHonest = Math.min(slackHonest, r.bestHonest - r.spareNeeded - r.need)
  slackRed = Math.min(slackRed, r.maxRed - r.redNeed)
  W = [Math.min(W[0], r.W), Math.max(W[1], r.W)]
  // Replay both proofs through the game's rules at 60 fps and at the slowest frame the game allows.
  if (r.ok && seed % 4 === 0) {
    for (const dt of [1 / 60, 0.05]) {
      driven++
      const a = drive(c, r.paths.honest, dt), b = drive(c, r.paths.red, dt)
      if (a.honest - r.spareNeeded < r.need || a.potholes || a.red || !b.eclipsed) driveFail++
    }
  }
}
console.log(`Game courses: ${runs} checked, committee ${W[0]}–${W[1]} attestations.`)
console.log(`  24 s possible after 3 potholes:  ${runs - fail1}/${runs} (least spare beyond that: ${slackHonest})`)
console.log(`  eclipse can be lost:             ${runs - fail2}/${runs} (least spare: ${slackRed})`)
console.log(`  both paths driven through the game's rules: ${driven - driveFail}/${driven} replays held`)
// The game rerolls failures, so a rare one is harmless; frequent ones mean generation drifted.
if ((fail1 + fail2) / runs > 0.01 || driveFail) {
  console.error('Game course check failed: too many courses break a promise, or a proof did not hold in the game.')
  process.exit(1)
}
