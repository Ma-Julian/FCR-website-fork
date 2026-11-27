// Measures how much waiting FCR has saved. Writes two files:
//   data/time-saved.json        totals per integration and route (what the site shows)
//   data/time-saved-daily.json  the same per day, for charts
// No per-transfer data is kept: a run re-measures the last OPEN_DAYS full days from the chain
// and replaces them; older days are final. `--full` re-measures everything from scratch.
//
//   node scripts/time-saved/run.mjs            every integration in integrations/
//   node scripts/time-saved/run.mjs gnosis     one integration
//   node scripts/time-saved/run.mjs --full     from scratch
//
// For every transfer that used FCR:
//   time saved = earliest moment the old rule could have let it through − when it actually arrived
// so the total is a lower bound (lib/baselines.mjs). Transfers that did NOT use FCR are the check:
// none may beat the floor, or the baseline doesn't describe the old rule.
//
// Which transfers used FCR (`attribution`):
//   'date' (default)  every transfer from `fcrSince` on; the check is the 30 days before it.
//                     With fcrSince null the integration hasn't switched: only a rolling check.
//   'flag'            fetch() marks each transfer `fcr: true|false` (e.g. CCIP's per-message flag);
//                     the check is the non-FCR transfers of the last 30 days.
//
// An integration that fails keeps its last good numbers (marked stale); the others still update,
// and the run exits non-zero.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { baselineOf } from './lib/baselines.mjs'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const CHECK_DAYS = 30
const OPEN_DAYS = 3 // re-measured every run, for transfers that arrive late
const DAY = 86400
const args = process.argv.slice(2)
const full = args.includes('--full')
const only = args.filter((a) => !a.startsWith('--'))
const now = Math.floor(Date.now() / 1000)

const iso = (t) => new Date(t * 1000).toISOString().replace('.000', '')
const dayOf = (t) => iso(t).slice(0, 10)
const midnight = (t) => t - (t % DAY)
const median = (a) => {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y)
  return Math.round(s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2)
}
// Median over days, each day's median weighted by its transfers (the totals keep no transfers).
const weightedMedian = (pairs) => {
  const s = pairs.filter(([v, n]) => v !== null && n > 0).sort((a, b) => a[0] - b[0])
  const total = s.reduce((t, [, n]) => t + n, 0)
  let seen = 0
  for (const [v, n] of s) if ((seen += n) >= total / 2) return v
  return null
}

// One day of one route, from its transfers.
function summarizeDay(list, inCheck) {
  const fcr = list.filter((x) => x.fcr)
  const old = list.filter((x) => !x.fcr && inCheck(x.start))
  const d = {}
  if (fcr.length) d.fcr = {
    transfers: fcr.length,
    savedSeconds: fcr.reduce((s, x) => s + x.saved, 0),
    slowerThanFloor: fcr.filter((x) => x.saved < 0).length,
    medianSeconds: median(fcr.map((x) => x.seconds)),
    medianFloorSeconds: median(fcr.map((x) => x.floor)),
  }
  if (old.length) d.check = {
    transfers: old.length,
    beatFloor: old.filter((x) => x.seconds < x.floor).length,
    minAboveFloorSeconds: Math.min(...old.map((x) => x.seconds - x.floor)),
    medianAboveFloorSeconds: median(old.map((x) => x.seconds - x.floor)),
  }
  return d
}

async function measure(integration, prevDays, prevSummary) {
  const attribution = integration.attribution || 'date'
  // Days still open at the last good run are measured again: with daily runs that is the last
  // OPEN_DAYS, as always; after missed or failed runs it reaches back to them, so no day is left out
  // (the daily job didn't run from 3 to 27 Nov 2026).
  const lastRun = prevSummary?.measuredUntil ? Date.parse(prevSummary.measuredUntil) / 1000 : now
  const reopen = Math.min(midnight(now) - OPEN_DAYS * DAY, midnight(lastRun) - (OPEN_DAYS - 1) * DAY)
  if (!['date', 'flag'].includes(attribution)) throw new Error('"attribution" must be "date" or "flag"')
  const since = integration.fcrSince ? Date.parse(integration.fcrSince) / 1000 : null
  if (integration.fcrSince && !Number.isFinite(since)) throw new Error('"fcrSince" must be an ISO date or null')
  const check = attribution === 'date' && since ? { from: since - CHECK_DAYS * DAY, to: since } : { from: now - CHECK_DAYS * DAY, to: now }
  const inCheck = (t) => t >= check.from && t < check.to
  const firstFetch = attribution === 'date' ? check.from : Math.min(check.from, since ?? check.from)
  const routes = []
  const daily = {}

  for (const route of integration.routes) {
    const base = baselineOf(route.baseline)
    const prev = full ? {} : { ...(prevDays?.[route.id] ? Object.fromEntries(prevDays[route.id].map((d) => [d.date, d])) : {}) }
    const from = Object.keys(prev).length ? Math.max(firstFetch, reopen) : firstFetch
    const { transfers, pending } = await route.fetch({ from })
    const byDay = {}
    for (const t of transfers) {
      if (t.start < from) continue
      if (attribution === 'flag' && typeof t.fcr !== 'boolean') throw new Error(`${route.id}: fetch() must mark each transfer fcr: true|false`)
      const floor = base.floor(t.start)
      const x = { start: t.start, seconds: t.end - t.start, floor, saved: floor - (t.end - t.start), fcr: attribution === 'flag' ? t.fcr : since !== null && t.start >= since }
      ;(byDay[dayOf(t.start)] ||= []).push(x)
    }
    // Days from `from` on are replaced; older days stay as they were (final).
    const days = Object.fromEntries(Object.entries(prev).filter(([date]) => Date.parse(date) / 1000 + DAY <= from))
    for (const [date, list] of Object.entries(byDay)) {
      const d = summarizeDay(list, inCheck)
      if (d.fcr || d.check) days[date] = { date, ...d }
    }
    // Check days that left the window are dropped (a rolling check); FCR days stay forever.
    for (const [date, d] of Object.entries(days)) {
      const t = Date.parse(date) / 1000
      if (d.check && (t + DAY <= check.from || t >= check.to)) delete d.check
      if (!d.fcr && !d.check) delete days[date]
    }
    const list = Object.values(days).sort((a, b) => a.date.localeCompare(b.date))
    daily[route.id] = list
    const f = list.filter((d) => d.fcr).map((d) => d.fcr)
    const c = list.filter((d) => d.check).map((d) => d.check)
    routes.push({
      id: route.id,
      name: route.name,
      baseline: { ...route.baseline, label: base.label },
      contracts: route.contracts,
      transfers: f.reduce((s, d) => s + d.transfers, 0),
      savedSeconds: f.reduce((s, d) => s + d.savedSeconds, 0),
      slowerThanFloor: f.reduce((s, d) => s + d.slowerThanFloor, 0),
      typicalSeconds: weightedMedian(f.map((d) => [d.medianSeconds, d.transfers])),
      typicalFloorSeconds: weightedMedian(f.map((d) => [d.medianFloorSeconds, d.transfers])),
      pending,
      // The old rule against its floor: how many transfers beat it, and how close any came.
      check: {
        from: iso(check.from), to: iso(check.to),
        transfers: c.reduce((s, d) => s + d.transfers, 0),
        beatFloor: c.reduce((s, d) => s + d.beatFloor, 0),
        minAboveFloorSeconds: c.length ? Math.min(...c.map((d) => d.minAboveFloorSeconds)) : null,
        typicalAboveFloorSeconds: weightedMedian(c.map((d) => [d.medianAboveFloorSeconds, d.transfers])),
      },
    })
    const r = routes.at(-1)
    console.log(`  ${route.id}: ${r.transfers} with FCR (typical ${r.typicalSeconds ?? '–'} s vs floor ${r.typicalFloorSeconds ?? '–'} s), ${(r.savedSeconds / 3600).toFixed(1)} h saved; check ${r.check.transfers} without (${r.check.beatFloor} beat the floor, closest ${r.check.minAboveFloorSeconds ?? '–'} s above); measured ${transfers.length} from ${iso(from)}, ${pending} pending`)
  }

  const fcrDays = Object.values(daily).flat().filter((d) => d.fcr).map((d) => d.date).sort()
  return {
    summary: {
      id: integration.id,
      name: integration.name,
      attribution,
      fcrSince: integration.fcrSince ?? null,
      firstFcrDate: fcrDays[0] ?? null,
      measuredUntil: iso(now),
      script: `scripts/time-saved/integrations/${integration.id}.mjs`,
      transfers: routes.reduce((s, r) => s + r.transfers, 0),
      savedSeconds: routes.reduce((s, r) => s + r.savedSeconds, 0),
      routes,
    },
    daily,
  }
}

const read = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {})
const summaryFile = here('../../data/time-saved.json')
const dailyFile = here('../../data/time-saved-daily.json')
const summary = read(summaryFile)
const dailyData = read(dailyFile)
const kept = new Map((summary.integrations || []).map((i) => [i.id, i]))
const keptDaily = new Map(Object.entries(dailyData.integrations || {}))
const files = readdirSync(here('./integrations/')).filter((f) => f.endsWith('.mjs'))
const ids = []
const failed = []
for (const f of files) {
  const { default: integration } = await import(pathToFileURL(here(`./integrations/${f}`)))
  ids.push(integration.id)
  if (only.length && !only.includes(integration.id)) continue
  console.log(integration.name)
  try {
    const m = await measure(integration, keptDaily.get(integration.id), kept.get(integration.id))
    kept.set(integration.id, m.summary)
    keptDaily.set(integration.id, m.daily)
  } catch (e) {
    console.error(`  FAILED: ${e.stack || e.message}`)
    failed.push(integration.id)
    const prev = kept.get(integration.id)
    if (prev) kept.set(integration.id, { ...prev, stale: { since: prev.stale?.since || summary.checkedOn, error: String(e.message).slice(0, 200) } })
  }
}
for (const id of [...kept.keys()]) if (!ids.includes(id)) { kept.delete(id); keptDaily.delete(id) } // removed

const order = (a, b) => (a.fcrSince || '9').localeCompare(b.fcrSince || '9') || a.id.localeCompare(b.id)
const integrations = [...kept.values()].sort(order)
const checkedOn = new Date(now * 1000).toISOString().slice(0, 10)
writeFileSync(summaryFile, JSON.stringify({
  checkedOn,
  method: 'Lower bound. For every transfer that relied on FCR: the earliest moment the old rule could have let it through, minus when it actually arrived. See scripts/time-saved/README.md.',
  integrations,
}, null, 1) + '\n')
// One line per day, so a day's change is one line in git.
const dailyOut = integrations.map((i) => `  ${JSON.stringify(i.id)}: {\n` + Object.entries(keptDaily.get(i.id) || {}).map(([route, days]) =>
  `   ${JSON.stringify(route)}: [\n` + days.map((d) => `    ${JSON.stringify(d)}`).join(',\n') + '\n   ]').join(',\n') + '\n  }').join(',\n')
writeFileSync(dailyFile, `{\n "checkedOn": ${JSON.stringify(checkedOn)},\n "integrations": {\n${dailyOut}\n }\n}\n`)

for (const i of integrations) console.log(`${i.name}: ${i.transfers} transfers with FCR, at least ${(i.savedSeconds / 3600).toFixed(1)} h saved${i.stale ? ' (STALE)' : ''}`)
if (failed.length) {
  console.error(`Failed: ${failed.join(', ')}. Their previous numbers were kept.`)
  process.exitCode = 1
}
