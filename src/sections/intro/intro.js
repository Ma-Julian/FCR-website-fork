// The intro: a fast run across the bridge while the counter climbs to 24 seconds,
// then the car eases to a cruise behind the tagline. One clock drives everything.
import { createWorld, SPAN } from './bridge-world.js'
import { sceneMarkup, fitScene } from './scene.js'
import { destinations, bridgeRoutes, site } from '@src/lib/data.js'
import './intro.css'

const V_RUSH = 2040 // world px per second (the first, dusk bridge ran at 5100: this one is 60% slower)
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
    world.update(distanceAt(t))
    setCount(t)
    if (visible) raf = requestAnimationFrame(frame)
  }

  function play() {
    // A new world each time it plays, with a fresh canvas for its cables.
    sceneHost.querySelector('.br-cables')?.remove()
    world = createWorld(worldEl, { destinations, routes: bridgeRoutes })
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
