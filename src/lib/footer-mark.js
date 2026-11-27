// The footer shows the header's wordmark large, spanning the page and standing on the footer's bottom
// edge: FCR and "Fast Confirmation Rule" on one line, or stacked on phones (base.css). Its font size is set in
// container units (base.css, .footer-mark), and two measurements fit it, whatever the system font's metrics:
// --fit, taken once at 100 px, makes the line fill the width exactly (widths scale with the font size); and
// --below, the depth of the mark's box under the baseline, which a negative margin removes so the letters
// meet the frame's bottom border. --below is measured at the size shown, again whenever that size changes:
// browsers round line metrics to whole pixels, so a factor taken at 100 px put the baseline up to 2 px off
// the edge at other sizes, and a hairline of the footer's white showed under the letters (27 Nov 2026).
// The baseline is the sub's, the last line in either layout.
export function mountFooterMark() {
  const mark = document.querySelector('[data-footer-mark]')
  const sub = mark?.querySelector('.wordmark-sub')
  if (!sub) return
  const fit = () => {
    mark.style.fontSize = '100px'
    const width = mark.getBoundingClientRect().width
    mark.style.fontSize = ''
    if (width) mark.style.setProperty('--fit', (10000 / width).toFixed(3))
  }
  const sink = () => {
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
    sub.appendChild(probe)
    const below = mark.getBoundingClientRect().bottom - probe.getBoundingClientRect().bottom
    probe.remove()
    mark.style.setProperty('--below', `${below.toFixed(3)}px`)
  }
  fit()
  sink()
  document.fonts?.ready.then(() => { fit(); sink() })
  matchMedia('(max-width: 600px)').addEventListener?.('change', fit)
  // The font size follows the page's width, so the depth changes on every resize, zoom and layout switch.
  if ('ResizeObserver' in window) new ResizeObserver(sink).observe(mark)
}
