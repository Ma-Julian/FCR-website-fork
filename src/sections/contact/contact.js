// "Talk to us": a business card for Julian (data/site.json "contact") instead of a form.
// Opens from any link to site.contactUrl or to #talk; without JavaScript those links still reach
// the form. Docs pages link here with /#talk, which opens the card on load.
import { site } from '@src/lib/data.js'
import photo from './julian.jpg'
import ethlabsLogo from './ethlabs.svg?raw'
import './contact.css'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const ICON = {
  telegram: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21.6 3.3 2.9 10.5c-1.3.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.2-1.6ZM9.5 13.3l8.6-5.4c.4-.3.8-.1.5.2l-7.1 6.4-.3 3.3-1.7-4.5Z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.2-8.3L1.8 3h6.4l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/></svg>',
  email: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M3 6h18v12H3z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="m3 7 9 6 9-6"/></svg>',
}

export function mountContact() {
  const c = site.contact
  if (!c) return
  const tg = `https://t.me/${c.telegram}`
  const dlg = document.createElement('dialog')
  dlg.className = 'bc'
  dlg.setAttribute('aria-labelledby', 'bc-name')
  dlg.innerHTML = `
    <div class="bc-card" tabindex="-1" autofocus>
      <button type="button" class="bc-close" aria-label="Close">×</button>
      <div class="bc-top">
        <img class="bc-photo" src="${photo}" alt="" width="96" height="96">
        <div>
          <p class="bc-name" id="bc-name">${esc(c.name)}</p>
          <p class="bc-role">${[].concat(c.role).map(esc).join('<br>')}</p>
        </div>
      </div>
      <a class="bc-primary" href="${esc(tg)}" target="_blank" rel="noopener">${ICON.telegram}<span>Message me on Telegram</span></a>
      <ul class="bc-links">
        <li><a href="${esc(tg)}" target="_blank" rel="noopener">${ICON.telegram}<span>@${esc(c.telegram)}</span></a></li>
        <li><a href="https://x.com/${esc(c.x)}" target="_blank" rel="noopener">${ICON.x}<span>@${esc(c.x)}</span></a></li>
        <li><a href="mailto:${esc(c.email)}">${ICON.email}<span>${esc(c.email)}</span></a></li>
      </ul>
      <div class="bc-foot">
        <a class="bc-org" href="${esc(c.orgUrl)}" target="_blank" rel="noopener" aria-label="${esc(c.org)}">${ethlabsLogo}</a>
        <a class="bc-form" href="${esc(site.contactUrl)}" target="_blank" rel="noopener">Prefer a form?</a>
      </div>
    </div>`
  document.body.append(dlg)

  const open = () => { if (!dlg.open) dlg.showModal() }
  const close = () => dlg.close()
  dlg.querySelector('.bc-close').addEventListener('click', close)
  // A click on the backdrop (outside the card) closes it.
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) close() })
  dlg.addEventListener('close', () => { if (location.hash === '#talk') history.replaceState(null, '', location.pathname + location.search) })

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest?.('a[href]')
    if (!a || dlg.contains(a)) return
    const href = a.getAttribute('href')
    if (href === site.contactUrl || href === '#talk' || (a.hash === '#talk' && a.pathname === location.pathname)) {
      ev.preventDefault()
      open()
    }
  })
  if (location.hash === '#talk') open()
}
