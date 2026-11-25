// The intro: a fast run across the bridge while the counter climbs to 24 seconds,
// then the car eases to a cruise behind the tagline. One clock drives everything.
import { createWorld, SPAN } from './bridge-world.js'
import { sceneMarkup, fitScene } from './scene.js'
import { destinations, bridgeRoutes, site } from '@src/lib/data.js'
import './intro.css'

const V_RUSH = 5100 // world px per second
// Speed after "Fast-confirmed". 1 keeps the full rush going; lower values ease the car
// down so the project signs can be read (0.14 is a gentle cruise).
const CRUISE = 1
const V_CRUISE = V_RUSH * CRUISE
const SLOW_FROM = 2.05, SLOW_FOR = 1.1 // seconds
const COUNT_FROM = 0.3, COUNT_FOR = 1.75

// Distance travelled after t seconds under the speed profile (closed form, so replays and
// paused frames are exact).
function distanceAt(t) {
  if (t <= SLOW_FROM) return V_RUSH * t
  const u = Math.min(t - SLOW_FROM, SLOW_FOR)
  // speed falls from V_RUSH to V_CRUISE along a smoothstep over SLOW_FOR seconds
  const k = u / SLOW_FOR
  const smoothInt = SLOW_FOR * (k * k * k - (k * k * k * k) / 2) // ∫ smoothstep
  let d = V_RUSH * SLOW_FROM + V_RUSH * u - (V_RUSH - V_CRUISE) * smoothInt
  if (t > SLOW_FROM + SLOW_FOR) d += V_CRUISE * (t - SLOW_FROM - SLOW_FOR)
  return d
}

// Hero options, for review: a switch at the bottom right of the hero picks one (also ?hero=2 in the
// address, and the last choice is remembered; 1 by default). Each sets its world, its speed (a share
// of the original dusk bridge's, option 3) and, through data-look on the section, its colours in intro.css.
//  1. The bridge as an orange-on-white line drawing, faint hills, no sky or sea; 60% slower.
//  2. The bridge at 60% slower, in the site's own colours: white and cream, orange, ink.
//  3. The dusk bridge, as it was.
//  4. Option 3 at half speed.
const LOOKS = {
  1: { speed: 0.4, colors: { cable: '#F05F36', susp: '#F05F36' }, light: true },
  2: { speed: 0.4, colors: { cable: '#F05F36', susp: '#F05F36' }, light: true },
  3: { speed: 1 },
  4: { speed: 0.5 },
}
const LOOK_KEY = 'fcr-hero-look'
function firstLook() {
  const q = new URLSearchParams(location.search).get('hero')
  if (LOOKS[q]) return q
  try { const v = localStorage.getItem(LOOK_KEY); if (LOOKS[v]) return v } catch { /* no storage */ }
  return '1'
}

export function mountIntro(section) {
  const sceneHost = section.querySelector('[data-intro-scene]')
  const counter = section.querySelector('[data-intro-count]')
  const counterLabel = section.querySelector('[data-intro-count-label]')
  if (!sceneHost) return

  sceneHost.innerHTML = sceneMarkup()
  const worldEl = sceneHost.querySelector('.br-world')
  const hills = sceneHost.querySelector('.intro-hills')
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

  let world, start = null, raf = 0, visible = true, shownCount = -1, pausedAt = null
  let look = firstLook()

  // The switch sits over everything in the hero, so it can be used while the intro plays.
  const picker = document.createElement('div')
  picker.className = 'intro-looks'
  picker.setAttribute('role', 'group')
  picker.setAttribute('aria-label', 'Hero option')
  picker.innerHTML = '<span class="intro-looks-label" aria-hidden="true">Option</span>' +
    Object.keys(LOOKS).map((n) => `<button type="button" data-look="${n}" aria-label="Option ${n}">${n}</button>`).join('')
  section.appendChild(picker)
  function applyLook() {
    section.dataset.look = look
    section.classList.toggle('is-light', !!LOOKS[look].light)
    document.documentElement.dataset.heroLook = look
    for (const b of picker.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.look === look))
  }
  picker.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-look]')
    if (!b || b.dataset.look === look) return
    look = b.dataset.look
    try { localStorage.setItem(LOOK_KEY, look) } catch { /* no storage */ }
    applyLook()
    play()
  })
  applyLook()

  const fit = () => { fitScene(sceneHost, hills, section.clientWidth, section.clientHeight); world?.redraw() }

  function setCount(t) {
    const p = Math.max(0, Math.min(1, (t - COUNT_FROM) / COUNT_FOR))
    const c = Math.round((1 - (1 - p) ** 2) * site.timing.fcrMinimumSeconds)
    if (c === shownCount) return
    shownCount = c
    counter.textContent = String(c)
    const done = c >= site.timing.fcrMinimumSeconds
    counterLabel.textContent = done ? 'Fast-confirmed' : 'Collecting attestations'
    counterLabel.classList.toggle('is-done', done)
  }

  function frame(now) {
    raf = 0
    if (start === null) start = now
    const t = (now - start) / 1000
    world.update(distanceAt(t) * LOOKS[look].speed)
    setCount(t)
    if (visible) raf = requestAnimationFrame(frame)
  }

  function play() {
    // A new world for the chosen option, with a fresh canvas for its cables.
    sceneHost.querySelector('.br-cables')?.remove()
    world = createWorld(worldEl, { destinations, routes: bridgeRoutes, colors: LOOKS[look].colors })
    shownCount = -1
    section.classList.remove('is-playing', 'is-still')
    if (reduce.matches) {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      // One still frame: a project lane in view, the tagline already up.
      world.update(1.5 * SPAN - 1300)
      counter.textContent = String(site.timing.fcrMinimumSeconds)
      section.classList.add('is-still')
      return
    }
    void section.offsetWidth // restart the CSS reveal sequence
    section.classList.add('is-playing')
    start = null
    if (!raf && visible) raf = requestAnimationFrame(frame)
  }

  // Stop drawing when the intro is off screen or the tab is hidden; resume where it was.
  function setVisible(v) {
    if (v === visible) return
    visible = v
    const now = performance.now()
    if (!v) { pausedAt = now; if (raf) cancelAnimationFrame(raf); raf = 0; section.classList.add('is-paused') }
    else {
      if (start !== null && pausedAt !== null) start += now - pausedAt
      pausedAt = null
      section.classList.remove('is-paused')
      if (!reduce.matches && !raf) raf = requestAnimationFrame(frame)
    }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => setVisible(e.isIntersecting && !document.hidden)).observe(section)
  }
  document.addEventListener('visibilitychange', () => setVisible(!document.hidden))
  // Leaving for another page (the docs, say): stop drawing at the click, so the next page doesn't
  // have to share the processor with the bridge. Coming back with Back resumes it.
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest?.('a[href]')
    if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
    if (a.target && a.target !== '_self') return
    const to = new URL(a.href, location.href)
    if (to.origin === location.origin && to.pathname === location.pathname && to.search === location.search) return
    // Wait until every click listener has run: the contact card (and the wordmark) cancel their
    // clicks to stay on the page, and the hero must keep playing behind them.
    setTimeout(() => { if (!ev.defaultPrevented) setVisible(false) })
  })
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) setVisible(!document.hidden) })
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(section)
  else window.addEventListener('resize', fit)
  reduce.addEventListener?.('change', play)

  fit()
  play()
}
