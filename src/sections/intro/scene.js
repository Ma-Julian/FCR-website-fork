// The scene the bridge sits in (sky and sea, hills, camera), in the site's colours. Shared by
// the intro and the F+C+R game, so both look like the same place.
const HILLS = `<svg class="intro-hills" width="1440" height="810" viewBox="0 0 1440 810" aria-hidden="true">
<path d="M0 341 L0 300 C60 296 110 284 170 286 C240 289 290 270 360 276 C430 282 470 300 540 312 C580 320 610 330 640 340 Z" fill="#E3DFD0" opacity=".85"/>
<path d="M1440 341 L1440 292 C1380 288 1330 296 1260 290 C1190 284 1130 300 1060 306 C990 312 900 326 820 338 L800 341 Z" fill="#E3DFD0" opacity=".85"/>
<path d="M0 341 L0 318 C80 314 160 322 260 328 C330 332 380 338 420 341 Z" fill="#CFC9BD"/>
<path d="M1440 341 L1440 314 C1360 312 1280 320 1180 330 C1120 336 1080 339 1040 341 Z" fill="#CFC9BD"/></svg>`

export const sceneMarkup = () => `<div class="intro-sky"></div>${HILLS}
    <div class="br-cam"><div class="br-world"></div></div>`

// Scale the 1440×810 scene to cover a w×h box: keep the bridge's width in view on narrow
// screens, crop sky and road instead.
export function fitScene(host, hills, w, h) {
  if (!w || !h) return
  const a = w / h
  const vw = a >= 1440 / 810 ? 1440 : a >= 760 / 810 ? 810 * a : 760
  const vh = vw / a
  host.style.width = `${vw}px`
  host.style.height = `${vh}px`
  host.style.transform = `scale(${w / vw})`
  hills.style.left = `${(vw - 1440) / 2}px`
  hills.style.top = `${0.42 * vh - 341}px`
}
