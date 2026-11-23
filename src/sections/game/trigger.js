// The way into the easter egg: hold F, C and R together (or tap the FCR wordmark three times on
// a touch screen). The game (about 17 KB compressed) is fetched quietly once the page is idle,
// so it opens without a download; with Save-Data on it waits until someone finds it.
const KEYS = ['f', 'c', 'r']
const loadGame = () => import('./game.js')

function prefetchWhenIdle() {
  if (navigator.connection?.saveData) return
  const go = () => loadGame().catch(() => { /* fetched again on demand */ })
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2000 }) : setTimeout(go, 1500))
  if (document.readyState === 'complete') idle()
  else window.addEventListener('load', idle, { once: true })
}

const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

export function mountGameTrigger() {
  prefetchWhenIdle()
  const down = new Set()
  let loading = false

  async function start() {
    if (loading || document.documentElement.classList.contains('gm-active')) return
    loading = true
    try {
      const { startGame } = await loadGame()
      startGame()
    } finally {
      loading = false
      down.clear()
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
    const k = (e.key || '').toLowerCase()
    if (!KEYS.includes(k)) return
    down.add(k)
    if (KEYS.every((x) => down.has(x))) start()
  })
  window.addEventListener('keyup', (e) => down.delete((e.key || '').toLowerCase()))
  window.addEventListener('blur', () => down.clear())

  // Touch screens have no keyboard: three quick taps on the FCR wordmark in the header. This runs on
  // the home page only, where the wordmark links to the page you are on, so a tap scrolls to the
  // top instead of reloading.
  const mark = document.querySelector('.site-header .wordmark')
  if (!mark) return
  let taps = []
  mark.addEventListener('click', (e) => {
    e.preventDefault()
    const now = Date.now()
    taps = [...taps.filter((t) => now - t < 1200), now]
    if (taps.length >= 3) { taps = []; start() }
    else window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  })
}
