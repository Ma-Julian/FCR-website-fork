// "Readiness": client support, who uses FCR, the RPC providers that serve it, and the proof behind it (data/ready.json).
import { ready } from '@src/lib/data.js'
import { STATUSES } from '@src/lib/partners.js'
import { icon } from '@src/lib/icons.js'
import { reveal } from '@src/lib/reveal.js'
import './ready.css'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
// One icon per proof card, so the four read as four different things (data/ready.json "icon").
const PROOF_ICON = { paper: 'document', proof: 'security', bounty: 'debug', backtest: 'chart-line' }
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
    root.querySelector('[data-ready-rpc]').innerHTML = ready.rpc.map((p) => item({ ...p, status: 'serves' })).join('')
    root.querySelector('[data-ready-rpc-group]').hidden = false
  }
  root.querySelector('[data-ready-proof]').innerHTML = ready.proof.map((p) =>
    `<li><a class="rd-proof" href="${esc(p.url)}" rel="noopener">${icon(PROOF_ICON[p.icon], { size: 32, cls: 'rd-proof-icon' })}<span class="rd-proof-label">${esc(p.label)}${icon('arrow-up-right', { size: 18, cls: 'rd-proof-arrow' })}</span><span class="rd-proof-detail">${esc(p.detail)}</span></a></li>`).join('')

  // Each group (clients, who uses it, the proof cards) cascades in when it comes into view: its label,
  // then each entry in reading order.
  for (const group of root.querySelectorAll('.rd-group:not([hidden])')) {
    reveal(group, [group.querySelector('.rd-col-title'), ...group.querySelectorAll('.rd-item')])
  }
  const proof = root.querySelector('[data-ready-proof]')
  reveal(proof, [root.querySelector('.rd-proof-title'), ...proof.children])
}
