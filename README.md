# fastconfirm.it

The website for the Fast Confirmation Rule (FCR). Static pages built with Vite and curated
data kept as JSON files in this repo. No server code.

## Run it

```sh
npm install
npm run dev        # http://localhost:5172
npm run build      # checks data/, then builds to dist/
npm run preview    # serves dist/
npm run docs:dev   # the docs on their own, with live reload
```

Node 20 or later. A static site: build command `npm run build`, output folder `dist`, no server
functions. `public/_headers` sets the security headers and caching and `public/_redirects` keeps old
links working; Netlify and Cloudflare Pages both read them. fastconfirm.it is served by Netlify from
the official repo; see "Hosting" below.

## How the project is laid out

```
pages/                 one folder per page; each index.html is a page
  index.html           home page  →  /
  <route>/index.html   any new page  →  /<route>/   (found automatically, no config)
src/
  pages/               one entry script per page (home.js)
  sections/            self-contained page sections: markup, logic and styles together
    intro/             the bridge intro
      bridge-world.js  the 3D bridge engine (towers, cables, project lanes, signs)
      intro.js         timeline: speed, counter, tagline, pausing, scaling
    for-you/           "Why should you use FCR?"
      results.js       the copy and numbers per role (pure functions)
    game/              the F+C+R easter egg (hold F, C and R; or tap the FCR wordmark three times)
      rules.js         thresholds from the FCR spec and how a run is judged (pure functions)
      course.js        where attestations, potholes and the eclipse go; proves each course
      game.js          the run: camera, truck, vacuums, HUD, score cards
  lib/
    data.js            the only place that imports data/ files
  styles/base.css      tokens, fonts, header, footer, buttons
docs/                  the docs at /docs/ (VitePress): one Markdown file per page;
                       the sidebar is in docs/.vitepress/config.mts, the look (the home page's,
                       with a light and a dark theme) in docs/.vitepress/theme/
data/                  the curated "databases", one JSON file per collection
scripts/
  validate-data.mjs    checks every data file before each build
public/                copied as-is (favicon, social image, brand files, robots.txt)
```

## The data collections

Edit these files and open a pull request; the build refuses data that doesn't fit.

| File | What it holds | Used by |
| --- | --- | --- |
| `site.json` | Site name, links (contact, docs), timing constants | every page; `{{site.…}}` in any page's HTML is filled from it |
| `projects.json` | Projects that use FCR and how they appear on the bridge | intro |
| `roles.json` | The roles in "I work on a rollup called …" | for-you |
| `lists.json` | Named lists of chains, bridges, RPCs, assets and venues | for-you |
| `venues.json` | How fillers on each order venue wait for an Ethereum deposit, with sources | for-you (solver card) |
| `bridges.json` | How long each bridge waits on Ethereum by default, and the one setting that moves it to FCR | for-you (bridge card) |
| `stacks.json` | Rollup stacks, the chains on each, and the docs guide for turning FCR on | for-you (chain card) |
| `waits.json` | Sourced deposit waits per chain: a slot count, or an Ethereum checkpoint (justified, finalized) | for-you, waits chart, docs Reference → Where our numbers come from |
| `measured.json` | Deposits into each chain over a year, through its own bridge and through intent bridges, counted on-chain (method and contract per row) | for-you, docs Reference → Where our numbers come from |
| `integrations.json` | Partners that use or are integrating FCR, with type and status | "Using FCR" strip |
| `ready.json` | Client support, who uses FCR (same statuses as `integrations.json`), RPC providers that serve it (only those that agreed to be named), proof cards | Readiness, docs RPC providers page |
| `time-saved.json`, `time-saved-daily.json` | How much waiting FCR has saved: totals per integration and route (a lower bound measured on-chain), and the same per day for charts; refreshed every morning by the official repo's GitHub Action (`.github/workflows/time-saved.yml`), which commits them to `main`, so Netlify redeploys; or by hand with `npm run time-saved`; method in `scripts/time-saved/README.md` | Hero sign, the Gnosis example's numbers, docs page Reference → Time saved |
| `gnosis-deposits.json` | Real ETH deposits from Ethereum to Gnosis via the Omnibridge since the bridge switched to FCR (7 Oct 2026), with how long each took to arrive; refresh with `node scripts/game/gnosis-deposits.mjs` | the F+C+R game |

### Adding a project to the bridge

Add an entry to `data/projects.json`:

```json
{ "id": "acme", "name": "Acme", "type": "l2", "signLine": "Acme Chain", "active": true }
```

- `type: "l2"` is a destination: it gets green exit signs at random intervals.
- `type: "bridge"` is a route: it gets its own tinted lane for a stretch, then the lane
  ends and comes back after a random gap. Bridges also need `"laneColor": "#RRGGBB"`: the build
  checks for it, though the bridge now tints every lane in the site's orange.
  The first two active bridges get lanes.
- `name` is at most 18 characters so it fits a sign; `signLine` at most 22.
- Set `active: false` to take a project off the bridge without deleting it.

### Adding a sourced wait

Add an entry to `data/waits.json`:

```json
{ "name": "Acme", "wait": "slots", "slots": 5, "source": "…", "sourceUrl": "https://…", "checkedOn": "2026-10-19" }
```

- `wait: "slots"` means the chain waits a fixed number of L1 blocks; give `slots`.
- `wait: "based"` is a based rollup: give `slots` as the typical wait for the next Ethereum anchor.
- `wait: "justified"` or `"finalized"` means it waits for that Ethereum checkpoint; leave out
  `slots`. The site uses `timing.justifiedSeconds` or `timing.finalitySeconds` from `site.json`.
- `scripts/waits/` has the script that measures OP Stack chains on chain and the latest results.
- The name must match the entry in `lists.json`. With a source the footnote cites it; without
  one the build prints a warning on every deploy.

### Adding a collection

1. Add `data/<name>.json`.
2. Add a check for it in `scripts/validate-data.mjs` (the build fails on a file without one).
3. Export it from `src/lib/data.js` and import it from there.

## Partners

Partners that use or are integrating FCR are entries in `data/integrations.json`; the "Using FCR"
strip shows them, and Readiness lists them under "Who uses it" (`data/ready.json`, same status).
An entry's fields:

```json
{
  "id": "gnosis",                 // same id as in projects.json, if it is on the bridge
  "name": "Gnosis",
  "category": "l2",               // l2, bridge, messaging, exchange, wallet, rpc, client, issuer, solver, app
  "status": "building",           // live, testnet, building
  "summary": "Up to 160 characters on what they use FCR for.",
  "url": "https://…", "announcementUrl": null, "docsUrl": null,
  "since": "2026-10-16",
  "approvedBy": null,             // optional: who at the partner approved this entry
  "draft": true
}
```

**Drafts.** Every entry has `draft: true` or `false`. Drafts show in `npm run dev`, in
`npm run build:drafts` and on Cloudflare Pages previews, i.e. any branch but `main` (so a partner
can review a link before it goes live). The production site leaves them out. A published entry
needs the partner's `url` and a finished summary; the build refuses "TODO" in it.

## Adding a page

Create `pages/<route>/index.html` and an entry script in `src/pages/`, linked from the
page with `<script type="module" src="../../src/pages/<route>.js"></script>`. The page is
served at `/<route>/`. Reuse sections from `src/sections/` and `src/styles/base.css`.

## Hosting

**fastconfirm.it** is deployed by Netlify from the official public repo,
[ethereum/fcr-website](https://github.com/ethereum/fcr-website): every push to its `main` goes live,
and every pull request there gets a Netlify deploy preview. Netlify reads `netlify.toml` (build
command, output folder, Node 22).


### Cloudflare Pages instead (one-time setup)

1. Cloudflare dashboard > Workers & Pages > Create > Pages > connect this GitHub repo.
   Production branch `main`; build command `npm run build`; output directory `dist`;
   environment variable `NODE_VERSION` = `22`.
2. Custom domain: Pages project > Custom domains > add `fastconfirm.it`.
3. Speed > Optimization: leave Early Hints on (Pages sends the docs' preload links as 103 Early Hints).
   Turn off Rocket Loader and any HTML minification or "auto-minify" that rewrites scripts: the
   CSP only allows the site's own script files.

## Speed: the docs within 100 ms of a click

The goal is the docs on screen within 100 ms of clicking a docs link on the site. The docs are a
separate build (VitePress), so this takes a few layers, each optional and skipped on Save-Data or 2G:

- **Chrome and Edge prerender the docs home page** as soon as the home page has loaded,
  and any other docs page after a short hover or on touch (speculation rules in
  `src/lib/prefetch-docs.js`; the CSP allows them with `'inline-speculation-rules'`).
- **The docs offline cache** (`dist/sw.js`, generated by `scripts/perf/postbuild.mjs`) holds every
  docs page, script and the stylesheet of the current build. It installs once a
  page of the site is idle, so in every browser a docs page then opens from the device. In Chrome
  and Edge it serves straight from the cache without starting the worker (static routing); elsewhere
  the worker is woken when a docs link is hovered or touched. A new deploy installs a new cache; the
  previous one is kept for tabs still open on it.
- **Docs pages paint before their app starts**: each page carries the CSS it uses inline (beasties,
  in the postbuild step) with the full stylesheet at the end, the theme is set before the first
  paint by a small script (`docs/public/vp-theme.js`), and the Vue app starts one frame after it
  (`docs/public/vp-boot.js`).
- **The docs have a light and a dark theme**, with a switch in the top bar: light, dark, or the
  system's setting (the default). The home page is light only.
- **Leaving the home page stops the bridge animation** at the click, so the next page doesn't share
  the processor with it.

Check it with `npm run build && npm run test:speed` (Chromium, Firefox and WebKit; needs
`npx playwright install chromium firefox webkit` once). It serves `dist/` like Cloudflare with a
delay per request, clicks "Docs" in a fresh browser and reports the time to the docs' first paint,
next to the same click to an empty page. Run it on a real computer: on a small cloud VM even the
empty page takes 100-300 ms. After deploying, `npm run test:speed -- --url https://fastconfirm.it`
measures the live site. Automated Chromium never prerenders, so the Chromium line is the offline
cache path; real Chrome is faster.

## Notes

- The intro respects reduced-motion settings (one still frame), pauses when off screen or
  in a background tab, and keeps the bridge's width in view on phones.
- The site and the docs are set in the system's typeface. Only the bridge's road signs use a font
  file (Overpass, self-hosted, Latin subset), so the page makes no third-party requests.
- The Content-Security-Policy in `public/_headers` allows only this site's own scripts,
  styles, fonts and API. Loosen it there if a page needs an outside resource.

## License

MIT, as for the first fastconfirm.it.
