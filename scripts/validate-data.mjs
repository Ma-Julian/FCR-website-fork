// Validates every collection in data/ before a build. Errors stop the build;
// warnings are printed so missing sources are visible in every deploy log.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, STATUSES } from '../src/lib/partners.js'

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../data')
const errors = []
const warnings = []

const load = (file) => {
  try { return JSON.parse(readFileSync(resolve(dataDir, file), 'utf8')) }
  catch (e) { errors.push(`${file}: not valid JSON (${e.message})`); return null }
}
const isStr = (v, max = 200) => typeof v === 'string' && v.trim().length > 0 && v.length <= max
const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
const isUrl = (v) => typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v)

// Partners that use or are integrating FCR ("Using FCR" strip, Readiness).
function checkIntegrations(rows, errors) {
  if (!Array.isArray(rows)) return errors.push('integrations.json: must be a list')
  rows.forEach((g, i) => {
    const at = `integrations.json[${i}] (${g.id || '?'})`
    if (!/^[a-z0-9-]{1,40}$/.test(g.id || '')) errors.push(`${at}: "id" must be lowercase letters, digits or dashes (use the same id as projects.json)`)
    if (!isStr(g.name, 40)) errors.push(`${at}: "name" is required`)
    if (!CATEGORIES[g.category]) errors.push(`${at}: "category" must be one of: ${Object.keys(CATEGORIES).join(', ')}`)
    if (!STATUSES[g.status]) errors.push(`${at}: "status" must be one of: ${Object.keys(STATUSES).join(', ')}`)
    if (!isStr(g.summary, 160)) errors.push(`${at}: "summary" is required, up to 160 characters`)
    if (typeof g.draft !== 'boolean') errors.push(`${at}: "draft" must be true or false`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.since || '')) errors.push(`${at}: "since" must be a date like 2026-10-16`)
    for (const k of ['url', 'announcementUrl', 'docsUrl']) if (g[k] != null && !isUrl(g[k])) errors.push(`${at}: "${k}" must be an https URL or null`)
    if (!g.draft) {
      if (/\bTODO\b/.test(g.summary || '')) errors.push(`${at}: summary still says TODO; finish it or set "draft": true`)
      if (!g.url) errors.push(`${at}: published integrations need the partner's "url"`)
    }
  })
  const seen = new Set()
  rows.forEach((g) => { if (seen.has(g.id)) errors.push(`integrations.json: duplicate id "${g.id}"`); seen.add(g.id) })
}
const unique = (file, rows, key) => {
  const seen = new Set()
  rows.forEach((r, i) => {
    const k = String(r[key]).toLowerCase()
    if (seen.has(k)) errors.push(`${file}[${i}]: duplicate ${key} "${r[key]}"`)
    seen.add(k)
  })
}

// Each collection: a check function. Add a file to data/ and a check here.
const collections = {
  'site.json'(d) {
    if (!d || typeof d !== 'object') return errors.push('site.json: must be an object')
    for (const k of ['name']) if (!isStr(d[k])) errors.push(`site.json: "${k}" is required`)
    for (const k of ['url', 'contactUrl']) if (!isUrl(d[k])) errors.push(`site.json: "${k}" must be an https URL`)
    // The docs are part of this site (docs/, served at /docs/), so a path is fine too.
    if (!(isUrl(d.docsUrl) || /^\/[\w/-]*$/.test(d.docsUrl || ''))) errors.push('site.json: "docsUrl" must be an https URL or a path like /docs/')
    const t = d.timing || {}
    for (const k of ['slotSeconds', 'fcrMinimumSeconds', 'fcrTodaySeconds', 'finalitySeconds', 'justifiedSeconds'])
      if (!(Number.isFinite(t[k]) && t[k] > 0)) errors.push(`site.json: timing.${k} must be a positive number`)
  },
  'projects.json'(rows) {
    if (!Array.isArray(rows)) return errors.push('projects.json: must be a list')
    rows.forEach((p, i) => {
      const at = `projects.json[${i}]`
      if (!/^[a-z0-9-]{1,40}$/.test(p.id || '')) errors.push(`${at}: "id" must be lowercase letters, digits or dashes`)
      if (!isStr(p.name, 18)) errors.push(`${at}: "name" is required, up to 18 characters so it fits a sign`)
      if (!['l2', 'bridge'].includes(p.type)) errors.push(`${at}: "type" must be "l2" (exit sign) or "bridge" (own lane)`)
      if (p.signLine !== undefined && !(typeof p.signLine === 'string' && p.signLine.length <= 22)) errors.push(`${at}: "signLine" must be up to 22 characters`)
      if (p.type === 'bridge' && !isHex(p.laneColor)) errors.push(`${at}: bridges need a "laneColor" like "#375BD2"`)
      if (typeof p.active !== 'boolean') errors.push(`${at}: "active" must be true or false`)
    })
    unique('projects.json', rows, 'id')
    if (rows.filter((p) => p.active && p.type === 'bridge').length > 2) warnings.push('projects.json: only the first two active bridges get a lane on the bridge')
  },
  'lists.json'(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return errors.push('lists.json: must be an object of named lists')
    for (const [k, v] of Object.entries(d)) {
      if (!Array.isArray(v) || !v.every((s) => isStr(s, 40))) errors.push(`lists.json: "${k}" must be a list of names up to 40 characters`)
      else unique(`lists.json ${k}`, v.map((name) => ({ name })), 'name')
    }
  },
  'roles.json'(rows, all) {
    if (!Array.isArray(rows)) return errors.push('roles.json: must be a list')
    const lists = all['lists.json'] || {}
    rows.forEach((r, i) => {
      const at = `roles.json[${i}]`
      if (!/^[a-z]{2,20}$/.test(r.id || '')) errors.push(`${at}: "id" must be lowercase letters`)
      for (const k of ['phrase', 'tab', 'title', 'placeholder']) if (!isStr(r[k], 60)) errors.push(`${at}: "${k}" is required`)
      if (typeof r.connector !== 'string') errors.push(`${at}: "connector" must be a string (may be empty)`)
      if (!lists[r.list]) errors.push(`${at}: "list" must name a list in lists.json`)
      if (typeof r.usesWaits !== 'boolean') errors.push(`${at}: "usesWaits" must be true or false`)
    })
    unique('roles.json', rows, 'id')
  },
  'waits.json'(rows) {
    if (!Array.isArray(rows)) return errors.push('waits.json: must be a list')
    rows.forEach((w, i) => {
      const at = `waits.json[${i}] (${w.name || '?'})`
      if (!isStr(w.name, 40)) errors.push(`${at}: "name" is required`)
      if (!['slots', 'based', 'justified', 'finalized'].includes(w.wait)) errors.push(`${at}: "wait" must be "slots", "based", "justified" or "finalized"`)
      if (['slots', 'based'].includes(w.wait) && !(Number.isInteger(w.slots) && w.slots > 0 && w.slots < 1000)) errors.push(`${at}: "slots" must be a whole number of slots`)
      if (!['slots', 'based'].includes(w.wait) && w.slots !== undefined) errors.push(`${at}: leave out "slots" when "wait" is "${w.wait}"`)
      if (!isStr(w.source || '', 120)) warnings.push(`${at}: no "source" yet; the site shows this wait without a citation`)
      if (w.live !== undefined && !(w.live && isStr(w.live.note, 200) && isStr(w.live.before, 12) && isStr(w.live.now, 12) && w.live.beforeSeconds > 0 && w.live.nowSeconds > 0)) errors.push(`${at}: "live" needs note, before, now, beforeSeconds and nowSeconds`)
      if (w.live?.why !== undefined && !isStr(w.live.why, 200)) errors.push(`${at}: "live.why" must be text up to 200 characters`)
      if (w.change !== undefined && !isStr(w.change, 160)) errors.push(`${at}: "change" (the brief's 'What it takes' line) must be a sentence`)
      if (w.how !== undefined && !isStr(w.how, 60)) errors.push(`${at}: "how" (what the card says it waits for) must be a short sentence`)
      if (w.sourceUrl && !isUrl(w.sourceUrl)) errors.push(`${at}: "sourceUrl" must be an https URL`)
      if (w.checkedOn && !/^\d{4}-\d{2}-\d{2}$/.test(w.checkedOn)) errors.push(`${at}: "checkedOn" must be a date like 2026-10-16`)
    })
    unique('waits.json', rows, 'name')
  },
  'integrations.json'(rows) {
    checkIntegrations(rows, errors)
  },
  // Time FCR has saved, per integration (a lower bound); refreshed by scripts/time-saved/run.mjs.
  'time-saved.json'(d, all) {
    const n = (v) => Number.isFinite(v)
    if (!d || !Array.isArray(d.integrations)) return errors.push('time-saved.json: needs an "integrations" list')
    const ids = new Set((all['integrations.json'] || []).map((g) => g.id))
    d.integrations.forEach((g, i) => {
      const at = `time-saved.json[${i}] (${g.id || '?'})`
      // Measuring an integration before it switches is fine; counting it needs a partner entry.
      if (g.transfers > 0 && !ids.has(g.id)) errors.push(`${at}: has FCR transfers, so "id" must match an entry in integrations.json`)
      if (!['date', 'flag'].includes(g.attribution)) errors.push(`${at}: "attribution" must be "date" or "flag"`)
      if (g.stale) warnings.push(`${at}: stale since ${g.stale.since} (${g.stale.error}); showing the last good numbers`)
      if (!isStr(g.script || '') || !existsSync(resolve(dataDir, '..', g.script))) errors.push(`${at}: "script" must point at the file that measures it`)
      if ((g.fcrSince !== null && Number.isNaN(Date.parse(g.fcrSince))) || Number.isNaN(Date.parse(g.measuredUntil))) errors.push(`${at}: "fcrSince" (or null) and "measuredUntil" must be dates`)
      if (!(Number.isInteger(g.transfers) && g.transfers >= 0 && n(g.savedSeconds))) errors.push(`${at}: needs "transfers" and "savedSeconds"`)
      if (!Array.isArray(g.routes) || !g.routes.length) return errors.push(`${at}: needs at least one route`)
      if (g.routes.reduce((s, r) => s + r.savedSeconds, 0) !== g.savedSeconds) errors.push(`${at}: routes don't add up to "savedSeconds"`)
      if (g.routes.reduce((s, r) => s + r.transfers, 0) !== g.transfers) errors.push(`${at}: routes don't add up to "transfers"`)
      const days = all['time-saved-daily.json']?.integrations?.[g.id] || {}
      for (const r of g.routes) {
        // The daily file (for charts) must add up to the totals the site shows.
        const f = (days[r.id] || []).filter((x) => x.fcr).map((x) => x.fcr)
        if (f.reduce((s, x) => s + x.savedSeconds, 0) !== r.savedSeconds || f.reduce((s, x) => s + x.transfers, 0) !== r.transfers) errors.push(`${at} ${r.id}: time-saved-daily.json doesn't add up to the totals`)
        // The floor is only a lower bound if real transfers under the old rule never beat it.
        if (!(r.check?.transfers >= 30)) errors.push(`${at} ${r.id}: needs at least 30 transfers from before the switch to check the baseline`)
        else if (r.check.beatFloor > 0) errors.push(`${at} ${r.id}: ${r.check.beatFloor} transfers before the switch beat the "${r.baseline?.kind}" floor, so it doesn't describe the old rule`)
      }
    })
  },
  // Per day, per integration and route, for charts; written with time-saved.json and checked against it there.
  'time-saved-daily.json'(d) {
    if (!d || typeof d.integrations !== 'object') return errors.push('time-saved-daily.json: needs an "integrations" object')
    for (const [id, routes] of Object.entries(d.integrations)) for (const [route, list] of Object.entries(routes)) {
      if (!Array.isArray(list)) { errors.push(`time-saved-daily.json ${id}/${route}: must be a list of days`); continue }
      list.forEach((x, i) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date || '') || (i && x.date <= list[i - 1].date)) errors.push(`time-saved-daily.json ${id}/${route}[${i}]: dates must be YYYY-MM-DD and ascending`)
      })
    }
  },
  // Cargo for the F+C+R bridge game; refreshed by scripts/game/gnosis-deposits.mjs.
  'gnosis-deposits.json'(d) {
    if (!d || !Array.isArray(d.deposits) || !d.deposits.length) return errors.push('gnosis-deposits.json: needs a non-empty "deposits" list')
    if (!isStr(d.source) || !/^\d{4}-\d{2}-\d{2}$/.test(d.checkedOn || '')) errors.push('gnosis-deposits.json: "source" and "checkedOn" (YYYY-MM-DD) are required')
    // The game calls each one "a real fast-confirmed deposit", so none may predate the bridge's switch to FCR.
    const since = Date.parse(d.fcrSince)
    if (Number.isNaN(since)) errors.push('gnosis-deposits.json: "fcrSince" (when the bridge switched to FCR) is required')
    const hash = (v) => /^0x[0-9a-f]{64}$/.test(v)
    d.deposits.forEach((x, i) => {
      if (Date.parse(x.time) < since) errors.push(`gnosis-deposits.json deposits[${i}]: ${x.time} is before fcrSince, so it was not fast-confirmed`)
      if (!hash(x.tx) || !hash(x.gnosisTx) || !(x.eth > 0) || !(x.seconds > 0) || Number.isNaN(Date.parse(x.time))) errors.push(`gnosis-deposits.json deposits[${i}]: needs tx, gnosisTx, time, a positive eth amount and seconds`)
    })
  },
  // Measured bridging numbers per chain, shown in the card's Numbers section.
  'measured.json'(rows, all) {
    if (!Array.isArray(rows)) return errors.push('measured.json: must be a list')
    const chains = new Set(Object.values(all['lists.json'] || {}).flat().map((n) => String(n).toLowerCase()))
    const isCount = (v) => Number.isInteger(v) && v >= 0
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '')
    rows.forEach((m, i) => {
      const at = `measured.json[${i}] (${m && m.name})`
      if (!isStr(m.name)) return errors.push(`${at}: "name" is required`)
      if (!chains.has(m.name.toLowerCase())) errors.push(`${at}: "${m.name}" isn't in any list in lists.json`)
      if (!isDate(m.from) || !isDate(m.to) || m.from >= m.to) errors.push(`${at}: "from" and "to" must be dates, from before to`)
      const nb = m.nativeBridge || {}
      if (!isStr(nb.label) || !isCount(nb.deposits) || !isStr(nb.method)) errors.push(`${at}: nativeBridge needs label, deposits and method`)
      if (nb.eth !== undefined && !(Number.isFinite(nb.eth) && nb.eth >= 0)) errors.push(`${at}: nativeBridge.eth must be a number`)
      ;(m.intentBridges || []).forEach((b, j) => {
        if (!isStr(b.name) || !isCount(b.deposits) || !isStr(b.method)) errors.push(`${at}: intentBridges[${j}] needs name, deposits and method`)
      })
    })
    unique('measured.json', rows, 'name')
  },
  // "Is it ready?" on the home page: client support, who uses it, and the proof behind it.
  // How fillers on each venue wait for an Ethereum deposit today (for-you, solver card).
  'venues.json'(d, all) {
    if (!d || !Array.isArray(d.venues)) return errors.push('venues.json: needs a "venues" list')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.checkedOn || '')) errors.push('venues.json: "checkedOn" must be a date')
    const listed = new Set((all['lists.json']?.venues || []).map((n) => n.toLowerCase()))
    d.venues.forEach((v, i) => {
      const at = `venues.json[${i}]`
      if (!isStr(v.name, 40) || !listed.has(v.name.toLowerCase())) errors.push(`${at}: "name" must be in lists.json venues`)
      if (!['fill', 'single-chain', 'settlement'].includes(v.kind)) errors.push(`${at}: "kind" must be fill, single-chain or settlement`)
      if (!isStr(v.source) || !isUrl(v.sourceUrl)) errors.push(`${at}: needs a "source" and an https "sourceUrl"`)
      for (const k of ['win', 'repaid', 'handoff', 'config']) if (v[k] !== undefined && !isStr(v[k])) errors.push(`${at}: "${k}" must be text up to 200 characters`)
      if (v.blocks !== undefined && !(Number.isInteger(v.blocks) && v.blocks > 0)) errors.push(`${at}: "blocks" must be a positive whole number`)
      if (v.seconds !== undefined && !(Number.isFinite(v.seconds) && v.seconds > 0)) errors.push(`${at}: "seconds" must be a positive number`)
      if (v.tiers !== undefined) {
        const ok = Array.isArray(v.tiers) && v.tiers.length && v.tiers.every((t, j) => Number.isInteger(t.blocks) && t.blocks > 0
          && (j === v.tiers.length - 1 ? t.upToUsd === null : Number.isFinite(t.upToUsd) && t.upToUsd > 0))
        if (!ok) errors.push(`${at}: "tiers" must list { upToUsd, blocks }, the last with upToUsd null`)
      }
    })
    unique('venues.json', d.venues, 'name')
  },
  // How each bridge waits on Ethereum today, and the one setting that moves it to FCR (for-you, bridge card).
  'bridges.json'(d, all) {
    if (!d || !Array.isArray(d.bridges)) return errors.push('bridges.json: needs a "bridges" list')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.checkedOn || '')) errors.push('bridges.json: "checkedOn" must be a date')
    const listed = new Set((all['lists.json']?.bridges || []).map((n) => n.toLowerCase()))
    d.bridges.forEach((b, i) => {
      const at = `bridges.json[${i}]`
      if (!isStr(b.name, 40) || !listed.has(b.name.toLowerCase())) errors.push(`${at}: "name" must be in lists.json bridges`)
      // 'variable': intent bridges, where each filler picks its own wait (Across, Relay).
      if (!['blocks', 'finalized', 'variable'].includes(b.wait)) errors.push(`${at}: "wait" must be blocks, finalized or variable`)
      if (b.wait === 'blocks' && !(Number.isInteger(b.blocks) && b.blocks > 0)) errors.push(`${at}: "blocks" must be a positive whole number`)
      if (b.wait !== 'blocks' && b.blocks !== undefined) errors.push(`${at}: a ${b.wait} wait has no "blocks"`)
      if (!isStr(b.source) || !isUrl(b.sourceUrl)) errors.push(`${at}: needs a "source" and an https "sourceUrl"`)
      if (!isStr(b.actor, 60)) errors.push(`${at}: "actor" (who reads Ethereum) is required`)
      if (b.checkedOn !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(b.checkedOn)) errors.push(`${at}: "checkedOn" must be a date`)
      for (const k of ['switchTitle', 'fast']) if (b[k] !== undefined && !isStr(b[k])) errors.push(`${at}: "${k}" must be text up to 200 characters`)
      if (b.hideSource !== undefined && typeof b.hideSource !== 'boolean') errors.push(`${at}: "hideSource" must be true or false`)
      if (b.steps !== undefined && !(Array.isArray(b.steps) && b.steps.length && b.steps.every((x) => isStr(x.title, 80) && isStr(x.body, 400)))) errors.push(`${at}: "steps" must list { title, body }`)
      for (const k of ['switch', 'lede', 'note']) if (b[k] !== undefined && !isStr(b[k], 400)) errors.push(`${at}: "${k}" must be text up to 400 characters`)
    })
    unique('bridges.json', d.bridges, 'name')
  },
  'ready.json'(r, all) {
    if (!r || typeof r !== 'object') return errors.push('ready.json: must be an object')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedOn || '')) errors.push('ready.json: "checkedOn" must be a date')
    // "Who uses it" uses the same statuses as "Using FCR" (src/lib/partners.js), so a partner never shows two.
    const ok = { clients: ['shipped', 'experimental', 'planned', 'none'], users: ['live', 'testnet', 'building'] }
    const partners = new Map((all['integrations.json'] || []).map((g) => [g.id, g]))
    ;(r.users || []).forEach((x, i) => {
      const g = partners.get(x.id)
      if (!g) errors.push(`ready.json users[${i}]: "id" must match an entry in integrations.json`)
      else if (g.status !== x.status) errors.push(`ready.json users[${i}]: status "${x.status}" differs from integrations.json ("${g.status}"); a partner must read the same everywhere`)
    })
    // RPC services that serve FCR: a name and their site. The home page lists them and the docs page reads them.
    // List a provider only once it has said it's OK to be named (issue #29); the list may be empty.
    if (!Array.isArray(r.rpc)) errors.push('ready.json: "rpc" must be a list (it may be empty)')
    else {
      r.rpc.forEach((x, i) => { if (!isStr(x.name, 30) || !isUrl(x.url)) errors.push(`ready.json rpc[${i}]: needs a name and an https url`) })
      unique('ready.json rpc', r.rpc, 'name')
      const names = r.rpc.map((x) => x.name)
      if (names.join() !== [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).join()) errors.push('ready.json rpc: list the providers alphabetically')
    }
    for (const key of ['clients', 'users']) {
      if (!Array.isArray(r[key]) || !r[key].length) { errors.push(`ready.json: "${key}" must be a non-empty list`); continue }
      r[key].forEach((x, i) => {
        if (!isStr(x.name, 40) || !isStr(x.detail, 80) || !ok[key].includes(x.status)) errors.push(`ready.json ${key}[${i}]: needs name, detail and status (${ok[key].join(', ')})`)
        // Each client's details: the release FCR is in, how to turn it on, and a note.
        if (key !== 'clients') return
        // A client without FCR has no release or flag to show.
        if (x.status === 'none') return
        const rel = x.release || {}
        if (!isStr(rel.version, 20) || !isUrl(rel.url)) errors.push(`ready.json clients[${i}]: "release" needs a version and an https url`)
        if (rel.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(rel.date)) errors.push(`ready.json clients[${i}]: "release.date" must be a date like 2026-10-19`)
        if (x.enable !== null && !(isStr(x.enable, 40) && x.enable.startsWith('--'))) errors.push(`ready.json clients[${i}]: "enable" must be the flag (starting with --), or null when it is on by default`)
        if (!isStr(x.note, 100)) errors.push(`ready.json clients[${i}]: "note" is required, one sentence up to 100 characters`)
      })
    }
    ;(r.proof || []).forEach((x, i) => {
      if (!isStr(x.label, 40) || !isStr(x.detail, 60) || !isUrl(x.url)) errors.push(`ready.json proof[${i}]: needs label, detail and an https url`)
      if (!['paper', 'proof', 'bounty', 'backtest'].includes(x.icon)) errors.push(`ready.json proof[${i}]: icon must be one of paper, proof, bounty, backtest (drawn in src/sections/ready/ready.js)`)
    })
  },
  // Which rollup stack each chain is built on; the card links the stack's docs guide.
  'stacks.json'(rows, all) {
    if (!Array.isArray(rows)) return errors.push('stacks.json: must be a list')
    const chains = new Set((all['lists.json']?.chains || []).map((n) => n.toLowerCase()))
    const seen = new Map()
    rows.forEach((st, i) => {
      const at = `stacks.json[${i}] (${st && st.name})`
      if (!isStr(st.name) || !isStr(st.guideName)) errors.push(`${at}: "name" and "guideName" are required`)
      if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(st.guide || '')) errors.push(`${at}: "guide" must be a docs path like integrate/op-stack`)
      else if (!existsSync(new URL(`../docs/${st.guide}.md`, import.meta.url)) && existsSync(new URL('../docs/', import.meta.url))) errors.push(`${at}: docs/${st.guide}.md doesn't exist`)
      if (!Array.isArray(st.chains) || !st.chains.length) errors.push(`${at}: "chains" must be a non-empty list`)
      for (const c of st.chains || []) {
        if (!chains.has(String(c).toLowerCase())) errors.push(`${at}: "${c}" isn't in lists.json chains`)
        if (seen.has(c)) errors.push(`${at}: "${c}" is also in ${seen.get(c)}`)
        seen.set(c, st.name)
      }
    })
    unique('stacks.json', rows, 'name')
  },
}

const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'))
const all = Object.fromEntries(files.map((f) => [f, load(f)]))
for (const f of files) {
  if (!collections[f]) { errors.push(`${f}: no check defined in scripts/validate-data.mjs`); continue }
  if (all[f] !== null) collections[f](all[f], all)
}
for (const f of Object.keys(collections)) if (!files.includes(f)) errors.push(`${f}: missing from data/`)

for (const w of warnings) console.warn(`warning  ${w}`)
if (errors.length) {
  for (const e of errors) console.error(`error    ${e}`)
  console.error(`\nData check failed: ${errors.length} error(s).`)
  process.exit(1)
}
console.log(`Data check passed: ${files.length} collections${warnings.length ? `, ${warnings.length} warning(s)` : ''}.`)
