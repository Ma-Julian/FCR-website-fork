// The 3D bridge, positioned every frame from one number: how far the camera has
// travelled (d, in world px). Towers are a fixed pool placed with modulo arithmetic; project
// lanes and signs are generated ahead of the camera on a random schedule and removed once
// passed. The main cables and suspenders are drawn on one canvas behind the 3D scene with
// the same perspective, because as page elements they were ~400 separately composited
// layers and most of the cost of every frame.

export const SPAN = 2550 // tower to tower
const N = 16 // suspenders per span
const STEP = SPAN / N
const POOL = 3 * SPAN // pooled structure repeats every 3 spans
const NEAR = -520 // how far behind the camera an object stays drawn (world px)
const FAR = 7130 // draw distance
const FOG_FROM = 4200 // beyond this distance things fade into the haze, gone at FAR
const TAPER = 900 // a project lane fades in and out over this length, like a lane opening or merging

const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t) }
// 1 up close, easing to 0 at the draw distance, so nothing pops in at the horizon.
export const fog = (r) => 1 - smooth((r - FOG_FROM) / (FAR - FOG_FROM))
// Fade is set as a CSS variable on the moving carrier and applied as opacity on its flat
// leaves; opacity on the 3D carrier itself would flatten (and clip) its children.
function setFog(el, r) {
  const f = Math.round(fog(r) * 100) / 100
  if (el._fog !== f) { el._fog = f; el.style.setProperty('--fog', f) }
}
const PLANE_X = 325 // cable / suspender / girder plane
const DECK_TOP = 70
const CABLE_W = 10, SUSP_W = 3 // thickness in world px
const CABLE = '#F05F36', SUSP = '#F05F36' // drawn on a canvas, so not from CSS: the site's orange
const PERSPECTIVE = 700, ORIGIN_Y = 0.42 // .br-cam's perspective and perspective-origin
const DASH = 600 // lane-dash pattern repeat (see .br-dash)
export const EDGES = [-325, -217, -108, 0, 108, 217, 325] // lane edges, left to right

const cy = (p) => -150 - 990 * Math.pow(2 * p - 1, 2) // main cable height at span fraction p
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const TOWER = `<div class="br-tower">
  <div class="br-leg br-leg-l"></div><div class="br-leg br-leg-r"></div>
  <div class="br-saddle" style="left:4px"></div><div class="br-saddle" style="right:4px"></div>
  <div class="br-strut" style="top:18px;height:74px"></div><div class="br-strut" style="top:330px;height:52px"></div>
  <div class="br-strut" style="top:610px;height:44px"></div><div class="br-strut" style="top:860px;height:38px"></div>
</div>`

const ARROW_DOWN = '<svg class="br-ar" width="26" height="30" viewBox="0 0 26 30" aria-hidden="true"><path d="M13 2v22M4 16l9 10 9-10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ARROW_MERGE = '<svg class="br-ar" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M8 27V16l12-12M11 4h9v9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ARROW_EXIT = '<svg class="br-ar br-ar-exit" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M6 24L24 6M10 6h14v14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const GANTRY = `<div class="br-post" style="left:-312px"></div><div class="br-post" style="left:302px"></div>
  <div class="br-beam" style="top:-200px;height:16px"></div><div class="br-beam" style="top:-172px;height:6px"></div>`

function laneSign(route, lane, ends) {
  const c = (EDGES[lane] + EDGES[lane + 1]) / 2
  return `<div class="br-sign br-lane-sign" style="left:${c - 54}px">
    <div class="br-band">${esc(route.name)}</div>
    <div class="br-line">${ends ? 'Lane ends' : esc(route.signLine || '')}</div>${ends ? ARROW_MERGE : ARROW_DOWN}</div>`
}
function exitSign(dest, exitNo) {
  return `<div class="br-sign br-exit-sign">
    <div class="br-tab">EXIT ${exitNo}</div><div class="br-name">${esc(dest.name)}</div>
    ${dest.signLine ? `<div class="br-line">${esc(dest.signLine)}</div>` : ''}${ARROW_EXIT}</div>`
}

function plane(cls, x, w, y, bg, near) {
  return `<div class="br-plane ${cls}" style="width:${w}px;height:${7350 + near}px;transform:translate3d(${x}px,${y}px,${near}px) rotateX(-90deg);background:${bg}"></div>`
}

// `near` is how far toward the camera the deck reaches; the game's high camera sees further back.
// `nearDrawn` is the nearest distance the cables and suspenders are drawn at. Both the intro and
// the game draw them as near as the deck reaches, so they run off the screen's edges with it.
export function createWorld(container, { destinations, routes, rng = Math.random, near = 650, nearDrawn = NEAR }) {
  // ---- static deck ----
  let html = plane('br-deck', -325, 650, 100, '#F5F5E9', near)
  // Lane dashes are one DASH longer than the deck at the near end and slide by transform,
  // so they never need repainting.
  for (let e = 1; e < EDGES.length - 1; e++) html += plane('br-dash', EDGES[e] - 3, 6, 99, '', near + DASH)
  for (const x of [-PLANE_X, PLANE_X]) html += `<div class="br-girder" style="width:${7350 + near}px;transform:translate3d(${x}px,70px,${near}px) rotateY(90deg)"></div>`

  // ---- pooled towers ----
  const pool = [] // { el, base }
  for (let j = 0; j < 3; j++) html += `<div class="br-carrier" data-base="${j * SPAN}">${TOWER}</div>`
  html += '<div class="br-features"></div>'
  container.innerHTML = html
  container.querySelectorAll('.br-carrier').forEach((el) => pool.push({ el, base: Number(el.dataset.base) }))
  const dashes = [...container.querySelectorAll('.br-dash')].map((el) => ({ el, base: el.style.transform }))
  const layer = container.querySelector('.br-features')
  const cables = createCables(container, Math.max(NEAR, nearDrawn), { cable: CABLE, susp: SUSP })

  // ---- random schedule of lanes and signs, on mid-span gantry slots ----
  const slotW = (n) => (n + 0.5) * SPAN
  const between = (a, b) => a + Math.floor(rng() * (b - a + 1))
  const features = [] // { w0, w1, el, kind }
  let nextSlot = 0
  const slots = new Map() // slot -> { starts: [], ends: [], dest }
  const slot = (n) => { if (!slots.has(n)) slots.set(n, { starts: [], ends: [], dest: null }); return slots.get(n) }
  // Bridges: a run of 2 to 4 spans, then a gap of 3 to 7. The first run starts early so it is seen in the intro.
  const routeNext = routes.map((_, i) => 1 + i * 2)
  // L2s: an exit every 3 to 6 spans, cycling through destinations from a random start.
  let destNext = 5, destIdx = destinations.length ? Math.floor(rng() * destinations.length) : 0, exitNo = 1

  function plan(untilSlot) {
    routes.forEach((route, lane) => {
      while (routeNext[lane] <= untilSlot) {
        const start = routeNext[lane], len = between(2, 4)
        slot(start).starts.push({ route, lane })
        slot(start + len).ends.push({ route, lane })
        features.push(laneRun(route, lane, slotW(start) - 120, slotW(start + len) + 400))
        routeNext[lane] = start + len + between(3, 7)
      }
    })
    while (destinations.length && destNext <= untilSlot) {
      slot(destNext).dest = { dest: destinations[destIdx % destinations.length], exitNo: exitNo++ }
      destIdx++
      destNext += between(3, 6)
    }
    for (; nextSlot <= untilSlot; nextSlot++) {
      const s = slots.get(nextSlot)
      if (!s) continue
      slots.delete(nextSlot)
      let signs = ''
      for (const { route, lane } of s.starts) signs += laneSign(route, lane, false)
      for (const { route, lane } of s.ends) if (!s.starts.some((x) => x.lane === lane)) signs += laneSign(route, lane, true)
      if (s.dest) signs += exitSign(s.dest.dest, s.dest.exitNo)
      if (!signs) continue
      const el = document.createElement('div')
      el.className = 'br-carrier'
      el.innerHTML = `<div class="br-gantry">${GANTRY}${signs}</div>`
      layer.appendChild(el)
      features.push({ kind: 'gantry', w0: slotW(nextSlot), w1: slotW(nextSlot), el })
    }
  }

  // A project lane: a flat window fixed to the camera that holds the distance haze, and inside
  // it the lane strip (tapered at both ends) sliding along by transform. Both masks are drawn
  // once, so moving the lane never repaints it.
  function laneRun(route, lane, w0, w1) {
    const el = document.createElement('div')
    el.className = 'br-run'
    const l = EDGES[lane], r = EDGES[lane + 1], len = w1 - w0
    el.innerHTML = `<div class="br-run-fog" style="width:${r - l}px;height:${FAR - NEAR}px;transform:translate3d(${l}px,99.5px,${-NEAR}px) rotateX(-90deg);${FOG_MASK}">
      <div class="br-run-strip" style="height:${len}px;${taperMask(len)}">
        <div class="br-run-tint" style="width:${r - l - 4}px"></div><div class="br-run-line" style="left:${r - l - 7}px"></div></div></div>`
    const strip = el.querySelector('.br-run-strip')
    layer.appendChild(el)
    return { kind: 'run', w0, w1, el, strip, shown: null }
  }

  let lastD = 0
  function update(d) {
    lastD = d
    // pooled towers
    for (const { el, base } of pool) {
      const r = ((((base - d) % POOL) + POOL) % POOL) + NEAR
      el.style.transform = `translateZ(${(-r).toFixed(1)}px)`
      setFog(el, r)
    }
    const shift = ` translateY(${((DASH - (d % DASH)) % DASH).toFixed(1)}px)`
    for (const { el, base } of dashes) el.style.transform = base + shift
    // features: plan ahead, place, and drop what has passed
    plan(Math.floor((d + FAR) / SPAN) + 1)
    for (let i = features.length - 1; i >= 0; i--) {
      const f = features[i]
      if (f.w1 - d < NEAR) { f.el.remove(); features.splice(i, 1); continue }
      if (f.kind === 'gantry') {
        const r = f.w0 - d
        f.el.style.visibility = r > FAR ? 'hidden' : 'visible'
        f.el.style.transform = `translateZ(${(-r).toFixed(1)}px)`
        setFog(f.el, r)
      } else {
        const shown = f.w1 - d > NEAR && f.w0 - d < FAR
        if (shown !== f.shown) { f.shown = shown; f.el.style.visibility = shown ? 'visible' : 'hidden' }
        if (shown) f.strip.style.transform = `translateY(${(f.w0 - d - NEAR).toFixed(1)}px)`
      }
    }
    cables.draw(d)
  }

  // Redraw the canvas after the scene is resized while nothing is moving (start card, still frame).
  return { update, redraw: () => cables.draw(lastD) }
}

// Distance haze along a camera-fixed lane window, and the taper at both ends of a lane strip.
const maskCss = (stops) => { const g = `linear-gradient(to bottom, ${stops.join(', ')})`; return `-webkit-mask-image:${g};mask-image:${g}` }
const FOG_MASK = maskCss(Array.from({ length: 13 }, (_, i) => {
  const y = ((FAR - NEAR) * i) / 12
  return `rgba(0,0,0,${fog(NEAR + y).toFixed(3)}) ${y.toFixed(1)}px`
}))
function taperMask(len) {
  const t = Math.min(TAPER, len / 2)
  return maskCss([0, 0.25, 0.5, 0.75, 1].map((k) => `rgba(0,0,0,${smooth(k).toFixed(3)}) ${(k * t).toFixed(1)}px`)
    .concat([1, 0.75, 0.5, 0.25, 0].map((k) => `rgba(0,0,0,${smooth(k).toFixed(3)}) ${(len - k * t).toFixed(1)}px`)))
}

// ---- main cables and suspenders on a canvas behind the 3D world ----
// Points are projected with the same math the browser uses for the page elements: the camera
// (.br-cam) has perspective PERSPECTIVE with its origin at (50%, 42%) of the scene, where the
// world element also sits, and the world is offset by the translate3d in its inline transform.
function createCables(worldEl, rMin, { cable, susp }) {
  const cam = worldEl.parentElement
  const host = cam.parentElement
  let canvas = host.querySelector(':scope > .br-cables')
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.className = 'br-cables'
    canvas.setAttribute('aria-hidden', 'true')
    host.insertBefore(canvas, cam)
  }
  const ctx = canvas.getContext('2d')
  const camera = () => {
    const m = /translate3d\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(worldEl.style.transform)
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
  }

  function draw(d) {
    const vw = parseFloat(host.style.width) || host.clientWidth
    const vh = parseFloat(host.style.height) || host.clientHeight
    if (!vw || !vh) return
    const k = Number(/scale\(([\d.]+)\)/.exec(host.style.transform)?.[1]) || 1
    // Canvas pixels per scene px. Capped at 1.5x the screen: the thin red lines look the same,
    // and a full-resolution canvas costs noticeably more to hand to the compositor every frame.
    const px = Math.min(1.5, window.devicePixelRatio || 1) * k
    const cw = Math.round(vw * px), ch = Math.round(vh * px)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch
      canvas.style.width = `${vw}px`; canvas.style.height = `${vh}px`
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cw, ch)
    ctx.setTransform(px, 0, 0, px, 0, 0)
    const [tx, ty, tz] = camera()
    const ox = vw / 2, oy = ORIGIN_Y * vh
    // Scale at distance r ahead (world z = -r), 0 at or behind the eye.
    const sAt = (r) => { const q = PERSPECTIVE - (tz - r); return q > 1 ? PERSPECTIVE / q : 0 }
    // Along the bridge we count u = d + r - NEAR, so towers sit at whole spans of u, exactly
    // where the pooled tower carriers put them; u runs from d (r = NEAR) to d + FAR - NEAR.
    const u0 = d, u1 = d + FAR - NEAR
    const at = (u) => cy((((u % SPAN) + SPAN) % SPAN) / SPAN)

    for (const side of [-PLANE_X, PLANE_X]) {
      const X = side + tx
      // suspenders: a 3 px bar from the cable down to the deck, facing the camera
      ctx.fillStyle = susp
      for (let i = Math.ceil(u0 / STEP - 0.5); (i + 0.5) * STEP < u1; i++) {
        const u = (i + 0.5) * STEP, r = u - d + NEAR, s = sAt(r)
        if (!s || r < rMin) continue
        const top = at(u)
        ctx.globalAlpha = fog(r)
        ctx.fillRect(ox + (X - SUSP_W / 2) * s, oy + (top + ty) * s, SUSP_W * s, (DECK_TOP - top) * s)
      }
      // main cable: short flat ribbons in the cable's vertical plane, CABLE_W wide across the
      // cable, so a steep stretch is seen nearly edge-on and looks thin, as the page elements did
      ctx.fillStyle = cable
      const step = SPAN / 48
      // As page elements each piece hung from a suspender toward the camera (a full gap, or half a
      // gap next to a tower) and each tower held half a gap, so the cable starts there.
      const uMin = d + rMin - NEAR, iS = Math.ceil(uMin / STEP - 0.5), jT = Math.ceil(uMin / SPAN)
      const covS = ((iS % N) + N) % N === 0 ? STEP / 2 : STEP
      let ua = Math.min((iS + 0.5) * STEP - covS, jT * SPAN - STEP / 2), ra = ua - d + NEAR, ya = at(ua)
      const pt = (y, r) => { const q = sAt(r); return q ? [ox + X * q, oy + (y + ty) * q] : null }
      while (ua < u1) {
        const ub = Math.min(u1, (Math.floor(ua / step + 1e-9) + 1) * step)
        const rb = ub - d + NEAR, yb = at(ub)
        const len = Math.hypot(yb - ya, rb - ra) || 1
        const ny = ((rb - ra) / len) * CABLE_W / 2, nr = (-(yb - ya) / len) * CABLE_W / 2
        const c = [pt(ya - ny, ra - nr), pt(yb - ny, rb - nr), pt(yb + ny, rb + nr), pt(ya + ny, ra + nr)]
        if (c.every(Boolean)) {
          ctx.globalAlpha = fog((ra + rb) / 2)
          ctx.beginPath()
          ctx.moveTo(c[0][0], c[0][1]); ctx.lineTo(c[1][0], c[1][1]); ctx.lineTo(c[2][0], c[2][1]); ctx.lineTo(c[3][0], c[3][1])
          ctx.fill()
        }
        ua = ub; ra = rb; ya = yb
      }
    }
    ctx.globalAlpha = 1
  }
  return { draw }
}
