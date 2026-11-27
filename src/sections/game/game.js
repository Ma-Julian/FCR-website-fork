// The F+C+R bridge game. An armored truck carries a real fast-confirmed ETH deposit from Ethereum to Gnosis
// Chain across the bridge, seen from just behind it. Its vacuums hoover up attestations
// (envelopes sealed with the Ethereum logo); with enough of them the cargo is fast-confirmed
// at the 24 s check. Potholes (asynchrony) cost time; an eclipse attack covers two of the
// three vacuums and sends red attestations. The score is the time on the clock.
import { createWorld, fog } from '@src/sections/intro/bridge-world.js'
import { sceneMarkup, fitScene } from '@src/sections/intro/scene.js'
import { destinations, bridgeRoutes, site } from '@src/lib/data.js'
import cargoData from '@data/gnosis-deposits.json'
import { markSvg } from './mark.js'
import {
  SLOT_S, RUN_SLOTS, MAX_SLOTS, BYZANTINE, POTHOLE_LOSS,
  committeesAt, neededShare, neededCount, isConfirmed, redLimit, isEclipsed, fmtTime, fmtDuration,
} from './rules.js'
import {
  V, LANE_W, laneX, TRUCK_LANES, START_LANE, STEER, TRUCK, HEAD_R, BODY_R, FIRST_CHECK_D, DROP_S,
  createCourse, verifyCourse,
} from './course.js'
import '@src/sections/intro/intro.css'
import './game.css'

// ---- camera: the intro's view, raised and pulled back to ride just behind the truck ----
// It looks straight ahead like the intro, so the horizon, sky and towers line up. Raising it
// spreads the road out below the horizon, so lanes and what is coming are easy to read.
const CAM_Y = 190 // world px the camera rides above the intro's eye height
const CAM_Z = -310 // world px it is pulled back
const CAM_FOLLOW = 0.6 // how much of the truck's sideways moves the camera follows

// ---- world (world px; the camera's distance along the bridge is d). The course is in course.js ----
// Nothing may reach the viewer's eye, which sits 700 (the scene's perspective) + 310 (CAM_Z) = 1010
// behind the camera. Chrome cuts off what lies past it. On iPhones (Safari's engine, in every iPhone
// browser) the game opened to the page's orange or broke (Julian, 27 Nov 2026); the likely cause is
// planes reaching past the eye, which Safari can't clip and so seems to hold whole in memory, as the
// intro, whose deck stops short of the eye, never did. So objects fade out from FADE_FROM and are
// gone at NEAR, and the deck and girders end at DECK_NEAR; by then all of them have left the bottom
// of the screen but the slot arches, which sit higher and fade.
const NEAR = -950, FADE_FROM = -650, FAR = 7130
const DECK_NEAR = 900
const FINALITY_MIN = Math.round(site.timing.finalitySeconds / 60)
// The docs page that walks through real attacks on FCR, step by step with diagrams (docs PR #9).
// VitePress makes the anchors from the headings "Large adversarial stake" and "Network asynchrony".
const ATTACKS_URL = '/docs/evaluate/assumptions-and-attacks'

const BEST_KEY = 'fcr-game-best-v2', ESCORTED_KEY = 'fcr-game-escorted-eth'
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode: no memory */ } },
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const attestations = (n) => `${n} attestation${n === 1 ? '' : 's'}`
const fmtShare = (x) => `${(Math.floor(x * 1000) / 10).toFixed(1)}%`
const eth = (n) => `${n >= 10 ? Math.round(n).toLocaleString('en-US') : Number(n.toPrecision(3)).toLocaleString('en-US')} ETH`
const dateLabel = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ETH_DIAMOND = (fill, shade) => `<path d="M0 -9 L5.6 0.4 L0 3.6 L-5.6 0.4Z" fill="${fill}"/><path d="M0 -9 L0 3.6 L5.6 0.4Z" fill="${shade}"/><path d="M0 4.8 L5.6 1.6 L0 9.4 L-5.6 1.6Z" fill="${fill}"/><path d="M0 4.8 L0 9.4 L5.6 1.6Z" fill="${shade}"/>`
// Seen from above: a sealed envelope with a wax seal stamped with the Ethereum diamond. An honest
// vote is white with a green seal; the adversary's is red throughout (the colours in game.css).
const ENVELOPE = (red) => `<svg viewBox="0 0 60 42" width="72" height="50" aria-hidden="true">
<rect x="1.5" y="1.5" width="57" height="39" rx="3" fill="${red ? '#FBE3E0' : '#FFFFFF'}" stroke="${red ? '#C62828' : '#1C1714'}" stroke-width="2"/>
<path d="M2.5 3 L30 24 L57.5 3" fill="none" stroke="${red ? '#E59A94' : '#CFC9BD'}" stroke-width="2" stroke-linejoin="round"/>
<g transform="translate(30 24)"><circle r="13" fill="${red ? '#8E1B1B' : '#1A7F43'}"/><circle r="13" fill="none" stroke="${red ? '#C62828' : '#0F5C2E'}" stroke-width="2" stroke-dasharray="3 2"/>
<g transform="scale(1.15)">${ETH_DIAMOND('#FFFFFF', red ? '#F3B8B3' : '#CFE8D8')}</g></g></svg>`

// The truck as a box: roof and back face the camera, sides show a little. The FCR mark is on both.
const truckFaces = () => `
  <div class="gm-wheel" style="transform:translate3d(${-TRUCK.w / 2 - 6}px,99px,${TRUCK.z - 22}px) rotateX(-90deg)"></div>
  <div class="gm-wheel" style="transform:translate3d(${TRUCK.w / 2 - 12}px,99px,${TRUCK.z - 22}px) rotateX(-90deg)"></div>
  <div class="gm-wheel" style="transform:translate3d(${-TRUCK.w / 2 - 6}px,99px,${TRUCK.z - TRUCK.len + 30}px) rotateX(-90deg)"></div>
  <div class="gm-wheel" style="transform:translate3d(${TRUCK.w / 2 - 12}px,99px,${TRUCK.z - TRUCK.len + 30}px) rotateX(-90deg)"></div>
  <div class="gm-face gm-side" style="width:${TRUCK.len}px;height:${TRUCK.h}px;transform:translate3d(${-TRUCK.w / 2}px,${100 - TRUCK.h - 8}px,${TRUCK.z}px) rotateY(90deg)"></div>
  <div class="gm-face gm-side" style="width:${TRUCK.len}px;height:${TRUCK.h}px;transform:translate3d(${TRUCK.w / 2}px,${100 - TRUCK.h - 8}px,${TRUCK.z}px) rotateY(90deg)"></div>
  <div class="gm-face gm-roof" style="width:${TRUCK.w}px;height:${TRUCK.len}px;transform:translate3d(${-TRUCK.w / 2}px,${100 - TRUCK.h - 8}px,${TRUCK.z}px) rotateX(-90deg)">
    <div class="gm-roof-art">${markSvg('#F5F5E9', '#F05F36', 76)}<i></i></div></div>
  <div class="gm-face gm-back" style="width:${TRUCK.w}px;height:${TRUCK.h}px;transform:translate3d(${-TRUCK.w / 2}px,${100 - TRUCK.h - 8}px,${TRUCK.z}px)">
    <div class="gm-door"></div><div class="gm-door"></div>${markSvg('#F5F5E9', '#F05F36', 34)}<span class="gm-tail"></span><span class="gm-tail"></span></div>`

const MARKUP = `
  <div class="gm-stage"><div class="intro-scene gm-scene" data-scene></div></div>
  <div class="gm-hud" data-hud hidden>
    <div class="gm-clock"><div><span data-clock>0.0</span><span class="gm-unit">s</span></div><div class="gm-slot" data-slot></div></div>
    <div class="gm-meters">
      <div class="gm-meter"><div class="gm-meter-head"><span>Attestations</span><span data-support-val></span></div>
        <div class="gm-bar"><i data-support-bar></i><b data-support-tick></b></div>
        <div class="gm-meter-note" data-support-note></div></div>
      <div class="gm-meter gm-meter-adv"><div class="gm-meter-head"><span>Adversary</span><span data-adv-val></span></div>
        <div class="gm-bar"><i data-adv-bar></i></div>
        <div class="gm-meter-note" data-adv-note></div></div>
    </div>
  </div>
  <div class="gm-banner" data-banner aria-live="assertive"></div>
  <div class="gm-help" data-help hidden>← →&nbsp;to steer&nbsp;&nbsp;·&nbsp;&nbsp;Esc&nbsp;to leave</div>
  <div class="gm-touch" data-touch hidden><button type="button" data-steer="-1" aria-label="Steer left">‹</button><button type="button" data-steer="1" aria-label="Steer right">›</button></div>
  <div class="gm-card" data-card role="document"></div>
  <button type="button" class="gm-close" data-close aria-label="Leave the game">✕</button>`

let current = null

export function startGame() {
  if (current) return
  current = createGame()
}

function createGame() {
  const root = document.documentElement
  const scrollY = window.scrollY
  const opener = document.activeElement
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const touch = window.matchMedia('(pointer: coarse)').matches
  const phone = window.matchMedia('(max-width: 600px)').matches

  const el = document.createElement('div')
  el.className = 'gm'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', 'FCR bridge game')
  // With touch controls on screen, banners sit just above them instead of over the road (game.css).
  el.classList.toggle('is-touch', touch)
  el.innerHTML = MARKUP
  const $ = (s) => el.querySelector(s)
  const host = $('[data-scene]')
  host.innerHTML = sceneMarkup()
  const worldEl = host.querySelector('.br-world')
  const aim = (x) => { worldEl.style.transform = `translate3d(${(-CAM_FOLLOW * x).toFixed(1)}px,${CAM_Y}px,${CAM_Z}px)` }
  const hills = host.querySelector('.intro-hills')
  const ui = {
    hud: $('[data-hud]'), clock: $('[data-clock]'), slot: $('[data-slot]'),
    supportVal: $('[data-support-val]'), supportBar: $('[data-support-bar]'), supportTick: $('[data-support-tick]'), supportNote: $('[data-support-note]'),
    advVal: $('[data-adv-val]'), advBar: $('[data-adv-bar]'), advNote: $('[data-adv-note]'),
    banner: $('[data-banner]'), help: $('[data-help]'), touchPad: $('[data-touch]'), card: $('[data-card]'),
  }
  let s, raf = 0, last = 0, bannerTimer = 0, paused = false
  const fit = () => { fitScene(host, hills, window.innerWidth, window.innerHeight); s?.world?.redraw() }

  // A quick fade over the page; the page underneath is then taken out so it stops drawing.
  // On touch screens (phones, tablets) the game appears at once and the page goes in the same moment,
  // so the intro's 3D bridge and the game's are never drawn together, which is the most a phone has
  // to hold in memory.
  if (touch) el.classList.add('is-in')
  root.classList.add('gm-active')
  document.body.appendChild(el)
  fit()
  if (!touch) requestAnimationFrame(() => el.classList.add('is-in'))
  const hideTimer = touch ? (root.classList.add('gm-hidden'), 0) : setTimeout(() => root.classList.add('gm-hidden'), 220)


  // A course that keeps both promises in course.js: fast confirmation at 24 s is possible, and
  // so is losing to the eclipse. Generation is built to keep them; the proof is checked anyway.
  function provenCourse() {
    for (let i = 0; ; i++) {
      const rng = mulberry32((Math.random() * 2 ** 32) >>> 0)
      const course = createCourse(rng)
      course.plan(FIRST_CHECK_D + FAR)
      if (verifyCourse(course).ok || i >= 50) return { rng, course }
    }
  }

  function newRun() {
    const { rng, course } = provenCourse()
    const deps = cargoData.deposits
    s = {
      rng, course, phase: 'ready', t: 0, d: 0, slots: RUN_SLOTS, finishD: FIRST_CHECK_D,
      lane: START_LANE, x: laneX(START_LANE), objects: course.objects,
      warned: false, over: false, taken: 0, lost: 0, red: 0, potholes: 0, cargo: deps[Math.floor(Math.random() * deps.length)],
      arches: new Set(), capped: false,
    }
    worldEl.innerHTML = ''
    // Phones draw two spans ahead instead of three, as the intro does there: less to hold in memory.
    s.world = createWorld(worldEl, { destinations, routes: bridgeRoutes, rng, near: DECK_NEAR, spans: phone ? 2 : 3 })
    const layer = document.createElement('div')
    layer.className = 'gm-layer'
    layer.innerHTML = `
      <div class="gm-zone" data-zone>${[-1, 0, 1].map((o) => `<i data-o="${o}"></i>`).join('')}</div>
      <div class="gm-boom" data-boom>${[-1, 0, 1].map((o) => `<div class="gm-head" data-o="${o}" style="left:${(o + 1) * LANE_W + 6}px"></div>`).join('')}</div>
      <div class="gm-truck" data-truck>${truckFaces()}</div>`
    worldEl.appendChild(layer)
    s.layer = layer
    s.truckEl = layer.querySelector('[data-truck]')
    s.boomEl = layer.querySelector('[data-boom]')
    s.heads = [...layer.querySelectorAll('.gm-head, .gm-zone i')]
    s.zoneEl = layer.querySelector('[data-zone]')
    el.classList.remove('is-eclipse', 'is-bump', 'is-flash-red')
    addArch(s.finishD)
    plan(s.finishD + FAR)
    place() // aims the camera; the world draws its cables from where the camera points
    s.world.update(0)
    hud()
    showStart()
  }

  // ---- course ----
  const committee = () => s.course.committee(s.finishD)
  const plan = (untilW) => s.course.plan(untilW)
  const committees = () => committeesAt(s.slots)

  function addArch(finishD) {
    if (s.arches.has(finishD)) return
    s.arches.add(finishD)
    s.objects.push({ kind: 'arch', w: finishD - TRUCK.z, slot: Math.round(finishD / (SLOT_S * V)) })
  }
  // ---- drawing ----
  function makeEl(o) {
    const e = document.createElement('div')
    if (o.kind === 'envelope') { e.className = `gm-envelope${o.red ? ' is-red' : ''}`; e.innerHTML = `<div>${ENVELOPE(o.red)}</div>` }
    else if (o.kind === 'pothole') e.className = 'gm-pothole'
    else if (o.kind === 'hazard') { e.className = 'gm-hazard'; e.innerHTML = '<div class="gm-hazard-sign"><span>!</span></div><div class="gm-hazard-post"></div>' }
    else {
      e.className = 'gm-arch'
      const check = o.slot >= s.slots
      e.innerHTML = `<div class="gm-arch-in"><div class="gm-arch-post"></div><div class="gm-arch-post"></div><div class="gm-arch-beam${check ? ' is-check' : ''}">${check ? `FCR CHECK AT ${o.slot * SLOT_S}s` : `END OF SLOT ${o.slot}`}</div></div>`
    }
    s.layer.appendChild(e)
    return e
  }

  function place() {
    for (let i = s.objects.length - 1; i >= 0; i--) {
      const o = s.objects[i]
      const r = o.w - s.d
      if (r > FAR) continue
      if (r < NEAR || o.gone) { o.el?.remove(); s.objects.splice(i, 1); continue }
      // Asynchrony: attestations and potholes stay hidden until they are DROP_S from the truck
      // (attestations from its front, potholes from its wheels), then pop in.
      const lead = o.kind === 'envelope' ? r - HEAD_R : o.kind === 'pothole' || o.kind === 'hazard' ? r - BODY_R : -Infinity
      if (lead > DROP_S * V) continue
      if (!o.el) { o.el = makeEl(o); if (o.kind !== 'arch') o.el.classList.add('is-late') }
      const z = (-r).toFixed(1)
      // Envelopes and hazard signs stand up; potholes lie flat on the deck.
      if (o.kind === 'envelope') o.el.style.transform = `translate3d(${laneX(o.lane) - 36}px,30px,${z}px)`
      else if (o.kind === 'hazard') o.el.style.transform = `translate3d(${laneX(o.lane) - 30}px,6px,${z}px)`
      else if (o.kind === 'pothole') o.el.style.transform = `translate3d(${laneX(o.lane) - 44}px,99.4px,${z}px) rotateX(-90deg)`
      else o.el.style.transform = `translate3d(-340px,-150px,${z}px)`
      // A hazard sign is knocked flat once the truck reaches it, so it never hides the truck.
      const passed = o.kind === 'hazard' && r < HEAD_R
      const near = r < FADE_FROM ? Math.max(0, (r - NEAR) / (FADE_FROM - NEAR)) : 1
      o.el.style.opacity = o.taken || passed ? 0 : Math.min(fog(r), near).toFixed(2)
    }
    s.truckEl.style.transform = `translateX(${s.x.toFixed(1)}px)`
    aim(s.x)
    s.boomEl.style.transform = `translate3d(${(s.x - 1.5 * LANE_W).toFixed(1)}px,70px,${-HEAD_R}px)`
    s.zoneEl.style.transform = `translate3d(${(s.x - 1.5 * LANE_W).toFixed(1)}px,99.5px,${-HEAD_R}px) rotateX(-90deg)`
  }

  // ---- the loop ----
  function step(dt) {
    s.x += Math.max(-STEER * dt, Math.min(STEER * dt, laneX(s.lane) - s.x))
    s.d += V * dt
    s.t += dt
    plan(s.finishD + FAR)

    const e = s.course.eclipse
    const headW = s.d + HEAD_R
    const eclipsed = s.course.isCapped(headW)
    if (e && !s.warned && headW > e.capFrom - 1.6 * V) { s.warned = true; banner('Eclipse attack! Two vacuums are covered. Weave through the gap in the red.', 'red', 3600) }
    if (eclipsed !== s.capped) {
      s.capped = eclipsed
      s.heads.forEach((h) => h.classList.toggle('is-capped', eclipsed && h.dataset.o !== '0'))
      el.classList.toggle('is-eclipse', eclipsed)
      if (!eclipsed && !s.over) { s.over = true; banner('Eclipse over. Catch the votes it held back!', 'sand', 2400) }
    }

    for (const o of s.objects) {
      if (o.done) continue
      const r = o.w - s.d
      if (o.kind === 'envelope' && r <= HEAD_R) {
        o.done = true
        // Judged where the attestation crosses the line, the same way verifyCourse judges it.
        const capped = s.course.isCapped(o.w)
        const hit = [-1, 0, 1].some((off) => (!capped || off === 0) && Math.abs(laneX(o.lane) - (s.x + off * LANE_W)) < LANE_W * 0.5)
        if (hit) {
          o.taken = true
          setTimeout(() => { o.gone = true }, 160)
          if (o.red) {
            s.red++
            flash('red')
            if (isEclipsed(s.red, committee())) return end('eclipsed')
          } else s.taken++
        } else if (capped && Math.abs(laneX(o.lane) - s.x) < 1.5 * LANE_W) o.gone = true // stopped by a covered vacuum
      } else if (o.kind === 'pothole' && r <= BODY_R) {
        o.done = true
        if (Math.abs(laneX(o.lane) - s.x) < 52) {
          // A pothole knocks a few collected attestations out of the truck.
          const lost = Math.min(POTHOLE_LOSS, s.taken)
          s.potholes++
          s.taken -= lost
          s.lost += lost
          el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump')
          spill(lost)
          banner(`Pothole! −${attestations(POTHOLE_LOSS)}`, 'red', 1400)
        }
      }
    }

    if (s.d >= s.finishD) {
      const finishT = s.t - (s.d - s.finishD) / V
      if (isConfirmed(s.taken, committee(), committees())) return end('confirmed', finishT)
      if (s.slots >= MAX_SLOTS) return end('finality', finishT)
      const before = committee()
      s.slots++
      s.finishD += SLOT_S * V
      addArch(s.finishD)
      plan(s.finishD + FAR)
      // The next slot's committee votes for a descendant of your block, so its votes count too.
      const coming = committee() - before, more = neededCount(committee(), committees()) - s.taken
      banner(more <= coming
        ? `Not enough yet. Waiting one more slot (+${SLOT_S} s): its votes count for your block too. Collect ${more} of the next ${coming}.`
        : `Not enough yet. Waiting one more slot (+${SLOT_S} s): its votes count for your block too.`, 'sand', 3800)
    }
  }

  // The rules run in fixed small steps that add up to the real time since the last frame, so
  // the game keeps real time on a slow device instead of turning into slow motion. A long
  // stall (over STALL_S, e.g. the tab was busy) is not made up.
  const SIM_DT = 1 / 120, STALL_S = 0.25
  function frame(now) {
    raf = 0
    let left = Math.min(STALL_S, Math.max(0, (now - last) / 1000))
    last = now
    if (s.phase === 'play' && !paused) {
      while (left > 1e-6 && s.phase === 'play') {
        const dt = Math.min(SIM_DT, left)
        step(dt)
        left -= dt
      }
      if (s.phase === 'play') { place(); s.world.update(s.d); hud() }
    }
    if (s.phase === 'play') raf = requestAnimationFrame(frame)
  }

  function hud() {
    ui.clock.textContent = s.t.toFixed(1)
    ui.slot.textContent = `Slot ${Math.min(s.slots, 1 + Math.floor(s.d / (SLOT_S * V)))} · check at ${s.slots * SLOT_S} s`
    const W = committee(), need = neededCount(W, committees())
    ui.supportVal.textContent = `${s.taken} / ${W}`
    ui.supportBar.style.width = `${W ? Math.min(1, s.taken / W) * 100 : 0}%`
    ui.supportBar.classList.toggle('is-ok', s.taken >= need)
    ui.supportTick.style.left = `${W ? (need / W) * 100 : 0}%`
    ui.supportNote.textContent = `Need ${need} (over ${Math.round(neededShare(committees()) * 1000) / 10}%)`
    const lim = redLimit(W)
    ui.advVal.textContent = `${s.red} / ${lim}`
    ui.advBar.style.width = `${lim ? Math.min(1, s.red / lim) * 100 : 0}%`
    ui.advNote.textContent = `Out above ${lim} (${Math.round(BYZANTINE * 100)}%)`
  }

  function banner(text, tone, ms) {
    ui.banner.textContent = text
    ui.banner.className = `gm-banner is-on is-${tone}`
    clearTimeout(bannerTimer)
    bannerTimer = setTimeout(() => { ui.banner.className = 'gm-banner' }, ms)
  }
  // The loss, shown three ways: envelopes fly out of the back of the truck, a big −N rises
  // from it, and the attestation meter shakes red with its own −N.
  function spill(n) {
    if (!n) return
    const host = el.getBoundingClientRect()
    const back = s.truckEl.querySelector('.gm-back').getBoundingClientRect()
    const x = back.left + back.width / 2 - host.left, y = back.top + back.height * 0.35 - host.top
    const add = (cls, html, style) => {
      const d = document.createElement('div')
      d.className = cls
      d.innerHTML = html
      Object.assign(d.style, style)
      el.appendChild(d)
      setTimeout(() => d.remove(), 1200)
    }
    if (!reduce) {
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1
        add('gm-spill', ENVELOPE(false), {
          left: `${x}px`, top: `${y}px`,
          '--dx': `${side * (90 + Math.random() * 110)}px`, '--dy': `${-(110 + Math.random() * 120)}px`,
          '--rot': `${side * (120 + Math.random() * 240)}deg`, animationDelay: `${i * 60}ms`,
        })
      }
    }
    add('gm-loss', `−${n}`, { left: `${x}px`, top: `${y - 20}px` })
    const meter = ui.supportVal.closest('.gm-meter')
    meter.classList.remove('is-loss'); void meter.offsetWidth; meter.classList.add('is-loss')
    const tag = document.createElement('span')
    tag.className = 'gm-meter-loss'
    tag.textContent = `−${n}`
    meter.querySelector('.gm-meter-head span').appendChild(tag)
    setTimeout(() => tag.remove(), 1000)
  }
  function flash(tone) { el.classList.remove(`is-flash-${tone}`); void el.offsetWidth; el.classList.add(`is-flash-${tone}`) }

  // ---- screens ----
  const txLinks = () => `<a href="https://etherscan.io/tx/${esc(s.cargo.tx)}" target="_blank" rel="noopener">View on Etherscan</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://gnosisscan.io/tx/${esc(s.cargo.gnosisTx)}" target="_blank" rel="noopener">Arrival on Gnosisscan</a>`

  function showStart() {
    ui.hud.hidden = ui.help.hidden = ui.touchPad.hidden = true
    ui.card.className = 'gm-card is-on'
    ui.card.innerHTML = `
      <p class="gm-kicker">You found the FCR game!</p>
      <h2 class="gm-oneline">Fast-confirm the deposit in 24 seconds</h2>
      <p class="gm-cargo">Your cargo: <b>${eth(s.cargo.eth)}</b>, a real fast-confirmed deposit from Ethereum to Gnosis Chain on ${dateLabel(s.cargo.time)} <a class="gm-tx" href="https://etherscan.io/tx/${esc(s.cargo.tx)}" target="_blank" rel="noopener" title="View the deposit on Etherscan" aria-label="View the deposit on Etherscan">🔗</a></p>
      <ul class="gm-rules">
        <li><span class="gm-ico gm-ico-steer"></span>${touch ? 'Steer by tapping the ‹ and › buttons at the bottom of the screen.' : 'Steer with the ← and → arrow keys (or A and D).'}</li>
        <li><span class="gm-ico gm-ico-ok"></span>Hoover up attestations as they pop up just in time. At the 24 s check you need over ${Math.round(neededShare(1) * 100)}% of them; fall short and you wait another slot.</li>
        <li><span class="gm-ico gm-ico-hole"></span>Potholes resemble an asynchronous network. Each one knocks ${attestations(POTHOLE_LOSS)} out of your truck.</li>
        <li><span class="gm-ico gm-ico-red"></span>In an eclipse attack, weave through the gap in the red attestations. Count more than ${Math.round(BYZANTINE * 100)}% red and you're out.</li>
      </ul>
      ${reduce ? '<p class="gm-note">This game is full of motion.</p>' : ''}
      <div class="gm-actions"><button type="button" class="btn btn-accent" data-go>Start${touch ? '' : ' <kbd>Space</kbd>'}</button>
      <button type="button" class="btn btn-ghost" data-leave>Back</button></div>`
    ui.card.querySelector('[data-go]').addEventListener('click', countdown)
    ui.card.querySelector('[data-leave]').addEventListener('click', close)
    // Focus after the first frame is on screen: focusing forces a full style and layout pass.
    const go = ui.card.querySelector('[data-go]')
    requestAnimationFrame(() => { if (s.phase === 'start') go.focus({ preventScroll: true }) })
    s.phase = 'start'
  }

  function countdown() {
    if (s.phase !== 'start') return
    s.phase = 'count'
    ui.card.className = 'gm-card'
    ui.hud.hidden = false
    ui.help.hidden = touch
    ui.touchPad.hidden = !touch
    el.focus({ preventScroll: true })
    let n = 3
    const tick = () => {
      if (s.phase !== 'count') return
      if (n === 0) { banner('Go!', 'sand', 700); s.phase = 'play'; last = performance.now(); raf = requestAnimationFrame(frame); return }
      banner(String(n), 'count', 600)
      n--
      setTimeout(tick, 650)
    }
    tick()
  }

  // A clear way out to how real attacks work: the game simplifies, the docs show the exact scenarios.
  function learnMore(kind) {
    const [title, text, anchor] = kind === 'eclipsed'
      ? ['Could an eclipse really break FCR?', 'Only if the attacker surrounds both your node and honest validators, or controls more than 25% of the stake. See exactly how it would play out.', '#network-asynchrony']
      : ['How would a real attack on FCR work?', 'The game simplifies. A real attack needs more than 25% of the stake, or an attacker who eclipses both your node and honest validators. See the exact scenarios, step by step.', '']
    return `<a class="gm-learn" href="${ATTACKS_URL}${anchor}" target="_blank" rel="noopener">
      <span class="gm-learn-title">${title}</span><span class="gm-learn-text">${text}</span><span class="gm-learn-cta">Read the attack scenarios →</span></a>`
  }

  function end(kind, time) {
    s.phase = 'over'
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    place(); s.world.update(s.d); hud()
    ui.hud.hidden = ui.help.hidden = ui.touchPad.hidden = true
    ui.banner.className = 'gm-banner'
    const W = committee()
    const readBest = () => { const b = store.get(BEST_KEY); return b && typeof b === 'object' && b.t > 0 ? b : null }
    const best = readBest()
    let escorted = Number(store.get(ESCORTED_KEY)) || 0
    const real = `The real deposit took <b>${fmtDuration(s.cargo.seconds)}</b> to reach Gnosis Chain.`
    let head, body
    const share = W ? s.taken / W : 0
    if (kind === 'confirmed') {
      // Times come in whole slots (24, 36, 48 s); the share of attestations breaks ties.
      const isBest = !best || time < best.t - 0.05 || (Math.abs(time - best.t) < 0.05 && share > best.share)
      if (isBest) store.set(BEST_KEY, { t: Math.round(time * 10) / 10, share: Math.round(share * 1000) / 1000 })
      escorted += s.cargo.eth
      store.set(ESCORTED_KEY, escorted)
      head = `<p class="gm-kicker">${isBest ? 'New best' : 'Fast-confirmed'}</p><h2 class="gm-score">Fast-confirmed in <span>${fmtTime(time)}</span></h2>
        <p class="gm-share">with ${fmtShare(share)} of attestations</p>`
      body = `<p class="gm-thanks">Thank you for escorting ${eth(s.cargo.eth)} safely to Gnosis Chain!</p>
        <p>${real}</p>`
    } else if (kind === 'eclipsed') {
      head = '<p class="gm-kicker is-red">Eclipsed</p><h2>The adversary got through</h2>'
      body = `<p>You counted ${s.red} red attestations, more than ${Math.round(BYZANTINE * 100)}% of the committee. FCR's safety assumes the adversary holds at most ${Math.round(BYZANTINE * 100)}%, so this confirmation can't be trusted.</p>
        <p class="gm-thanks">Thanks for playing. ${real}</p>`
    } else {
      head = '<p class="gm-kicker">Not fast-confirmed</p><h2>Fell back to finality</h2>'
      body = `<p>After ${s.slots} slots you still had too few attestations, so the cargo goes the slow way, in ~${FINALITY_MIN} min.</p>
        <p class="gm-thanks">Thanks for playing. ${real}</p>`
    }
    const stats = [
      ['Attestations', `${s.taken} / ${W} <small>needed ${neededCount(W, committees())}</small>`],
      ['Potholes', `${s.potholes} <small>${s.potholes ? `−${attestations(s.lost)}` : 'none hit'}</small>`],
      ['Adversary', `${s.red} <small>limit ${redLimit(W)}</small>`],
    ]
    const bestNow = readBest()
    ui.card.className = `gm-card is-on is-${kind}`
    ui.card.innerHTML = `${head}${body}
      <dl class="gm-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <p class="gm-links">${txLinks()}</p>
      ${learnMore(kind)}
      <p class="gm-mine">${bestNow ? `Your best: <b>${fmtTime(bestNow.t)}</b> with ${fmtShare(bestNow.share)}` : 'No fast confirmation yet'}${escorted ? `&nbsp;&nbsp;·&nbsp;&nbsp;Escorted in total: <b>${eth(escorted)}</b>` : ''}</p>
      <div class="gm-actions"><button type="button" class="btn btn-accent" data-again>Drive again${touch ? '' : ' <kbd>Enter</kbd>'}</button>
      <button type="button" class="btn btn-ghost" data-leave>Back</button></div>`
    ui.card.querySelector('[data-again]').addEventListener('click', () => newRun())
    ui.card.querySelector('[data-leave]').addEventListener('click', close)
    ui.card.querySelector('[data-again]').focus({ preventScroll: true })
  }

  // ---- input ----
  function steer(dir) {
    if (s.phase !== 'play' && s.phase !== 'count') return
    const i = TRUCK_LANES.indexOf(s.lane)
    s.lane = TRUCK_LANES[Math.max(0, Math.min(TRUCK_LANES.length - 1, i + dir))]
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); return close() }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); return steer(-1) }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); return steer(1) }
    if (s.phase === 'start' && e.key === ' ') { e.preventDefault(); return countdown() }
    if (s.phase === 'over' && e.key === 'Enter' && !e.target.closest?.('a, button')) { e.preventDefault(); return newRun() }
    if (e.key === 'Tab') { // keep focus inside the game
      // The cards put focus on their main button themselves, so Space or Enter works at once; the
      // focus ring only shows once someone moves focus with Tab (game.css).
      el.classList.add('is-tabbing')
      const f = [...el.querySelectorAll('button:not([hidden]), a[href]')].filter((b) => b.offsetParent)
      if (!f.length) return e.preventDefault()
      const i = f.indexOf(document.activeElement)
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
    }
  }
  el.tabIndex = -1
  el.addEventListener('keydown', onKey)
  const onKeyOutside = (e) => { if (!el.contains(e.target)) onKey(e) }
  document.addEventListener('keydown', onKeyOutside, true)
  ui.touchPad.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-steer]')
    if (b) { e.preventDefault(); steer(Number(b.dataset.steer)) }
  })
  el.querySelector('[data-close]').addEventListener('click', close)

  const onVisibility = () => { paused = document.hidden; if (!paused) last = performance.now() }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('resize', fit)
  // On phones, the back gesture or button is how people leave a full-screen view, and it left the site
  // instead (Julian, 27 Nov 2026). Opening the game adds a history entry, so back closes the game;
  // leaving by its own buttons or Escape takes that entry away again.
  history.pushState({ ...(history.state || {}), fcrGame: true }, '')
  const onPop = () => close(true)
  window.addEventListener('popstate', onPop)

  function close(fromHistory) {
    if (!current) return
    current = null
    window.removeEventListener('popstate', onPop)
    if (fromHistory !== true && history.state?.fcrGame) history.back()
    if (raf) cancelAnimationFrame(raf)
    clearTimeout(hideTimer); clearTimeout(bannerTimer)
    s.phase = 'closed'
    document.removeEventListener('keydown', onKeyOutside, true)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('resize', fit)
    root.classList.remove('gm-hidden')
    window.scrollTo(0, scrollY)
    el.classList.remove('is-in')
    setTimeout(() => {
      el.remove()
      root.classList.remove('gm-active')
      opener?.focus?.({ preventScroll: true })
    }, 350)
  }

  newRun()
  return { close }
}
