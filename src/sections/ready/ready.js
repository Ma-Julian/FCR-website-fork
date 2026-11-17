// "Readiness": client support, who uses FCR, the RPC providers that serve it, and the proof behind it (data/ready.json).
import { ready } from '@src/lib/data.js'
import { STATUSES } from '@src/lib/partners.js'
import './ready.css'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
// One line icon per proof card, so the four read as four different things (data/ready.json "icon").
const svg = (d) => `<svg class="rd-proof-icon" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const ICONS = {
  // a page with text lines and a folded corner
  paper: svg('<path d="M7 3.5h10l5 5v16H7z"/><path d="M17 3.5v5h5"/><path d="M10.5 13h8M10.5 17h8M10.5 21h5"/>'),
  // a shield with a check: formally verified
  proof: svg('<path d="M14 3.5l8.5 3.2v6.6c0 5.3-3.6 9.3-8.5 11.2-4.9-1.9-8.5-5.9-8.5-11.2V6.7z"/><path d="M10 14.2l3 3 5.2-5.7"/>'),
  // a bug
  bounty: svg('<rect x="9" y="9" width="10" height="14" rx="5"/><path d="M11 9.5a3 3 0 0 1 6 0M14 13v10M9 14H5M23 14h-4M9 19H5.5M22.5 19H19M9.6 11 6.5 8.5M18.4 11l3.1-2.5"/>'),
  // a flat line of results over a year
  backtest: svg('<path d="M4 4v20h20"/><path d="M8 17l4-4 3.5 3 6-7"/><circle cx="21.5" cy="9" r="1.2" fill="currentColor"/>'),
}
// Partners ("Who uses it") take the same labels as the "Using FCR" strip, so a partner never shows two statuses.
const PILL = { shipped: 'Shipped', experimental: 'Experimental', planned: 'Planned', none: 'Not available', serves: 'Serves FCR', ...STATUSES }

export function mountReady(root) {
  // A name links out when the row has a url (the RPC providers).
  const name = (x) => (x.url ? `<a class="rd-name" href="${esc(x.url)}" rel="noopener">${esc(x.name)}</a>` : `<span class="rd-name">${esc(x.name)}</span>`)
  const item = (x) => `<li class="rd-item">${name(x)}<span class="rd-pill is-${esc(x.status)}">${PILL[x.status]}</span>${x.detail ? `<span class="rd-detail">${esc(x.detail)}</span>` : ''}</li>`
  root.querySelector('[data-ready-clients]').innerHTML = ready.clients.map(item).join('')
  root.querySelector('[data-ready-users]').innerHTML = ready.users.map(item).join('')
  // RPC providers: just the name, linked to the provider, and that it serves FCR. A provider is listed only once it
  // has said it's OK to be named (issue #29); until one is, the heading and the list stay hidden.
  if (ready.rpc.length) {
    const list = root.querySelector('[data-ready-rpc]')
    list.innerHTML = ready.rpc.map((p) => item({ ...p, status: 'serves' })).join('')
    list.hidden = false
    root.querySelector('[data-ready-rpc-title]').hidden = false
  }
  root.querySelector('[data-ready-proof]').innerHTML = ready.proof.map((p) =>
    `<li><a class="rd-proof" href="${esc(p.url)}" rel="noopener">${ICONS[p.icon] || ''}<span class="rd-proof-label">${esc(p.label)}</span><span class="rd-proof-detail">${esc(p.detail)}</span></a></li>`).join('')
}
