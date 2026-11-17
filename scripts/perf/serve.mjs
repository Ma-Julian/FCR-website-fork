// Serves dist/ the way Cloudflare Pages does, for testing speed locally:
// clean URLs (/docs/faq -> docs/faq.html, /docs/ -> docs/index.html, /docs/faq.html -> 308 /docs/faq),
// the response headers from dist/_headers, and an optional delay per request to stand in for the
// distance to the server.  Usage: node scripts/perf/serve.mjs [--port 4173] [--latency 40]
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../../dist/', import.meta.url))
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml' }

// dist/_headers: a path pattern line, then indented "Name: value" lines.
function readHeaders() {
  const rules = []
  const file = join(dist, '_headers')
  if (!existsSync(file)) return rules
  let cur = null
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) { cur = { re: new RegExp('^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), headers: {} }; rules.push(cur) }
    else if (cur) { const i = line.indexOf(':'); cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim() }
  }
  return rules
}

function resolve(pathname) {
  const p = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  const f = join(dist, p)
  if (p.endsWith('/') && existsSync(join(f, 'index.html'))) return { file: join(f, 'index.html') }
  if (p.endsWith('.html') && existsSync(f)) {
    const to = p.endsWith('/index.html') ? p.slice(0, -'index.html'.length) : p.slice(0, -'.html'.length)
    return { redirect: to }
  }
  if (existsSync(f) && statSync(f).isFile()) return { file: f }
  if (existsSync(f + '.html')) return { file: f + '.html' }
  if (existsSync(join(f, 'index.html'))) return { redirect: p + '/' }
  return null
}

export function serve({ port = 4173, latency = 0 } = {}) {
  const rules = readHeaders()
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x')
    setTimeout(() => {
      const hit = resolve(u.pathname)
      for (const r of rules) if (r.re.test(u.pathname)) for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v)
      if (!hit) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found') }
      if (hit.redirect) { res.writeHead(308, { location: hit.redirect + u.search }); return res.end() }
      res.writeHead(200, { 'content-type': TYPES[extname(hit.file)] || 'application/octet-stream' })
      res.end(req.method === 'HEAD' ? undefined : readFileSync(hit.file))
    }, latency)
  })
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? Number(process.argv[i + 1]) : d }
  const port = arg('--port', 4173), latency = arg('--latency', 0)
  await serve({ port, latency })
  console.log(`dist/ on http://127.0.0.1:${port}/ (Cloudflare-style, ${latency} ms per request)`)
}
