// The docs' theme: light, dark, or the system's setting (the default, until the reader picks one in
// the top bar; docs/.vitepress/theme/ThemePicker.vue). The choice is kept in localStorage; "system"
// is no entry at all. Dark is the "dark" class on <html>, which the docs' styles hang off.
// A plain file loaded in <head> without defer, so the theme is set before the first paint (the site's
// Content-Security-Policy allows scripts from files only).
(function () {
  var KEY = 'fcr-docs-theme'
  var THEME_COLOR = { light: '#FFFFFF', dark: '#181513' }
  var root = document.documentElement
  var system = window.matchMedia('(prefers-color-scheme: dark)')

  function stored() {
    try { var v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark') return v } catch (e) { /* no storage */ }
    return 'system'
  }
  // The picker passes its choice, so it applies even where nothing can be stored.
  var choice = stored()
  function apply(next) {
    if (next === 'light' || next === 'dark' || next === 'system') choice = next
    var dark = choice === 'dark' || (choice === 'system' && system.matches)
    root.classList.toggle('dark', dark)
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLOR[dark ? 'dark' : 'light'])
  }
  apply()
  // Follow the system when it changes, and a choice made in another tab.
  system.addEventListener('change', function () { apply() })
  window.addEventListener('storage', function (ev) { if (ev.key === KEY || ev.key === null) apply(stored()) })
  window.fcrDocsTheme = apply
})()
