import { resolve, dirname, relative } from 'node:path'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const pagesDir = resolve(here, 'pages')

// Every page is an index.html under pages/. pages/index.html is the home page (/),
// pages/<route>/index.html is served at /<route>/. Adding a page is adding a folder.
function findPages(dir, out = {}) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name)
    if (statSync(full).isDirectory()) findPages(full, out)
    else if (name === 'index.html') {
      const route = relative(pagesDir, dir) || 'home'
      out[route.replaceAll('/', '-')] = full
    }
  }
  return out
}

// {{site.path.to.value}} in any page's HTML is filled from data/site.json, so links and
// numbers shared across pages live in one place.
function siteData() {
  const file = resolve(here, 'data/site.json')
  return {
    name: 'site-data',
    transformIndexHtml(html) {
      const site = JSON.parse(readFileSync(file, 'utf8'))
      return html.replace(/\{\{site\.([\w.]+)\}\}/g, (m, path) => {
        const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), site)
        if (v == null) throw new Error(`data/site.json has no "${path}" (used in a page as ${m})`)
        return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
      })
    },
  }
}

// Draft partners (data/integrations.json, "draft": true) appear in local dev, in `npm run build:drafts`
// and in Cloudflare Pages preview builds (any branch but main), never on the production site.
const showDrafts = (command) =>
  command === 'serve' || process.env.SHOW_DRAFTS === '1' || (process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH !== 'main')

// The site's own pages for search engines; the docs write theirs to /docs/sitemap.xml.
function sitemap() {
  return {
    name: 'sitemap',
    generateBundle() {
      const site = JSON.parse(readFileSync(resolve(here, 'data/site.json'), 'utf8'))
      const urls = Object.keys(findPages(pagesDir)).map((route) => (route === 'home' ? '/' : `/${route.replaceAll('-', '/')}/`))
      this.emitFile({
        type: 'asset', fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`,
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  root: pagesDir,
  plugins: [siteData(), sitemap()],
  // Lets page scripts show draft partners where the production site hides them.
  define: { __SHOW_DRAFTS__: JSON.stringify(showDrafts(command)) },
  publicDir: resolve(here, 'public'),
  resolve: {
    alias: {
      '@data': resolve(here, 'data'),
      '@src': resolve(here, 'src'),
    },
  },
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: findPages(pagesDir) },
  },
  server: { port: 5172, fs: { allow: [here] } },
}))
