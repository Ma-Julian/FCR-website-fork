// Only in the plain-page build (DOCS_MPA=1), which ships no app code: opens and closes the
// sidebar from the "Menu" and hamburger buttons on narrow screens.
document.documentElement.classList.add('vp-mpa')
const sidebar = () => document.querySelector('.VPSidebar')
function setOpen(open) {
  const sb = sidebar()
  if (!sb) return
  sb.classList.toggle('open', open)
  document.querySelectorAll('.VPLocalNav .menu, .VPNavBarHamburger').forEach((b) => b.setAttribute('aria-expanded', String(open)))
  document.body.style.overflow = open ? 'hidden' : ''
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.VPLocalNav .menu, .VPNavBarHamburger')) {
    e.preventDefault()
    setOpen(!sidebar()?.classList.contains('open'))
  } else if (sidebar()?.classList.contains('open') && !e.target.closest('.VPSidebar')) {
    setOpen(false)
  }
})
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false) })

// Some hosts (such as the claude.ai artifact viewer) restore the previous scroll position on every page load.
// When a link opens another docs page without an #anchor, start that page at the top.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]')
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return
  let url
  try { url = new URL(a.getAttribute('href'), location.href) } catch { return }
  if (url.origin !== location.origin || url.hash || url.pathname === location.pathname) return
  try { sessionStorage.removeItem('__frame_scroll') } catch {}
  try { sessionStorage.setItem('vp-mpa-top', '1') } catch {}
}, true)
let toTop = false
try { toTop = sessionStorage.getItem('vp-mpa-top') === '1'; sessionStorage.removeItem('vp-mpa-top') } catch {}
if (toTop && !location.hash) {
  const top = () => window.scrollTo(0, 0)
  top()
  window.addEventListener('DOMContentLoaded', top)
  window.addEventListener('load', () => { top(); setTimeout(top, 50); setTimeout(top, 300) })
}

// Code groups (client tabs): the full VitePress build switches them with its app code, which this build doesn't ship.
document.addEventListener('change', (e) => {
  const input = e.target
  if (!(input instanceof HTMLInputElement) || !input.closest('.vp-code-group .tabs')) return
  const group = input.closest('.vp-code-group')
  const inputs = [...group.querySelectorAll('.tabs input')]
  const i = inputs.indexOf(input)
  const blocks = group.querySelectorAll('.blocks > div')
  blocks.forEach((b, j) => b.classList.toggle('active', j === i))
})
