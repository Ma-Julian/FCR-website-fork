// "How long Ethereum deposits wait today": every chain's wait as a bar, with FCR as one line at its minimum, 24 s
// (the only FCR time on the site; Julian, 17 Nov 2026).
// Longest wait first, ties in alphabetical order. Hovering, focusing or tapping a row opens a tooltip that
// compares that chain's wait with FCR on speed and security, so readers can move down the list and compare
// chains without leaving the chart (it used to jump up to the result card; Nuno, 27 Oct 2026).
import { waits, site } from '@src/lib/data.js'
import { speedup } from '@src/sections/for-you/results.js'
import './waits.css'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const { slotSeconds: SLOT, fcrMinimumSeconds: FCR, finalitySeconds: FIN, justifiedSeconds: JUST } = site.timing

// What each rule checks: the same wording as the result card's Security rows.
const CHECKS = {
  slots: 'Only that time has passed',
  finalized: 'That two thirds of stake finalized the block',
  justified: 'That two thirds of stake attested to its checkpoint',
}
const FCR_CHECKS = 'That validators keep the block in the chain'

function fmt(s) {
  const m = Math.floor(s / 60), r = Math.round(s % 60)
  return m === 0 ? `${r} s` : r === 0 ? `${m} min` : `${m} min ${r} s`
}

function rows() {
  return waits.map((w) => {
    // Chains on FCR wait for FCR itself, like every other row shows its rule (not end-to-end bridge time).
    if (w.live) return { name: w.name, sec: FCR, label: `${FCR} s`, how: 'Uses FCR', live: w.live }
    const base = { name: w.name, checks: CHECKS[w.wait] }
    if (w.wait === 'finalized') return { ...base, sec: FIN, label: '~13 min', how: 'Finality' }
    if (w.wait === 'justified') return { ...base, sec: JUST, label: '~9 min', how: 'Justification' }
    return { ...base, sec: w.slots * SLOT, label: fmt(w.slots * SLOT), how: `${w.slots} blocks` }
  }).sort((a, b) => b.sec - a.sec || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
}

// Today against FCR, in two short columns.
function tipHtml(r) {
  if (r.live) {
    return `<p class="wt-tip-name">${esc(r.name)} <span class="wt-tip-badge">Uses FCR</span></p>
      <div class="wt-tip-grid">
        <span></span><span class="wt-tip-col">Before</span><span class="wt-tip-col is-fcr">With FCR</span>
        <span class="wt-tip-k">Speed</span><span>${esc(r.live.before)}</span><span class="is-fcr">at minimum ${FCR} s</span>
      </div>
      <p class="wt-tip-foot">On FCR since ${esc(r.live.sinceText)}.</p>`
  }
  const x = speedup(r.sec)
  return `<p class="wt-tip-name">${esc(r.name)}${x ? ` <span class="wt-tip-badge">${esc(x)} faster with FCR</span>` : ''}</p>
    <div class="wt-tip-grid">
      <span></span><span class="wt-tip-col">Today</span><span class="wt-tip-col is-fcr">With FCR</span>
      <span class="wt-tip-k">Speed</span><span>${esc(r.label)}</span><span class="is-fcr">at minimum ${FCR} s</span>
      <span class="wt-tip-k">Checks</span><span>${esc(r.checks)}</span><span class="is-fcr">${esc(FCR_CHECKS)}</span>
    </div>`
}

export function mountWaits(root) {
  const list = rows()
  const max = Math.max(...list.map((r) => r.sec))
  const pct = (s) => `${((100 * s) / max).toFixed(2)}%`
  const row = (r, i) => `
    <li class="wt-row${r.live ? ' is-live' : ''}" value="${i + 1}" tabindex="0" data-i="${i}" aria-describedby="wt-tip">
      <span class="wt-name">${esc(r.name)}</span>
      <span class="wt-track"><span class="wt-bar" style="width:${pct(r.sec)}"></span></span>
      <span class="wt-value">${esc(r.label)}<span class="wt-how">${esc(r.how)}</span></span>
    </li>`
  // Two columns on one scale, each with its own FCR line, so the comparison holds wherever the eye
  // lands. On desktop the chains read left to right, then down: the longest waits fill the top rows
  // across both columns, so the gap to FCR shows at first sight. On one column (phones), they read
  // straight down. Each row keeps its place in the whole list as its number.
  const col = (items) => `
    <div class="wt-col">
      <div class="wt-axis" aria-hidden="true"><span></span><span class="wt-axis-bar"><span class="wt-fcr-label" style="left:${pct(FCR)}">FCR: at minimum ${FCR} s</span></span><span></span></div>
      <div class="wt-col-body">
        <div class="wt-lines" aria-hidden="true"><span class="wt-fcr-line" style="left:${pct(FCR)}"></span></div>
        <ol class="wt-list">${items.map(([r, i]) => row(r, i)).join('')}</ol>
      </div>
    </div>`
  const body = root.querySelector('[data-waits-body]')
  // Same breakpoint as .wt-body in waits.css.
  const twoCols = matchMedia('(min-width: 901px)')
  let allRows = []
  function layout() {
    const all = list.map((r, i) => [r, i])
    const half = Math.ceil(list.length / 2)
    const [left, right] = twoCols.matches
      ? [all.filter(([, i]) => i % 2 === 0), all.filter(([, i]) => i % 2 === 1)]
      : [all.slice(0, half), all.slice(half)]
    body.querySelectorAll('.wt-col').forEach((c) => c.remove())
    body.insertAdjacentHTML('afterbegin', col(left) + col(right))
    allRows = [...body.querySelectorAll('.wt-row')]
  }
  layout()

  // The bars grow in from the left the first time the chart comes into view, each over a time set by
  // its wait: 0.375 s per minute, so finality's ~13 min takes about 4.9 s and a 1 min wait 0.4 s.
  // Each eases out, slowing as it reaches its end. Not with reduced motion.
  if ('IntersectionObserver' in window && body.querySelector('.wt-bar')?.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    body.classList.add('is-waiting')
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return
      io.disconnect()
      body.classList.remove('is-waiting')
      const bars = [...body.querySelectorAll('.wt-bar')]
      const rowsByBar = bars.map((bar) => list[Number(bar.closest('.wt-row').dataset.i)])
      bars.forEach((bar, i) => bar.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        { duration: (rowsByBar[i].sec / 60) * 375, easing: 'cubic-bezier(.33, 1, .68, 1)', fill: 'backwards' }))
    }, { rootMargin: '0px 0px -25% 0px' })
    io.observe(body)
  }

  const tip = document.createElement('div')
  tip.className = 'wt-tip'
  tip.id = 'wt-tip'
  tip.setAttribute('role', 'tooltip')
  tip.hidden = true
  body.appendChild(tip)

  let current = null
  function show(row, clientX) {
    if (current !== row) {
      current?.classList.remove('is-on')
      row.classList.add('is-on')
      current = row
      tip.innerHTML = tipHtml(list[Number(row.dataset.i)])
      tip.hidden = false
    }
    // Under the row, near the pointer (or the middle of the bars from the keyboard); above it near the bottom.
    const b = body.getBoundingClientRect(), r = row.getBoundingClientRect(), track = row.querySelector('.wt-track').getBoundingClientRect()
    const w = tip.offsetWidth, h = tip.offsetHeight
    const x = clientX ?? track.left + track.width / 2
    const left = Math.max(0, Math.min(b.width - w, x - b.left - w / 2))
    const below = r.bottom - b.top + 6
    const top = below + h > b.height + 40 ? r.top - b.top - h - 6 : below
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
  }
  function hide() {
    current?.classList.remove('is-on')
    current = null
    tip.hidden = true
  }

  const rowOf = (t) => t.closest?.('.wt-row')
  body.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return
    const row = rowOf(ev.target)
    if (row) show(row, ev.clientX)
  })
  body.addEventListener('pointerleave', (ev) => { if (ev.pointerType !== 'touch' && !body.contains(document.activeElement)) hide() })
  // Touch: tap a row to open its tooltip, tap it again (or anywhere else) to close it.
  body.addEventListener('click', (ev) => {
    const row = rowOf(ev.target)
    if (!row) return
    if (current === row && ev.pointerType === 'touch') hide()
    else show(row, ev.clientX || undefined)
  })
  document.addEventListener('click', (ev) => { if (current && !body.contains(ev.target)) hide() })
  body.addEventListener('focusin', (ev) => { const row = rowOf(ev.target); if (row) show(row) })
  body.addEventListener('focusout', (ev) => { if (!body.contains(ev.relatedTarget)) hide() })
  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hide()
    const row = rowOf(ev.target)
    if (!row || (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp')) return
    ev.preventDefault()
    // Down the first column and on into the second.
    const next = allRows[allRows.indexOf(row) + (ev.key === 'ArrowDown' ? 1 : -1)]
    next?.focus()
  })
  window.addEventListener('resize', hide)
  // Crossing the breakpoint swaps the reading order.
  twoCols.addEventListener('change', () => { hide(); layout() })
}
