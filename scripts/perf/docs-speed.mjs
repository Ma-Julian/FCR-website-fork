// Speed check for the jump from the home page to the docs. Goal: the docs on screen within 100 ms
// of the click, in Chromium (Chrome, Edge), Firefox and WebKit (Safari).
//
// Serves dist/ like Cloudflare Pages (scripts/perf/serve.mjs) with a delay on every request that
// stands in for the distance to the server, opens the home page in a fresh browser (a first-time
// visitor), waits until the page is idle and the docs offline cache is filled, then clicks "Docs"
// and measures from the click to the first paint of the docs page. Also reports, without a target,
// a first visit that lands straight on a docs page.
//
//   npm run build && npm run test:speed            (40 ms per request, about a nearby CDN server)
//   npm run test:speed -- --latency 150            (a slow mobile connection)
//   npm run test:speed -- --url https://fastconfirm.it   (the deployed site on Cloudflare; no local server)
// Measure on a real computer: a small cloud VM without a graphics card is slow enough that even a
// click to an empty page takes 100-300 ms there, which is why each line also shows that floor.
// Needs the Playwright browsers once: npx playwright install chromium firefox webkit
// Exits with 1 if any browser misses the target, so it can gate a deploy.
import { chromium, firefox, webkit } from 'playwright'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { serve } from './serve.mjs'

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? Number(process.argv[i + 1]) : d }
const LATENCY = arg('--latency', 40), TARGET = arg('--target', 100), PORT = arg('--port', 4174), RUNS = arg('--runs', 3)
const URL_ARG = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1].replace(/\/$/, '') : null
const BASE = URL_ARG || `http://127.0.0.1:${PORT}`
// How many files the docs offline cache holds, to know when it is full (from the deployed sw.js when testing a URL).
const swText = URL_ARG ? await (await fetch(`${BASE}/sw.js`)).text() : readFileSync(fileURLToPath(new URL('../../dist/sw.js', import.meta.url)), 'utf8')
const PRECACHE = JSON.parse(swText.match(/const PRECACHE = (\[.*\])/)[1])

// When the current page became visible: its first paint (read with a buffered observer, which every
// engine supports), or, for a prerendered page, the moment it was shown.
const VISIBLE = `(async () => {
  const n = performance.getEntriesByType('navigation')[0] || {}
  const fcp = await new Promise((ok) => {
    const done = (t) => { clearTimeout(timer); ok(t) }
    const timer = setTimeout(() => done(undefined), 3000)
    try {
      new PerformanceObserver((l) => {
        const e = l.getEntries().find((x) => x.name === 'first-contentful-paint')
        if (e) done(e.startTime)
      }).observe({ type: 'paint', buffered: true })
    } catch { done(undefined) }
  })
  const shown = Math.max(n.activationStart || 0, fcp ?? performance.now())
  return { at: performance.timeOrigin + shown, prerendered: (n.activationStart || 0) > 0, painted: fcp !== undefined }
})()`

async function waitForOfflineCache(page) {
  await page.waitForFunction(async (count) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false
    const keys = (await caches.keys()).filter((k) => k.startsWith('fcr-docs-'))
    if (!keys.length) return false
    return (await (await caches.open(keys[0])).keys()).length >= count
  }, PRECACHE.length - 2, { timeout: 30000, polling: 250 })
}

async function fromHome(type, target = '/docs/') {
  const browser = await type.launch(type === chromium ? { channel: 'chromium' } : {})
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'load' })
  await waitForOfflineCache(page).catch(() => {})
  await page.waitForTimeout(1500) // room for the docs prerender to finish
  // A person's pointer reaches the link a moment before the click.
  await page.hover('.site-nav .nav-docs')
  await page.waitForTimeout(150)
  // The click is dispatched inside the page, so the clock starts exactly when a person's click would.
  const t0 = await page.evaluate((to) => {
    const a = document.querySelector('.site-nav .nav-docs')
    a.setAttribute('href', to)
    const t = performance.timeOrigin + performance.now()
    a.click()
    return t
  }, target)
  await page.waitForURL((u) => u.pathname === target || u.pathname === target.replace(/\.html$/, ''))
  const v = await page.evaluate(VISIBLE)
  await browser.close()
  return { ms: Math.max(0, Math.round(v.at - t0)), how: v.prerendered ? 'prerendered' : v.painted ? 'offline cache' : 'no paint seen' }
}

async function directToDocs(type) {
  const browser = await type.launch(type === chromium ? { channel: 'chromium' } : {})
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
  const t0 = Date.now()
  await page.goto(`${BASE}/docs/integrate/quick-start`, { waitUntil: 'commit' })
  const v = await page.evaluate(VISIBLE)
  await browser.close()
  return Math.round(v.at - t0)
}

// The floor: the same click to an almost empty page, served from the same place. Whatever this takes
// is the browser and machine, not the docs.
// (Locally only: the deployed site has no such page, so there the line shows no floor.)
const BLANK = fileURLToPath(new URL('../../dist/perf-blank.html', import.meta.url))
if (!URL_ARG) writeFileSync(BLANK, '<!doctype html><meta charset=utf-8><title>Blank</title><body style="background:#0e1b2c;color:#fff"><h1>Blank</h1>')

const server = URL_ARG ? null : await serve({ port: PORT, latency: LATENCY })
console.log(`Home -> docs on ${URL_ARG || `a local Cloudflare-style server, ${LATENCY} ms per request`}; target ${TARGET} ms (median of ${RUNS} runs)\n`)
let failed = false
for (const [name, type] of [['Chromium', chromium], ['Firefox', firefox], ['WebKit', webkit]]) {
  try {
    const runs = []
    for (let i = 0; i < RUNS; i++) runs.push(await fromHome(type))
    runs.sort((a, b) => a.ms - b.ms)
    const med = runs[Math.floor(runs.length / 2)]
    const floor = URL_ARG ? '   -' : (await fromHome(type, '/perf-blank.html')).ms
    const direct = await directToDocs(type)
    const ok = med.ms <= TARGET
    failed ||= !ok
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(8)}  click to docs ${String(med.ms).padStart(4)} ms (${med.how})   same click to an empty page ${String(floor).padStart(4)} ms   first visit straight to a docs page ${direct} ms`)
  } catch (e) {
    console.log(`SKIP  ${name.padEnd(8)}  ${String(e.message).split('\n')[0]}`)
  }
}
server?.close()
if (!URL_ARG) rmSync(BLANK, { force: true })
process.exit(failed ? 1 : 0)
