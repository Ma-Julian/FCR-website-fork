// "What FCR changes for you": the reader picks what they do and names their chain,
// protocol or asset; the card below answers with their own numbers.
import { roles, lists, site, waits, ready, sourcedWait, waitK, measuredFor, stackFor, venueFor, bridgeFor, timeSaved } from '@src/lib/data.js'
import { savedHours } from '@src/sections/saved/saved.js'
import { STATUSES } from '@src/lib/partners.js'
import { result, speedup, headlineFor, issuerPlan, appPlan, solverPlan, fmt, REORG_RATE_URL } from './results.js'
import '@fontsource/overpass-mono/latin-500.css'
import '@fontsource/overpass-mono/latin-600.css'
import './for-you.css'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const FCR = site.timing.fcrMinimumSeconds
const K_CHOICES = [6, 12, 32, 64, 'fin']
const waitTab = (w) => (w.wait === 'based' ? 'BASED ROLLUP' : w.wait === 'finalized' ? 'WAITS FOR FINALITY' : w.wait === 'justified' ? 'WAITS FOR JUSTIFICATION' : `WAITS ${w.slots} SLOTS`)
// A shareable link per chain: fastconfirm.it/?chain=base opens that chain's card.
const slug = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// A docs page under site.docsUrl, whether or not that ends in a slash.
const guideUrl = (path) => site.docsUrl.replace(/\/?$/, '/') + path

const DOWNLOAD_ICON = '<svg class="fy-cta-icon" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9.5M5.5 8.5 10 13l4.5-4.5M4 16.5h12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

// Builds and downloads the PDF; pdf-lib loads on first use.
async function getBrief(btn, brief) {
  if (btn.getAttribute('aria-busy') === 'true') return
  btn.setAttribute('aria-busy', 'true')
  try {
    const { downloadBrief } = await import('./brief-pdf.js')
    await downloadBrief(brief)
  } catch (e) {
    console.error(e)
    window.location.href = site.contactUrl
  } finally {
    btn.removeAttribute('aria-busy')
  }
}

// What the first speed figure measures, in each reader's terms.
// Before a visitor names their own chain, the card tells the story of a chain already on FCR (Julian, 27 Oct 2026):
// anyone, not only builders, sees what FCR does in practice. The first live chain in data/waits.json.
const EXAMPLE = waits.find((w) => w.live) || null
// What FCR has saved one live chain so far, or null while its entry isn't published.
const savedFor = (name) => timeSaved?.integrations.find((i) => i.name.toLowerCase() === String(name).toLowerCase()) || null

const WAIT_LABEL = {
  rollup: 'to credit a deposit from Ethereum', bridge: 'to relay a message', rpc: 'from a new block to safe',
  issuer: 'before a mint', solver: 'of risk per fill', app: 'for a deposit to land', default: 'for a deposit to land',
}

export function mountForYou(root) {
  // Nothing is chosen at first: the card appears once the reader names their chain, protocol or asset.
  const state = { role: 'rollup', entity: '', isNew: false, query: '', open: null, hi: 0, k: null }
  const roleById = (id) => roles.find((r) => r.id === id) || roles[0]
  const role = () => roleById(state.role)
  // Alphabetical everywhere, so no chain or provider reads as ranked above another.
  const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })
  const listOf = (r) => (lists[r.list] || []).slice().sort(byName)

  root.innerHTML = `
    <div class="fy-head">
      <h2 class="fy-title" id="fy-title">Why should you use FCR?</h2>
    </div>
    <p class="fy-sentence">I <button type="button" class="fy-slot fy-role" aria-expanded="false" aria-controls="fy-picker"><span data-role-phrase></span><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M5 8l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button> <span data-connector></span> <input class="fy-slot fy-input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="fy-picker" autocomplete="off" spellcheck="false">.</p>
    <p class="fy-sub">Tell us what you work on and see what FCR changes for you.</p>
    <div id="fy-picker" class="fy-picker" hidden>
      <div class="fy-plates" role="group" data-plates></div>
      <div class="fy-picker-hint" data-picker-hint></div>
    </div>
    <div class="fy-card" data-card hidden>
      <p class="fy-example" data-example hidden></p>
      <div class="fy-new" data-new hidden><span class="fy-chip">NOT LISTED</span><span data-new-text></span></div>
      <h3 class="fy-headline" aria-live="polite" data-headline></h3>
      <section class="fy-grp fy-do" aria-labelledby="fy-sec-do" data-sec-do hidden>
        <h4 class="fy-grp-title" id="fy-sec-do">What you can do</h4>
        <p class="fy-num-lede" data-do-lede></p>
        <ol class="fy-do-steps" data-do-steps></ol>
        <ol class="fy-steps fy-cards" data-do-cards hidden></ol>
        <p class="fy-do-note" data-do-note hidden></p>
        <p class="fy-do-docs" data-do-docs hidden></p>
      </section>
      <div class="fy-cmp" data-cmp>
        <p class="fy-live" data-live hidden></p>
        <div class="fy-cmp-cols" aria-hidden="true"><span data-col-today>Today</span><span class="is-fcr">With FCR</span></div>
        <section class="fy-grp" aria-labelledby="fy-sec-speed">
          <h4 class="fy-grp-title" id="fy-sec-speed">Speed</h4>
          <p class="fy-race" data-race hidden></p>
          <div class="fy-k" role="group" data-k hidden><span class="fy-k-q" data-k-q></span><span class="fy-k-chips" data-k-chips></span></div>
          <div class="fy-pairs" data-speed></div>
          <div class="fy-ledger fy-tiers" data-tiers hidden></div>
          <p class="fy-src" data-speed-src hidden></p>
        </section>
        <section class="fy-grp" aria-labelledby="fy-sec-security" data-sec-security>
          <h4 class="fy-grp-title" id="fy-sec-security" data-security-title>Security</h4>
          <div class="fy-pairs" data-security></div>
          <p class="fy-src" data-security-src hidden></p>
        </section>
      </div>
      <section class="fy-grp fy-num" aria-labelledby="fy-sec-demand" data-sec-demand hidden>
        <h4 class="fy-grp-title" id="fy-sec-demand">Who wants it</h4>
        <p class="fy-num-lede" data-demand-lede></p>
        <div class="fy-ledger" data-demand></div>
        <p class="fy-more" data-demand-more></p>
      </section>
      <section class="fy-grp fy-num" aria-labelledby="fy-sec-enable" data-sec-enable hidden>
        <h4 class="fy-grp-title" id="fy-sec-enable">How to turn it on</h4>
        <p class="fy-num-lede" data-enable-lede></p>
        <ol class="fy-steps" data-steps></ol>
        <p class="fy-more" data-enable-note></p>
      </section>
      <section class="fy-grp fy-num" aria-labelledby="fy-sec-integrated" data-sec-integrated hidden>
        <h4 class="fy-grp-title" id="fy-sec-integrated">Already integrated</h4>
        <p class="fy-num-lede" data-integrated-lede></p>
        <div class="fy-ledger" data-integrated></div>
      </section>
      <section class="fy-grp fy-num fy-do" aria-labelledby="fy-sec-fill" data-sec-fill hidden>
        <h4 class="fy-grp-title" id="fy-sec-fill">How to integrate</h4>
        <ul class="fy-steps fy-options" data-fill-steps></ul>
      </section>
      <section class="fy-grp fy-num" aria-labelledby="fy-sec-numbers" data-sec-numbers hidden>
        <h4 class="fy-grp-title" id="fy-sec-numbers">Numbers</h4>
        <p class="fy-grp-sub fy-period" data-numbers-period></p>
        <p class="fy-num-lede" data-numbers-lede></p>
        <div class="fy-split-bar" data-split></div>
        <div class="fy-ledger" data-numbers></div>
      </section>
      <div class="fy-foot"><p class="fy-stack" data-stack hidden></p><a class="fy-cta" data-cta href="${esc(site.contactUrl)}"></a></div>
    </div>`

  const $ = (s) => root.querySelector(s)
  const roleBtn = $('.fy-role'), input = $('.fy-input'), picker = $('#fy-picker'), plates = $('[data-plates]')

  function matches(r, q) {
    q = (q || '').trim().toLowerCase()
    const all = listOf(r)
    if (!q) return all.slice()
    const starts = [], has = []
    for (const n of all) {
      const l = n.toLowerCase()
      if (l.startsWith(q) || l.split(' ').some((w) => w.startsWith(q))) starts.push(n)
      else if (l.includes(q)) has.push(n)
    }
    return starts.concat(has)
  }
  function options() {
    // Until the reader types something new, show every option, the chosen one marked, rather than
    // filtering the list down to the name already picked.
    const typed = state.query !== state.entity ? state.query : ''
    const r = role(), q = typed.trim()
    const m = matches(r, typed)
    const opts = m.map((name) => ({ name, isNew: false }))
    if (q && !m.some((n) => n.toLowerCase() === q.toLowerCase())) opts.push({ name: q, isNew: true })
    return opts
  }

  function commit(name) {
    const r = role()
    name = (name || '').trim().slice(0, 60)
    if (!name) { state.query = state.entity; close(); renderSentence(); return }
    const hit = listOf(r).find((n) => n.toLowerCase() === name.toLowerCase())
    const changed = (hit || name) !== state.entity
    state.entity = hit || name
    state.isNew = !hit
    state.query = state.entity
    if (changed) state.k = null
    close()
    input.blur()
    renderSentence()
    renderResult(true)
    // Keep the address shareable: chains get ?chain=…, everything else a plain URL.
    const url = r.list === 'chains' && hit && r.id === 'rollup' ? `?chain=${slug(hit)}#for-you` : window.location.pathname
    try { window.history.replaceState(null, '', url) } catch {}
    document.dispatchEvent(new CustomEvent('fcr:chain', { detail: { role: r.id, name: hit || null } }))
  }

  function open(which) { state.open = which; state.hi = 0; renderPicker() }
  function close() { state.open = null; renderPicker() }

  // ---------- rendering ----------
  function renderSentence() {
    const r = role()
    root.querySelector('[data-role-phrase]').textContent = r.phrase
    root.querySelector('[data-connector]').textContent = r.connector
    input.placeholder = r.placeholder
    input.setAttribute('aria-label', r.title)
    if (document.activeElement !== input) input.value = state.query
    const w = Math.max(input.value.length, r.placeholder.length, 3) * 0.55 + 0.5
    input.style.width = `${w.toFixed(2)}em`
  }

  function plate({ label, tab, on, active, pick, isNew }) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `fy-plate${on ? ' is-on' : ''}${active ? ' is-active' : ''}${isNew ? ' is-new' : ''}`
    b.setAttribute('aria-pressed', on ? 'true' : 'false')
    b.innerHTML = `<span class="fy-plate-label">${esc(label)}</span>`
    b.addEventListener('mousedown', (ev) => ev.preventDefault()) // keep focus in the input
    b.addEventListener('click', pick)
    return b
  }

  function renderPicker() {
    const r = role()
    picker.hidden = state.open === null
    roleBtn.setAttribute('aria-expanded', String(state.open === 'role'))
    input.setAttribute('aria-expanded', String(state.open === 'entity'))
    if (state.open === null) return
    const q = state.query.trim()
    plates.setAttribute('aria-label', state.open === 'role' ? 'What do you do?' : r.title)
    root.querySelector('[data-picker-hint]').textContent = state.open === 'role'
      ? '' : q ? 'Not listed? Pick “Use” and we’ll note it.' : 'Not listed? Type its name and press Enter.'
    plates.replaceChildren()
    if (state.open === 'role') {
      for (const x of roles) {
        plates.appendChild(plate({
          label: x.phrase.charAt(0).toUpperCase() + x.phrase.slice(1), tab: x.tab, on: x.id === r.id,
          pick: () => {
            Object.assign(state, { role: x.id, entity: '', isNew: false, query: '', k: null })
            open('entity'); renderSentence(); renderResult(true)
            setTimeout(() => input.focus(), 30)
          },
        }))
      }
    } else {
      options().forEach((o, i) => {
        const w = r.usesWaits ? sourcedWait(o.name) : null
        plates.appendChild(plate({
          label: o.isNew ? `Use “${o.name}”` : o.name,
          tab: o.isNew ? 'NOT LISTED' : r.usesWaits ? (w ? waitTab(w) : 'SET YOUR WAIT') : r.tab,
          on: !o.isNew && o.name === state.entity, active: i === state.hi, isNew: o.isNew,
          pick: () => commit(o.name),
        }))
      })
    }
  }

  function renderResult(grow) {
    // Nothing named yet: show the example chain as a rollup, without touching what the visitor typed.
    const example = !state.entity && EXAMPLE
    const st = example ? { ...state, entity: EXAMPLE.name, isNew: false, k: null } : state
    const r = example ? roleById('rollup') : role()
    root.querySelector('[data-card]').hidden = !st.entity
    const exEl = root.querySelector('[data-example]')
    exEl.hidden = !example
    if (example) exEl.innerHTML = '<span class="fy-chip">EXAMPLE</span>'
    if (!st.entity) return
    const ent = st.entity || '…'
    const w = r.usesWaits ? sourcedWait(st.entity) : null
    // Issuers: what to do depends on how they issue. CCIP waits for finality unless the pool opts in.
    const issuer = r.id === 'issuer' ? issuerPlan(st.entity) : null
    // Solvers: the venue's own wait (data/venues.json), or the reader's when it isn't published.
    const venue = r.id === 'solver' ? venueFor(st.entity) : null
    const sp = r.id === 'solver' ? solverPlan(ent, venue, st.k) : null
    // Bridges: their published wait on Ethereum (data/bridges.json), or the reader's when we don't list it.
    const bridge = r.id === 'bridge' ? bridgeFor(st.entity) : null
    // Issuers on another bridge ("Ethereum and Axelar"): that bridge's own wait, from the same data.
    const issuerBridge = issuer?.kind === 'provider' ? bridgeFor(issuer.provider) : null
    const wb = bridge || issuerBridge
    // Intent bridges have no single wait: each filler sets its own, so the card says "Variable".
    const variable = wb?.wait === 'variable'
    const k = w ? waitK(w) : issuer?.kind === 'chainlink' ? 'fin' : wb && !variable ? (wb.wait === 'finalized' ? 'fin' : wb.blocks) : variable ? null : st.k
    const based = w?.wait === 'based'
    const res = result(r.id, ent, k, !!w, based)
    const known = res.today !== null && res.today !== undefined
    // App builders: the step is asking their chain to turn FCR on.
    const plan = issuer || (r.id === 'app' ? appPlan(ent, { live: w?.live || null, todayValue: known ? res.todayValue : null }) : null)

    const nw = root.querySelector('[data-new]')
    nw.hidden = !st.isNew
    root.querySelector('[data-new-text]').textContent = `We don’t have sourced numbers for “${ent}” yet. Set its wait below.`
    // Chains already on FCR (data/waits.json "live"): the card compares before and after.
    const live = w?.live || null
    // Issuers on another bridge: the call to action is the headline, then the comparison.
    const ask = plan?.kind === 'provider'
    root.querySelector('[data-headline]').textContent = live ? (r.id === 'app' ? `How FCR is helping your app on ${ent}` : `How FCR is helping ${ent}`) : ask ? `${plan.provider} hasn’t enabled FCR yet.` : sp?.kind === 'single-chain' ? `FCR and ${ent}` : headlineFor(ent, r.id)
    const liveEl = root.querySelector('[data-live]')
    liveEl.hidden = !live && !ask
    // Live chains use best-case figures, like the rest of the site: the old rule's wait, and FCR's minimum.
    if (live) liveEl.innerHTML = esc(live.note) + (live.why ? `<span class="fy-live-why">${esc(live.why)}</span>` : '')
    // The ask, then why it's worth asking: faster distribution, on Ethereum's own security.
    else if (ask) liveEl.innerHTML = `Ask your contact at ${esc(plan.provider)} to do so!<span class="fy-live-why">Holders can then move your asset to other chains in seconds, backed by Ethereum’s validator set instead of a block count.</span>`
    root.querySelector('[data-col-today]').textContent = live ? 'Before FCR' : 'Today'

    const kBox = root.querySelector('[data-k]')
    kBox.hidden = r.id === 'rpc' || r.id === 'solver' || !!w || !!wb || !st.entity || (issuer && issuer.kind !== 'provider') || (sp && (sp.kind === 'single-chain' || !!(venue?.blocks || venue?.tiers || venue?.seconds)))
    const q = r.id === 'solver' ? 'How long until you treat a deposit as safe? (blocks)' : `How many blocks does ${r.id === 'issuer' ? 'your mint' : ent} wait today?`
    root.querySelector('[data-k-q]').textContent = q
    kBox.setAttribute('aria-label', q)
    const chips = root.querySelector('[data-k-chips]')
    chips.replaceChildren(...K_CHOICES.map((v) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = `fy-kchip${st.k === v ? ' is-on' : ''}`
      b.setAttribute('aria-pressed', String(st.k === v))
      b.textContent = v === 'fin' ? 'Finality' : String(v)
      b.addEventListener('click', () => { st.k = v; renderResult(true) })
      return b
    }))

    // Two columns, as on Apple's compare pages: each pair is today on the left, FCR on the right,
    // a value with a short caption under it. No row labels; the caption says what the value is.
    // The column name is read out by screen readers everywhere and shown as a tag on phones, where each pair stacks.
    const cell = (col, html, cls = '') => `<div class="fy-cell ${cls}"><span class="fy-cell-col">${col}<span class="visually-hidden">: </span></span>${html}</div>`
    const pair = (today, fcr) => cell(live ? 'Before FCR' : 'Today', today) + cell('With FCR', fcr, 'is-fcr')
    // The small line above a figure ("at minimum"); the other column keeps an empty one so the figures line up.
    const fig = (v, pre = '') => `<div class="fy-pre${pre ? '' : ' is-empty'}"${pre ? '' : ' aria-hidden="true"'}>${pre ? esc(pre) : '&nbsp;'}</div><div class="fy-fig">${esc(v)}</div>`
    // One value, or several on their own lines (no bullets).
    const txt = (v) => `<div class="fy-txt">${[].concat(v).map((l) => `<span>${esc(l)}</span>`).join('')}</div>`
    const lab = (v) => `<div class="fy-lab">${esc(v)}</div>`
    const cap = (v) => `<div class="fy-cap">${esc(v)}</div>`
    const fmtN = (n) => n.toLocaleString('en-US')

    // Speed: how long it waits, and what it waits for.
    // Live chains too: FCR's one time on the site, its minimum (Julian, 17 Nov 2026).
    const x = live ? speedup(live.beforeSeconds, live.nowSeconds) : known ? speedup(res.today) : null
    const todayFig = live ? live.before : known ? res.todayValue : '?'
    const fcrFig = live ? live.now : `${FCR} s`, fcrPre = 'at minimum'
    const what = WAIT_LABEL[r.id] || WAIT_LABEL.default
    const todayHow = w?.how ? w.how : k === 'fin' ? 'Waits for finality' : k === 'just' ? 'Waits for justification' : based ? `Based rollup: waits for an Ethereum anchor, about ${k} blocks` : k ? `Counts ${k} blocks` : 'Counts a fixed number of blocks'
    // What the PDF brief shows: the same content as the card, as plain text.
    const docsAbs = new URL(site.docsUrl, site.url).href
    const brief = {
      entity: ent, title: live ? `How FCR is helping ${ent}` : headlineFor(ent, r.id), live: !!live,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      siteUrl: site.url, siteHost: new URL(site.url).host,
      speed: { today: todayFig, fcr: fcrFig, fcrPre, caption: what, gain: x ? `${x} faster` : '', todayHow, fcrHow: 'Counts attestations' },
      security: [], numbers: null, stack: null,
      docs: { label: docsAbs.replace(/^https:\/\//, ''), url: docsAbs },
    }
    // Solvers: one figure, FCR's confirmation, then the reorg risk below it.
    root.querySelector('[data-speed]').innerHTML = sp && sp.kind !== 'single-chain'
      ? `<div class="fy-cell fy-solo">${fig(`${FCR} s`, 'at minimum')}${cap('before you fill against a deposit on Ethereum')}<span class="fy-gain">Very strong guarantee</span></div>`
      : variable ? [
        pair(fig('Variable') + cap(what), fig(fcrFig, fcrPre) + cap(what)),
        pair(txt(wb.how || 'Each filler picks its wait'), txt('Counts attestations')),
      ].join('')
      : [
        pair(known ? fig(todayFig) + cap(what) : fig('?') + cap('pick the wait above'),
          fig(fcrFig, fcrPre) + cap(what) + (x ? `<span class="fy-gain">${esc(x)} faster</span>` : '')),
        pair(txt(res.todayHow && r.id === 'rpc' ? res.todayHow : todayHow), txt(res.fcrHow || 'Counts attestations')),
      ].join('')
    // No race, size tiers or source lines: the card leads with one figure (Julian, 3 Nov 2026).
    for (const sel of ['[data-race]', '[data-tiers]', '[data-speed-src]']) root.querySelector(sel).hidden = true

    // RPC providers: who already wants it and how to turn it on replace the security comparison,
    // which is about their customers' choice, not theirs.
    const isRpc = r.id === 'rpc'
    root.querySelector('[data-sec-security]').hidden = isRpc
    root.querySelector('[data-sec-demand]').hidden = !isRpc
    root.querySelector('[data-sec-enable]').hidden = !isRpc
    if (isRpc) {
      const d = res.demand, en = res.enable
      root.querySelector('[data-demand-lede]').innerHTML = `<strong>${esc(d.lede)}</strong> ${esc(d.rest)}`
      root.querySelector('[data-demand]').innerHTML = ready.users.map((u) =>
        `<div class="fy-line"><span class="fy-line-label"><b>${esc(u.name)}</b> <span class="fy-dim">${esc(u.detail)}</span></span><span class="fy-badge is-${esc(u.status)}">${esc(STATUSES[u.status] || u.status)}</span></div>`).join('')
      root.querySelector('[data-demand-more]').textContent = d.more
      root.querySelector('[data-enable-lede]').innerHTML = `<strong>${esc(en.lede)}</strong>`
      const clients = ready.clients.filter((c) => c.status === 'shipped' || c.status === 'experimental').map((c) =>
        `<div class="fy-line"><span class="fy-line-label">${esc(c.name)}${c.status === 'experimental' ? ' <span class="fy-dim">experimental</span>' : ''}</span><code class="fy-flag">${esc(c.flag || 'on by default')}</code></div>`).join('')
      root.querySelector('[data-steps]').innerHTML = en.steps.map((s) =>
        `<li class="fy-step"><div class="fy-step-title">${esc(s.title)}</div><p class="fy-step-body">${esc(s.body)}</p>${s.clients ? `<div class="fy-ledger fy-flags">${clients}</div>` : ''}</li>`).join('')
      root.querySelector('[data-enable-note]').textContent = en.note
    }

    // Bridges: who has already integrated FCR, instead of how-to steps. CCIP 2.0 has it built in.
    const intSec = root.querySelector('[data-sec-integrated]')
    intSec.hidden = !(r.id === 'bridge' && st.entity)
    if (!intSec.hidden) {
      const isCcip = /chainlink|ccip/i.test(ent)
      // Same status words as "Using FCR" and Readiness (src/lib/partners.js): CCIP is testing, live on testnet.
      root.querySelector('[data-integrated-lede]').innerHTML = isCcip
        ? '<strong>CCIP 2.0 has FCR built in.</strong> It is live on testnet; mainnet lanes come next.'
        : '<strong>Chainlink CCIP is testing FCR.</strong> It is built into CCIP 2.0 and live on testnet; mainnet lanes come next.'
      root.querySelector('[data-integrated]').innerHTML = ready.users.map((u) =>
        `<div class="fy-line"><span class="fy-line-label"><b>${esc(u.name)}</b> <span class="fy-dim">${esc(u.detail)}</span></span><span class="fy-badge is-${esc(u.status)}">${esc(STATUSES[u.status] || u.status)}</span></div>`).join('')
    }

    // Security: what each rule checks, and what backs it. Chains that wait for an Ethereum
    // checkpoint get their own "today" column; everything else counts blocks.
    {
      const TODAY = {
        fin: ['That two thirds of stake finalized the block', 'Reverting it means slashing a third of all stake', 'No finalized block has been reverted on mainnet'],
        just: ['That two thirds of stake attested to its checkpoint', ['Safe if most validators are honest and online', 'Not a confirmation rule'], ['Live deployment across Arbitrum chains', 'No known reorgs']],
        count: ['Only that time has passed', 'Nothing', ['Live deployment across many chains', 'No known reorgs']],
      }
      const [checks, theory, practice] = TODAY[k === 'fin' || k === 'just' ? k : 'count']
      const FCR_SEC = { checks: 'That validators keep the block in the chain', theory: ['Research paper', 'Lean 4 safety proof', 'Ethereum Foundation bug bounty'], practice: ['Live deployment on Gnosis Chain', 'No false confirmations in a one-year backtest'] }
      brief.security = [
        { label: 'what it checks', today: checks, fcr: FCR_SEC.checks },
        { label: 'theoretical backing', today: theory, fcr: FCR_SEC.theory, badge: k === 'fin' ? 'Ethereum’s maximum security' : '' },
        { label: 'empirical backing', today: practice, fcr: FCR_SEC.practice },
      ]
      root.querySelector('[data-security-title]').textContent = sp ? 'Reorg risk' : 'Security'
      const secSrc = root.querySelector('[data-security-src]')
      secSrc.hidden = !sp
      secSrc.innerHTML = sp ? `Reorg rate: <a href="${esc(REORG_RATE_URL)}" target="_blank" rel="noopener">Decipher, post-Pectra reorg analysis</a>. FCR record: EthPandaOps replay of client code on a year of mainnet.` : ''
      if (sp?.risk) {
        root.querySelector('[data-security]').innerHTML = sp.risk.map((x) => pair(lab(x.label) + txt(x.today), lab(x.label) + txt(x.fcr))).join('')
      } else root.querySelector('[data-security]').innerHTML = [
        // Finality is the strongest guarantee Ethereum gives, more than most projects need; badged like the speed-up.
        pair(lab('what it checks') + txt(checks), lab('what it checks') + txt(FCR_SEC.checks)),
        pair(lab('theoretical backing') + txt(theory) + (k === 'fin' ? '<span class="fy-gain is-final">Ethereum’s maximum security</span>' : ''), lab('theoretical backing') + txt(FCR_SEC.theory)),
        pair(lab('empirical backing') + txt(practice), lab('empirical backing') + txt(FCR_SEC.practice)),
      ].join('')
    }

    // Numbers: only where we've measured them. Where many users pay a fast bridge to skip the
    // wait, that's the point; elsewhere it's the time everyone spent waiting.
    const m = measuredFor(st.entity)
    const numbers = root.querySelector('[data-sec-numbers]')
    numbers.hidden = !m
    if (m) {
      const nb = m.nativeBridge
      const intent = (m.intentBridges || []).filter((x) => x.deposits > 0).sort((a, b) => b.deposits - a.deposits)[0]
      const total = nb.deposits + (intent ? intent.deposits : 0)
      const share = intent ? intent.deposits / total : 0
      const nativePct = Math.round((nb.deposits / total) * 100)
      const skipPct = 100 - nativePct
      // Only lead with the share that skips the bridge when it's a real chunk of users.
      const skips = share >= 0.25
      // "3 in 4": the nearest simple fraction at or below the share that skipped the bridge.
      const inN = [[9, 10], [4, 5], [3, 4], [2, 3], [3, 5], [1, 2], [2, 5], [1, 3], [1, 4]].find(([a, b]) => a / b <= share)
      const hoursSaved = !live && known ? Math.round((nb.deposits * (res.today - FCR)) / 3600) : null
      // A chain already on FCR: the waiting it has saved its users so far (data/time-saved.json, a lower bound).
      // Only once its "Using FCR" entry is published, like the corner counter; until then, its deposit count.
      const ts = live ? savedFor(ent) : null
      const savedH = ts ? savedHours(ts.savedSeconds) : null
      const period = ts ? `since ${live.sinceText}` : 'last 12 months'
      root.querySelector('[data-numbers-period]').textContent = period
      const strong = ts ? `FCR has saved ${ent}’s users at least ${fmtN(savedH)} hours of waiting.`
        : live ? `${fmtN(nb.deposits)} deposits from Ethereum to ${ent} in the last 12 months.`
        : skips
        ? `At least ${inN[0]} in ${inN[1]} deposits from Ethereum to ${ent} skip ${nb.label}.`
        : `${fmtN(nb.deposits)} deposits from Ethereum to ${ent} waited${known ? ` ${res.todayValue} each` : ''} on ${nb.label}.`
      const rest = ts ? `Across ${fmtN(ts.transfers)} deposits from Ethereum since ${live.sinceText}, each measured against the earliest it could have arrived under finality.`
        : live ? `Since ${live.sinceText} its bridges wait for FCR, at minimum ${live.now}, instead of ${live.before.replace('~', 'about ')}.`
        : skips
        ? `Users pay to avoid the wait. ${ent} could improve their user experience.`
        : known && res.today <= FCR ? 'FCR keeps that speed and adds a guarantee: it counts attestations instead of blocks.' : `With FCR, that wait drops to as little as ${FCR} seconds.`
      root.querySelector('[data-numbers-lede]').innerHTML = `<strong>${esc(strong)}</strong> ${esc(rest)}`
      const split = root.querySelector('[data-split]')
      split.hidden = !intent
      if (intent) {
        split.setAttribute('role', 'img')
        split.setAttribute('aria-label', `${nb.label}: ${nativePct}% of deposits; ${intent.name}: ${skipPct}%`)
        split.innerHTML = `<div class="fy-split-seg is-native" style="flex-grow:${nb.deposits}"></div><div class="fy-split-seg is-intent" style="flex-grow:${intent.deposits}"></div>`
      }
      const line = (label, value, key = '') =>
        `<div class="fy-line">${key ? `<span class="fy-key ${key}" aria-hidden="true"></span>` : ''}<span class="fy-line-label">${label}</span><span class="fy-line-value">${value}</span></div>`
      const eth = nb.eth >= 1e6 ? `${(nb.eth / 1e6).toFixed(2)}M` : nb.eth >= 1e4 ? `${Math.round(nb.eth / 1e3)}k` : fmtN(Math.round(nb.eth || 0))
      const day = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
      brief.numbers = {
        period, strong, rest, bar: intent ? { native: nb.deposits, intent: intent.deposits } : null,
        lines: ts ? [['Waiting saved with FCR', `≥ ${fmtN(savedH)} hours`, ''], ['Deposits from Ethereum with FCR', fmtN(ts.transfers), '']] : [
          intent && [`Deposits through ${intent.name}`, `${fmtN(intent.deposits)}  ${skipPct}%`, 'intent'],
          [`Deposits through ${nb.label}`, intent ? `${fmtN(nb.deposits)}  ${nativePct}%` : fmtN(nb.deposits), intent ? 'native' : ''],
          nb.eth >= 1 && [`ETH that waited on ${nb.label}`, `${eth} ETH`, ''],
          hoursSaved && ['User time FCR would have saved in the last year', `${fmtN(hoursSaved)} hours`, ''],
        ].filter(Boolean),
        source: ts ? 'Measured on chain by the FCR team; method in the docs under Reference, Time saved by FCR.' : `Measured on Ethereum mainnet by the FCR team, ${day(m.from)} to ${day(m.to)}.`,
      }
      root.querySelector('[data-numbers]').innerHTML = ts ? [
        line('Waiting saved with FCR', `≥ ${fmtN(savedH)} hours`),
        line('Deposits from Ethereum with FCR', fmtN(ts.transfers)),
      ].join('') : [
        intent ? line(`Deposits through ${esc(intent.name)}`, `${fmtN(intent.deposits)} <span class="fy-pct">${skipPct}%</span>`, 'is-intent') : '',
        line(`Deposits through ${esc(nb.label)}`, intent ? `${fmtN(nb.deposits)} <span class="fy-pct">${nativePct}%</span>` : fmtN(nb.deposits), intent ? 'is-native' : ''),
        nb.eth >= 1 ? line(`ETH that waited on ${esc(nb.label)}`, `${eth} ETH`) : '',
        hoursSaved ? line('User time FCR would have saved in the last year', `${fmtN(hoursSaved)} hours`) : '',
      ].join('')
    }

    // Issuers and app builders: the steps for their setup. Ethereum alone has no mint to speed up, so no comparison.
    const doSec = root.querySelector('[data-sec-do]')
    const p2 = plan || (sp?.kind === 'single-chain' ? { lede: sp.lede, steps: sp.steps } : null)
    doSec.hidden = !p2 || plan?.kind === 'provider'
    root.querySelector('[data-cmp]').hidden = plan?.kind === 'ethereum' || sp?.kind === 'single-chain'
    // Solvers: which chains and bridges already credit at FCR speed, then how to fill on it.
    // Solvers: read safe from an RPC or node with FCR, or get the chains they fill on to adopt it.
    const fillSec = root.querySelector('[data-sec-fill]')
    fillSec.hidden = !sp || sp.kind === 'single-chain'
    if (!fillSec.hidden) {
      const quick = esc(guideUrl('integrate/quick-start'))
      // Line icons in the style of the Readiness cards (28 px, 2 px stroke, accent colour).
      const line = (d) => `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
      const PLUG = line('<path d="M10.5 3.5v5M17.5 3.5v5"/><path d="M7.5 8.5h13v4.5a6.5 6.5 0 0 1-13 0z"/><path d="M14 19.5v5"/>')
      const HORN = line('<path d="M4.5 11.5v5h4l10 5.5V6l-10 5.5z"/><path d="M8.5 16.5l1.5 6h3l-1.3-5.4"/><path d="M22 11.2a3.6 3.6 0 0 1 0 5.6"/>')
      root.querySelector('[data-fill-steps]').innerHTML = [
        [PLUG, 'Read <code>safe</code> from a node with FCR', `Turn FCR on in your Ethereum node or use an RPC provider that serves it (<a href="${quick}">quick start</a>), and fill once the deposit’s block is at or below <code>safe</code>, instead of counting blocks.`],
        [HORN, 'Ask the chains you fill on to adopt it', 'When a chain’s bridge credits deposits from Ethereum with FCR, you are repaid and can rebalance in seconds instead of minutes.'],
      ].map(([icon, t, b]) => `<li class="fy-step"><span class="fy-step-icon" aria-hidden="true">${icon}</span><div class="fy-step-title">${t}</div><p class="fy-step-body">${b}</p></li>`).join('')
    }
    // Steps as cards side by side (Chainlink issuers), otherwise a numbered list.
    const stepsEl = root.querySelector('[data-do-steps]'), cardsEl = root.querySelector('[data-do-cards]')
    cardsEl.hidden = !plan?.cards
    stepsEl.hidden = !!plan?.cards
    if (p2 && !plan) {
      root.querySelector('[data-do-lede]').textContent = p2.lede
      stepsEl.innerHTML = ''
      const n = root.querySelector('[data-do-note]')
      n.hidden = false
      n.classList.add('is-plain')
      n.textContent = p2.steps.join(' ')
      root.querySelector('[data-do-docs]').hidden = true
    }
    // App builders don't pick the confirmation rule, their chain does, so they see speed only. RPC providers see demand instead.
    root.querySelector('[data-sec-security]').hidden = r.id === 'rpc' || r.id === 'app'
    if (plan) {
      const code = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>')
      root.querySelector('[data-do-lede]').textContent = plan.lede
      stepsEl.innerHTML = plan.cards ? '' : plan.steps.map((t) => `<li>${code(t)}</li>`).join('')
      cardsEl.innerHTML = plan.cards ? plan.cards.map((c) =>
        `<li class="fy-step">${c.tag ? `<span class="fy-card-tag">${esc(c.tag)}</span>` : ''}<div class="fy-step-title">${esc(c.title)}</div><p class="fy-step-body">${code(c.body)}</p></li>`).join('') : ''
      const note = root.querySelector('[data-do-note]')
      note.classList.remove('is-plain')
      note.hidden = !plan.note
      note.textContent = plan.note || ''
      const docs = root.querySelector('[data-do-docs]')
      docs.hidden = !plan.docs
      docs.innerHTML = plan.docs ? `<a href="${esc(plan.docs.href)}" target="_blank" rel="noopener">Read ${esc(plan.docs.label)}</a>` : ''
    }

    // The brief downloads as a PDF; other roles link to the docs or the contact form.
    const cta = root.querySelector('[data-cta]')
    const isBrief = res.cta.href === 'brief'
    // A chain already on FCR needs no asking.
    const ctaLabel = live && r.id === 'app' ? 'Talk to the FCR team' : res.cta.label
    cta.innerHTML = (isBrief ? DOWNLOAD_ICON : '') + `<span>${esc(ctaLabel)}</span>`
    cta.href = isBrief ? '#' : res.cta.href === 'guide' ? (res.cta.path ? guideUrl(res.cta.path) : site.docsUrl) : site.contactUrl
    cta.toggleAttribute('download', false)
    cta.onclick = isBrief ? (ev) => { ev.preventDefault(); getBrief(cta, brief) } : null
    // The example card's action is to make it your own: back up to the sentence.
    if (example) {
      cta.innerHTML = '<span>See what FCR changes for your chain</span>'
      cta.href = '#for-you'
      cta.onclick = (ev) => { ev.preventDefault(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); input.focus({ preventScroll: true }) }
    }
    if (sp && sp.kind !== 'single-chain') { cta.innerHTML = '<span>Read the quick start</span>'; cta.href = guideUrl('integrate/quick-start') }

    // Chains on a shared stack: a quiet link to that stack's guide, for teams that run the stack.
    const stack = r.id === 'rollup' && !example ? stackFor(st.entity) : null
    const stackEl = root.querySelector('[data-stack]')
    stackEl.hidden = !stack
    // For whoever the brief gets forwarded to: the point in two lines, then what it takes.
    const skipLine = brief.numbers && brief.numbers.strong.startsWith('At least')
      ? ` ${brief.numbers.strong.replace(/^At least (\d+ in \d+) deposits from Ethereum to .+ skip .+\.$/, 'Users already pay a fast bridge for at least $1 deposits.')}` : ''
    brief.summary = live ? live.note
      : known
      ? `${ent} credits Ethereum deposits after ${res.todayValue}. With FCR it could be as little as ${FCR} seconds, backed by attestations instead of a block count.${skipLine}`
      : `With FCR, ${ent} could credit Ethereum deposits in as little as ${FCR} seconds, backed by attestations instead of a block count.`
    const change = w?.change ? w.change : k === 'fin' ? 'Read Ethereum’s safe block instead of finalized, with FCR on in your Ethereum node.'
      : stack?.name === 'Arbitrum stack' ? 'Turn on FCR in the Ethereum node that Nitro reads from. No rollup change.'
      : stack?.name === 'OP Stack' ? 'An op-node setting to read Ethereum’s safe block instead of counting blocks (under review upstream), plus FCR on in your Ethereum node.'
        : k === 'fin' ? 'Read Ethereum’s safe block instead of finalized, with FCR on in your Ethereum node.'
          : k === 'just' ? 'Turn on FCR in your Ethereum node: you already read its safe block.'
            : 'Read Ethereum’s safe block instead of counting blocks, with FCR on in your Ethereum node.'
    brief.takes = [
      ['Change', change],
      // Chains that wait for finality never see an Ethereum reorg today; with FCR they must handle one.
      !live && k === 'fin' && ['Reorgs', `Since ${ent} relies on finality today, it never has to deal with a reorg. With FCR it must handle the rare reorg of a fast-confirmed block, for example by re-checking deposits once they are finalized.`],
      ['Risk', 'Usually FCR only slows down: safe stops advancing or falls back to finalized. In the worst case, if its assumptions break, a fast-confirmed block can be reorged.'],
      ['Maturity', 'Shipped in Lighthouse, Prysm, Nimbus and Lodestar; experimental in Teku. In production on Gnosis Chain; live on testnet in Chainlink CCIP.'],
    ].filter(Boolean)
    if (r.id === 'rollup' && !st.isNew) {
      const share = new URL(`/?chain=${slug(ent)}`, site.url).href
      brief.share = { label: share.replace(/^https:\/\//, ''), url: share }
    }
    if (stack) brief.stack = { name: stack.name, label: `Read the ${stack.guideName}`, url: new URL(guideUrl(stack.guide), site.url).href }
    // Issuers on Ethereum alone have no bridge to read about: the docs home instead.
    if (issuer?.kind === 'ethereum') cta.href = site.docsUrl
    // Chains go to the docs, not a PDF brief (Julian, 3 Nov 2026): their stack's guide when we know it,
    // else the rollups guide. The button says it, so no extra line under it.
    if (stack) {
      cta.innerHTML = `<span>Read the ${esc(stack.guideName)}</span>`
      cta.href = guideUrl(stack.guide)
      stackEl.hidden = true
    }
  }

  // ---------- events ----------
  roleBtn.addEventListener('click', () => (state.open === 'role' ? close() : open('role')))
  input.addEventListener('focus', () => { input.select(); open('entity') })
  input.addEventListener('input', () => { state.query = input.value; state.open = 'entity'; state.hi = 0; renderSentence(); renderPicker() })
  let blurTimer
  input.addEventListener('blur', () => {
    clearTimeout(blurTimer)
    blurTimer = setTimeout(() => {
      if (state.open !== 'entity') return
      const cur = state.query.trim()
      if (cur && cur !== state.entity) commit(cur)
      else { state.query = state.entity; close(); renderSentence() }
    }, 120)
  })
  input.addEventListener('keydown', (ev) => {
    const opts = options(), n = opts.length
    if (ev.key === 'ArrowDown') { ev.preventDefault(); state.open = 'entity'; state.hi = n ? (state.hi + 1) % n : 0; renderPicker() }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); state.hi = n ? (state.hi - 1 + n) % n : 0; renderPicker() }
    else if (ev.key === 'Enter') { ev.preventDefault(); const o = opts[state.hi] || opts[0]; commit(o ? o.name : state.query) }
    else if (ev.key === 'Escape') { state.query = state.entity; close(); input.blur(); renderSentence() }
  })
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && state.open === 'role') { close(); roleBtn.focus() } })
  document.addEventListener('click', (ev) => { if (state.open === 'role' && !root.contains(ev.target)) close() })

  // Opened from a shared link (?chain=base): show that chain's card straight away.
  const fromLink = new URLSearchParams(window.location.search).get('chain')
  const linked = fromLink && (lists.chains || []).find((n) => slug(n) === slug(fromLink))
  if (linked) Object.assign(state, { role: 'rollup', entity: linked, query: linked, isNew: false })
  renderSentence()
  renderResult(false)
  if (linked) {
    document.dispatchEvent(new CustomEvent('fcr:chain', { detail: { role: 'rollup', name: linked } }))
    requestAnimationFrame(() => root.scrollIntoView({ block: 'start' }))
  }
}
