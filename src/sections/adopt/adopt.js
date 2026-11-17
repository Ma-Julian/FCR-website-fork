// "Easy to adopt": the core change, then each guide. The chain picked in the card marks its guide.
import { site, stackFor } from '@src/lib/data.js'
import './adopt.css'

const GROUPS = [
  ['Chains', [
    ['OP Stack', 'integrate/op-stack', 'Base, OP Mainnet, Celo and more'],
    ['Arbitrum Nitro', 'integrate/arbitrum-nitro', 'One, Nova, Robinhood Chain, Plume'],
    ['Other rollups', 'integrate/rollups', 'Linea, Scroll, ZKsync, Taiko and more'],
  ]],
  ['Infrastructure', [
    ['Bridges', 'integrate/bridges', ''],
    ['RPC providers', 'integrate/rpc-providers', ''],
    ['Exchanges', 'integrate/exchanges', ''],
  ]],
]

export function mountAdopt(root) {
  const base = site.docsUrl.replace(/\/?$/, '/')
  const nav = root.querySelector('[data-adopt-guides]')
  nav.innerHTML = GROUPS.map(([group, items]) => `<p class="ad-group">${group}</p>` + items.map(([label, path, note]) =>
    `<a class="ad-guide" href="${base}${path}" data-guide="${path}"><b>${label} <span aria-hidden="true">→</span></b>` +
    `<span class="ad-note" data-note="${note}">${note}</span></a>`).join('')).join('')

  // Once a chain is picked in the card, mark its guide.
  document.addEventListener('fcr:chain', ({ detail }) => {
    const path = detail.role === 'rollup' && detail.name ? (stackFor(detail.name)?.guide || 'integrate/rollups') : null
    for (const a of nav.querySelectorAll('.ad-guide')) {
      const on = a.dataset.guide === path
      a.classList.toggle('is-yours', on)
      const note = a.querySelector('.ad-note')
      note.textContent = on ? `Your guide for ${detail.name}` : note.dataset.note
    }
  })
}
