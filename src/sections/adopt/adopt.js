// "Easy to adopt": the core change, then each guide. The chain picked in the card marks its guide.
import { site, stackFor } from '@src/lib/data.js'
import { icon } from '@src/lib/icons.js'
import { reveal } from '@src/lib/reveal.js'
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
  // One column per group: chains on the left, infrastructure on the right.
  nav.innerHTML = GROUPS.map(([group, items]) => `<div class="ad-col"><p class="ad-group">${group}</p>` + items.map(([label, path, note]) =>
    `<a class="ad-guide" href="${base}${path}" data-guide="${path}"><b>${label} <span class="ad-arrow">${icon('arrow-right', { size: 18 })}</span></b>` +
    `<span class="ad-note" data-note="${note}">${note}</span></a>`).join('') + '</div>').join('')

  // The heading, the line under it, the code and its two points rise in one after another; the guides
  // only fade in, column by column.
  reveal(root.querySelector('.sec-head'), [root.querySelector('.sec-title'), root.querySelector('.sec-sub'),
    root.querySelector('.ad-diff'), ...root.querySelectorAll('.ad-points li')])
  reveal(nav, nav.children, { kind: 'fade', step: 120 })

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
