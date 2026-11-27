// "User time saved with FCR": a road sign above the hero's tagline, fading in just before it.
// The number is the lower bound from data/time-saved.json (scripts/time-saved/), summed over the
// integrations shown in "Using FCR": rounded down, never extrapolated between refreshes.
import { timeSaved } from '@src/lib/data.js'
import './saved.css'

export const savedHours = (seconds) => Math.max(0, Math.floor(seconds / 3600))

export function mountSaved(el) {
  const t = timeSaved
  if (!t) return
  const hours = savedHours(t.savedSeconds)
  // The final number from the start: a count-up changed the sign's width every frame.
  el.querySelector('[data-saved-number]').textContent = hours.toLocaleString('en-US')
  el.querySelector('[data-saved-unit]').textContent = hours === 1 ? 'hour' : 'hours'
  // Show it once the exact font weights it uses have loaded, so nothing reflows when they swap in.
  // document.fonts.ready alone isn't enough: it can resolve before these faces are even requested.
  // At most 2.5 s, so a font that never arrives doesn't hide the sign; its fixed height (saved.css)
  // keeps the box still even then.
  const show = () => { el.hidden = false }
  if (!document.fonts?.load) return show()
  const family = getComputedStyle(el).fontFamily || 'Overpass'
  const faces = ['800 32px', '700 16px'].map((w) => document.fonts.load(`${w} ${family}`))
  Promise.race([Promise.all(faces), new Promise((r) => setTimeout(r, 2500))]).then(show, show)
}
