// Entrances: when a block first comes into view, its parts arrive one after another (styles: .rv in
// base.css). "rise" slides up 16 px while fading in, "fade" only fades, "pop" grows from 95% while fading in.
// Without IntersectionObserver, or with reduced motion, everything is simply there.
export function reveal(trigger, items, { kind = 'rise', step = 80, start = 0 } = {}) {
  const els = [...items].filter(Boolean)
  if (!trigger || !els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  els.forEach((el, i) => {
    el.classList.add('rv', `rv-${kind}`)
    el.style.setProperty('--rv-delay', `${start + i * step}ms`)
  })
  const io = new IntersectionObserver(([e]) => {
    // In view, or already scrolled past (a reload partway down the page).
    if (!e.isIntersecting && e.boundingClientRect.top > 0) return
    io.disconnect()
    els.forEach((el) => el.classList.add('is-in'))
  }, { rootMargin: '0px 0px -15% 0px' })
  io.observe(trigger)
}
