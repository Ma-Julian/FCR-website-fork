// The header stays at the top of the frame. Over the intro it is clear; once the intro has scrolled
// under it, it turns into a white bar (.is-stuck in base.css).
export function mountHeader() {
  const header = document.querySelector('.site-header')
  if (!header) return
  // Off the top of the page, the frame's top edge lifts out of view (.is-scrolled in base.css).
  const html = document.documentElement
  const lift = () => { const on = window.scrollY > 8; if (html.classList.contains('is-scrolled') !== on) html.classList.toggle('is-scrolled', on) }
  lift()
  window.addEventListener('scroll', lift, { passive: true })
  const intro = document.querySelector('[data-intro]')
  if (!intro || !('IntersectionObserver' in window)) { header.classList.add('is-stuck'); return }
  const io = new IntersectionObserver(
    ([e]) => header.classList.toggle('is-stuck', !e.isIntersecting),
    // The header's bottom edge, frame included: the intro counts as gone once it's above that line.
    { rootMargin: `-${Math.round(header.getBoundingClientRect().bottom)}px 0px 0px 0px` },
  )
  io.observe(intro)
}
