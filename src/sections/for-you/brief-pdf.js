// The integration brief as a PDF: the same content as the card, laid out for print.
// Loaded only when someone clicks the download button (pdf-lib is ~200 kB gzipped).
import { PDFDocument, StandardFonts, rgb, PDFString } from 'pdf-lib'
import markSvg from '../../../public/brand/fcr-mark-on-light.svg?raw'

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const INK = hex('#0B1630'), MIST = hex('#5E6B80'), RULE = hex('#D5DBE5'), SAND = hex('#F05F36'), SAND_INK = hex('#B83D1A')
const NATIVE = hex('#6E7E99')
const W = 595.28, H = 841.89, M = 42 // A4, points

// The mark's paths, straight from the brand file: the FCR initials.
const MARK = [...markSvg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])

export async function downloadBrief(brief) {
  const doc = await PDFDocument.create()
  doc.setTitle(brief.title)
  doc.setAuthor('Fast Confirmation Rule')
  doc.setSubject(`FCR integration brief for ${brief.entity}`)
  let page = doc.addPage([W, H])
  const reg = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)

  // Standard fonts only know WinAnsi; swap anything else for a close match.
  const charset = new Set(reg.getCharacterSet())
  const clean = (s) => [...String(s).replace(/≈/g, '~').replace(/→/g, '->').replace(/ /g, ' ')]
    .map((c) => (charset.has(c.codePointAt(0)) ? c : '?')).join('')
  const width = (s, f, size) => f.widthOfTextAtSize(clean(s), size)
  const text = (s, x, y, f, size, color = INK) => page.drawText(clean(s), { x, y, font: f, size, color })
  const center = (s, cx, y, f, size, color) => text(s, cx - width(s, f, size) / 2, y, f, size, color)
  const wrap = (s, f, size, max) => {
    const out = []
    let line = ''
    for (const word of clean(s).split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (line && f.widthOfTextAtSize(next, size) > max) { out.push(line); line = word } else line = next
    }
    if (line) out.push(line)
    return out
  }
  const rule = (y, color = RULE, thickness = 0.75) => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness, color })
  const link = (x, y, w, h, url) => {
    const ctx = doc.context
    const annot = ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x, y, x + w, y + h], Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) } })
    page.node.addAnnot(ctx.register(annot))
  }
  const badge = (s, cx, y, fill, color = INK) => {
    const size = 8.5, w = width(s, bold, size) + 12
    page.drawRectangle({ x: cx - w / 2, y: y - 4, width: w, height: 15, color: fill })
    center(s, cx, y, bold, size, color)
  }

  // ---------- header: mark and name top left, date on the right ----------
  MARK.forEach((d) => page.drawSvgPath(d, { x: M - 3, y: H - M + 6, scale: 30 / 48,
    color: INK }))
  text('Fast Confirmation Rule', M + 30, H - M - 13, bold, 12)
  const dated = `Integration brief, ${brief.date}`
  text(dated, W - M - width(dated, reg, 9), H - M - 13, reg, 9, MIST)

  // Links at the bottom: one line of places to go, one line to share this brief.
  const footTop = M + (brief.share ? 34 : 20)

  // ---------- title and the point in two lines ----------
  let y = H - M - 62
  for (const l of wrap(brief.title, bold, 22, W - 2 * M)) { center(l, W / 2, y, bold, 22); y -= 26 }
  if (brief.summary) {
    y -= 2
    for (const l of wrap(brief.summary, reg, 10.5, 470)) { center(l, W / 2, y, reg, 10.5); y -= 14 }
  }
  y -= 16

  // ---------- comparison: two centred columns ----------
  const L = M + (W - 2 * M) / 4, R = M + (3 * (W - 2 * M)) / 4, colMax = (W - 2 * M) / 2 - 20
  center(brief.live ? 'Before FCR' : 'Today', L, y, bold, 11)
  center('With FCR', R, y, bold, 11, SAND_INK)
  y -= 8; rule(y); y -= 18

  const group = (name) => { center(name, W / 2, y, bold, 9, MIST); y -= 16 }
  const lines = (arr, cx, top, f = bold, size = 10) => {
    let yy = top
    for (const item of [].concat(arr)) for (const l of wrap(item, f, size, colMax)) { center(l, cx, yy, f, size); yy -= size + 3 }
    return yy
  }

  // Speed
  group('Speed')
  const sp = brief.speed
  center(sp.fcrPre, R, y, reg, 8, MIST)
  y -= 20
  center(sp.today, L, y, bold, 22)
  center(sp.fcr, R, y, bold, 22, SAND_INK)
  y -= 13
  center(sp.caption, L, y, reg, 8, MIST)
  center(sp.caption, R, y, reg, 8, MIST)
  y -= 16
  if (sp.gain) { badge(sp.gain, R, y, SAND); y -= 20 }
  y = Math.min(lines(sp.todayHow, L, y), lines(sp.fcrHow, R, y)) - 10

  // Security
  group('Security')
  for (const row of brief.security) {
    center(row.label, L, y, reg, 8, MIST)
    center(row.label, R, y, reg, 8, MIST)
    y -= 12
    let yl = lines(row.today, L, y), yr = lines(row.fcr, R, y)
    if (row.badge) { badge(row.badge, L, yl - 1, INK, hex('#FFFFFF')); yl -= 18 }
    y = Math.min(yl, yr) - 5
  }

  // ---------- numbers ----------
  const n = brief.numbers
  if (n) {
    y -= 4; rule(y, INK, 1); y -= 17
    text('Numbers', M, y, bold, 11)
    text(n.period, M + width('Numbers', bold, 11) + 8, y, reg, 9, MIST)
    y -= 15
    const lede = wrap(`${n.strong} ${n.rest}`, reg, 10, W - 2 * M)
    // The first sentence in bold, the rest regular, wrapped as one paragraph.
    let left = clean(n.strong).length
    for (const l of lede) {
      const cut = Math.max(0, Math.min(l.length, left))
      const head = l.slice(0, cut), tail = l.slice(cut)
      text(head, M, y, bold, 10)
      if (tail) text(tail, M + width(head, bold, 10), y, reg, 10)
      left -= l.length + 1
      y -= 13
    }
    y -= 3
    if (n.bar) {
      const total = n.bar.native + n.bar.intent, full = W - 2 * M, wn = (full - 2) * (n.bar.native / total)
      page.drawRectangle({ x: M, y, width: wn, height: 7, color: NATIVE })
      page.drawRectangle({ x: M + wn + 2, y, width: full - wn - 2, height: 7, color: SAND })
      y -= 6
    }
    for (const [label, value, key] of n.lines) {
      y -= 13
      let x = M
      if (key) { page.drawRectangle({ x, y: y + 1, width: 6, height: 6, color: key === 'intent' ? SAND : NATIVE }); x += 12 }
      text(label, x, y, reg, 9.5)
      text(value, W - M - width(value, mono, 9.5), y, mono, 9.5)
      y -= 6; rule(y)
    }
    y -= 10
    text(n.source, M, y, reg, 7.5, MIST)
    y -= 6
  }

  // ---------- what it takes ----------
  if (brief.takes?.length) {
    y -= 6; rule(y, INK, 1); y -= 17
    text('What it takes', M, y, bold, 11)
    y -= 15
    for (const [label, body] of brief.takes) {
      text(label, M, y, bold, 9.5)
      for (const l of wrap(body, reg, 9.5, W - 2 * M - 64)) { text(l, M + 64, y, reg, 9.5); y -= 12.5 }
      y -= 2
    }
  }

  // ---------- footer: where to go next ----------
  rule(footTop)
  let fx = M, fy = footTop - 14
  const inline = (lead, label, url) => {
    if (fx > M) { text('·', fx, fy, reg, 9, MIST); fx += 10 }
    if (lead) { text(lead, fx, fy, reg, 9, MIST); fx += width(lead, reg, 9) + 3 }
    text(label, fx, fy, bold, 9)
    const w = width(label, bold, 9)
    page.drawLine({ start: { x: fx, y: fy - 1.5 }, end: { x: fx + w, y: fy - 1.5 }, thickness: 0.5, color: INK })
    link(fx, fy - 3, w, 11, url)
    fx += w + 8
  }
  inline('Integrate FCR:', brief.docs.label, brief.docs.url)
  if (brief.stack) inline('', brief.stack.label, brief.stack.url)
  if (brief.share) { fx = M; fy -= 14; inline('Share this brief:', brief.share.label, brief.share.url) }

  if (y < footTop + 10) console.warn(`brief: content reaches the footer (${Math.round(y)} < ${Math.round(footTop + 10)})`)
  const bytes = await doc.save()
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `FCR integration brief - ${brief.entity}.pdf`.replace(/[\\/:*?"<>|]/g, '')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

