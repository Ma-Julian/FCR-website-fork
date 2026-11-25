// The page's icons: IBM's Carbon set (@carbon/icons), drawn with sharp corners and square ends to
// match the type. Only the icons used here are imported, so the rest stay out of the bundle.
// Brand marks (partner logos, Telegram, X) are logos, not icons, and stay as they are.
import arrowDown from '@carbon/icons/es/arrow--down/20.js'
import arrowRight from '@carbon/icons/es/arrow--right/20.js'
import arrowUpRight from '@carbon/icons/es/arrow--up-right/20.js'
import bullhorn from '@carbon/icons/es/bullhorn/32.js'
import chartLine from '@carbon/icons/es/chart--line/32.js'
import checkmark from '@carbon/icons/es/checkmark/16.js'
import chevronDown from '@carbon/icons/es/chevron--down/20.js'
import debug from '@carbon/icons/es/debug/32.js'
import document from '@carbon/icons/es/document/32.js'
import download from '@carbon/icons/es/download/20.js'
import email from '@carbon/icons/es/email/20.js'
import plug from '@carbon/icons/es/plug/32.js'
import security from '@carbon/icons/es/security/32.js'

const ICONS = {
  'arrow-down': arrowDown, 'arrow-right': arrowRight, 'arrow-up-right': arrowUpRight, bullhorn,
  'chart-line': chartLine, checkmark, 'chevron-down': chevronDown, debug, document, download, email, plug, security,
}

const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
const toSvg = (n) => `<${n.elem}${Object.entries(n.attrs || {}).map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('')}>${(n.content || []).map(toSvg).join('')}</${n.elem}>`

// One weight heavier than Carbon draws them: Carbon has no weights (each icon is one filled shape),
// so every shape gets an outline in its own colour. Half a unit on Carbon's 32-unit grid, where its
// lines are 2 units, thickens each line by a quarter; mitred joins keep the corners sharp.
const BOLDER = 0.5 / 32

// An icon as an SVG string, decorative (hidden from screen readers), in the text colour.
export function icon(name, { size, cls = '' } = {}) {
  const d = ICONS[name]
  if (!d) return ''
  const { width, height, ...attrs } = d.attrs
  const px = size ?? width
  const grid = Number(String(attrs.viewBox).split(' ')[2]) || 32
  const bolder = { stroke: 'currentColor', 'stroke-width': +(grid * BOLDER).toFixed(4), 'stroke-linejoin': 'miter', 'stroke-miterlimit': 10 }
  return toSvg({ ...d, attrs: { ...attrs, ...bolder, width: px, height: px, 'aria-hidden': 'true', focusable: 'false', ...(cls ? { class: cls } : {}) } })
}
