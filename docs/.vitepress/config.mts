// The docs at /docs/. Built with VitePress into dist/docs/ after the main site (see package.json).
// Pages are Markdown files in docs/; the sidebar below is the table of contents.
import { defineConfig } from 'vitepress'
import { writeFileSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import site from '../../data/site.json' with { type: 'json' }

// No "Edit this page" link: the repository is private (issue #19). Add editLink back when it's public.

// VitePress writes two tiny inline scripts into every page (dark class, Mac shortcut hint).
// The site's Content-Security-Policy only allows scripts from files, so they move into one.
const INLINE = /<script(?: id="[^"]*")?>([\s\S]*?)<\/script>/g
const inline = new Set<string>()
const MPA = process.env.DOCS_MPA === '1'

export default defineConfig({
  title: 'FCR Docs',
  titleTemplate: ':title · FCR Docs',
  description: 'How to integrate the Fast Confirmation Rule: guides for rollups, bridges and RPC services, client support and API reference.',
  base: '/docs/',
  outDir: '../dist/docs',
  // Clean URLs (/docs/quick-start) need a host that maps them to .html files, as Cloudflare Pages does.
  cleanUrls: process.env.DOCS_CLEAN_URLS !== '0',
  lastUpdated: true,
  // Search engines and answer engines find every docs page from /docs/sitemap.xml (listed in robots.txt).
  sitemap: { hostname: `${site.url}/docs/` },
  // Links to the site's own pages outside the docs (home, status) start with /../ and can't be checked here.
  ignoreDeadLinks: [/^\/\.\.\//],
  // The site is dark only; this also keeps VitePress from adding an inline script,
  // which the site's Content-Security-Policy (script-src 'self') would block.
  appearance: 'force-dark',
  metaChunk: true,
  // DOCS_MPA=1 builds plain pages with no client-side router, for hosts that can't serve the docs at /docs/.
  mpa: MPA,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#0E1B2C' }],
    // The docs offline cache (see scripts/perf/postbuild.mjs); a file, so the CSP's script-src 'self' allows it.
    ['script', { src: '/sw-register.js', defer: '' }],
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['meta', { property: 'og:site_name', content: 'Fast Confirmation Rule' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:image', content: `${site.url}/og-fcr.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${site.url}/og-fcr.png` }],
  ],
  // Each page gets its own canonical URL and share title and description.
  transformHead({ pageData, title, description }) {
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = `${site.url}/docs/${path}`
    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
    ]
  },
  transformHtml(html) {
    return html.replace(INLINE, (_m, js) => {
      inline.add(js)
      return ''
    }).replace('</head>', '<script src="/docs/vp-inline.js" defer></script>' + (MPA ? '<script src="/docs/vp-mpa.js" defer></script>' : '') + '</head>')
      // The docs are always dark, so the class is in the HTML: the inline script no longer has to run
      // before the first paint (it only adds the Mac shortcut hint now) and can wait until after.
      .replace(/<html([^>]*?)(?: class="([^"]*)")?>/, (_m, attrs, cls) => `<html${attrs} class="${cls ? cls + ' ' : ''}dark">`)
      // Paint first, start the app after (docs/public/vp-boot.js). The modulepreload links stay, so the
      // files still download right away; only running them waits one frame. (Not in the plain-page build.)
      .replace(/<head>([\s\S]*?)<\/head>/, (head) => {
        if (MPA) return head
        const mods: string[] = []
        const rest = head.replace(/\s*<script type="module" src="([^"]+)"><\/script>/g, (_m, src) => { mods.push(src); return '' })
        return mods.length ? rest.replace('</head>', `<script src="/docs/vp-boot.js" data-modules="${mods.join(' ')}" defer></script></head>`) : head
      })
  },
  buildEnd(config) {
    writeFileSync(resolve(config.outDir, 'vp-inline.js'), [...inline].join(';\n') + '\n')
    if (MPA) copyFileSync(resolve(config.root, '.vitepress/mpa/menu.js'), resolve(config.outDir, 'vp-mpa.js'))
  },
  themeConfig: {
    siteTitle: 'FCR Docs',
    nav: [
      // This site's own home page, not the fastconfirm.it domain (which may serve another build).
      // '/../' leaves the /docs/ base, so it works on any host the site is deployed to.
      { text: 'Home', link: '/../', target: '_self', rel: '' },
      { text: 'Talk to us', link: '/../#talk', target: '_self', rel: '' },
    ],
    sidebar: [
      {
        text: 'Evaluate',
        items: [
          { text: 'What is FCR?', link: '/' },
          { text: 'How FCR works', link: '/evaluate/how-it-works' },
          { text: 'Assumptions and attacks', link: '/evaluate/assumptions-and-attacks' },
          { text: 'Security', link: '/evaluate/security' },
          { text: 'Compare with alternatives', link: '/evaluate/comparison' },
        ],
      },
      {
        text: 'Integrate',
        items: [
          { text: 'Quick start', link: '/integrate/quick-start' },
          { text: 'Run a node with FCR', link: '/integrate/run-a-node' },
          { text: 'RPC providers', link: '/integrate/rpc-providers' },
          {
            text: 'Rollups',
            link: '/integrate/rollups',
            items: [
              { text: 'Arbitrum Nitro', link: '/integrate/arbitrum-nitro' },
              { text: 'OP Stack', link: '/integrate/op-stack' },
              { text: 'ZK Stack', link: '/integrate/zk-stack' },
              { text: 'Starknet stack', link: '/integrate/starknet' },
              { text: 'Agglayer CDK', link: '/integrate/agglayer-cdk' },
            ],
          },
          { text: 'Bridges and messaging', link: '/integrate/bridges' },
          { text: 'Exchanges and custodians', link: '/integrate/exchanges' },
          { text: 'Test and roll out', link: '/integrate/rollout' },
        ],
      },
      {
        text: 'Operate',
        items: [
          { text: 'Monitoring', link: '/operate/monitoring' },
          { text: 'Reorgs and fallback', link: '/operate/reorgs-and-fallback' },
          { text: 'Security recommendations', link: '/operate/security-recommendations' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'The safe tag with FCR', link: '/reference/safe-tag' },
          { text: 'Client support', link: '/reference/clients' },
          { text: 'APIs', link: '/reference/apis' },
          { text: 'Versions and changes', link: '/reference/versions' },
          { text: 'Time saved by FCR', link: '/reference/time-saved' },
          { text: 'Where our numbers come from', link: '/reference/numbers' },
          { text: 'Glossary', link: '/reference/glossary' },
        ],
      },
      {
        text: 'Help',
        items: [
          { text: 'FAQ', link: '/faq' },
          { text: 'Get support', link: '/support' },
        ],
      },
    ],
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
    docFooter: { prev: 'Previous', next: 'Next' },
    lastUpdated: { text: 'Updated', formatOptions: { dateStyle: 'medium' } },
    footer: { message: 'Fast Confirmation Rule. Developed by <a href="https://ethlabs.org">Ethlabs</a>, the <a href="https://ethereum.foundation">Ethereum Foundation</a> and Ethereum’s consensus-client teams.' },
  },
})
