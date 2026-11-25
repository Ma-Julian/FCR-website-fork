// The footer shows the header's wordmark large, spanning the page and standing on the footer's bottom
// edge: FCR and "Fast Confirmation Rule" on one line, or stacked on phones (base.css). Its font size is set in container
// units (base.css, .footer-mark); this measures the mark once at 100 px and stores two factors,
// whatever the system font's metrics: --fit, which makes the line fill the width exactly, and
// --descent, the space under the baseline, which a negative margin removes so the letters meet the
// frame's bottom border. The baseline is the sub's, the last line in either layout. It measures again
// when the layout switches.
export function mountFooterMark() {
  const mark = document.querySelector('[data-footer-mark]')
  if (!mark) return
  const fit = () => {
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
    mark.querySelector('.wordmark-sub')?.appendChild(probe)
    mark.style.fontSize = '100px'
    mark.style.marginBottom = '0'
    const box = mark.getBoundingClientRect()
    const below = box.bottom - probe.getBoundingClientRect().bottom
    mark.style.fontSize = ''
    mark.style.marginBottom = ''
    probe.remove()
    if (!box.width) return
    mark.style.setProperty('--fit', (10000 / box.width).toFixed(3))
    mark.style.setProperty('--descent', (below / 100).toFixed(3))
  }
  fit()
  document.fonts?.ready.then(fit)
  matchMedia('(max-width: 600px)').addEventListener?.('change', fit)
}
