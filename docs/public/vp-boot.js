// Starts the docs app (VitePress) after the first paint. The page arrives as complete HTML, so it can
// be shown at once; the app (about 170 KB of JS) then takes over a frame later. Without this, browsers
// run the app before painting and the docs appear 100-200 ms later. The build moves the page's module
// scripts into data-modules (docs/.vitepress/config.mts); they load in order, as they would have.
(function () {
  var me = document.currentScript
  var mods = ((me && me.getAttribute('data-modules')) || '').split(' ').filter(Boolean)
  function next(i) {
    if (i >= mods.length) return
    var s = document.createElement('script')
    s.type = 'module'
    s.src = mods[i]
    s.onload = s.onerror = function () { next(i + 1) }
    document.head.appendChild(s)
  }
  // requestAnimationFrame runs just before the next paint; the timeout inside it runs just after.
  requestAnimationFrame(function () { setTimeout(function () { next(0) }, 0) })
})()
