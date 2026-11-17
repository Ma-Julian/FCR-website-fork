// "Using FCR": one line of partners under the hero, each with its status.
// Stays hidden while there is no one to show.
import { adopters } from '@src/lib/data.js'
import { CATEGORIES, STATUSES } from '@src/lib/partners.js'
import './adopters.css'

// Logos are inline SVGs from ./logos/<id>.svg, so they take the strip's text colour.
const logos = Object.fromEntries(
  Object.entries(import.meta.glob('./logos/*.svg', { query: '?raw', import: 'default', eager: true }))
    .map(([path, svg]) => [path.split('/').pop().replace(/\.svg$/, ''), svg]),
)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function mountAdopters(root) {
  if (!adopters.length) return
  root.querySelector('[data-adopters-list]').innerHTML = adopters.map((g) => {
    const logo = logos[g.id] ? `<span class="adopter-logo" aria-hidden="true">${logos[g.id]}</span>` : ''
    const label = `${logo}${esc(g.name)}`
    // The logo links to how the partner uses FCR (docsUrl) where we have it, else their site.
    const href = g.docsUrl || g.url
    const name = href ? `<a href="${esc(href)}">${label}</a>` : label
    return `<li class="adopter is-${esc(g.status)}"><span class="adopter-type">${esc(CATEGORIES[g.category])}</span><span class="adopter-name">${name}</span><span class="adopter-status"><i aria-hidden="true"></i>${esc(STATUSES[g.status])}</span></li>`
  }).join('')
  root.hidden = false
}
