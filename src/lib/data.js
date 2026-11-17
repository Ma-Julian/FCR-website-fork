// One import point for every data collection. Vite inlines the JSON at build time,
// so the site ships no database calls for curated data.
import site from '@data/site.json'
import projects from '@data/projects.json'
import lists from '@data/lists.json'
import roles from '@data/roles.json'
import waits from '@data/waits.json'
import measured from '@data/measured.json'
import stacks from '@data/stacks.json'
import ready from '@data/ready.json'
import integrations from '@data/integrations.json'
import timeSavedData from '@data/time-saved.json'
import venueData from '@data/venues.json'
import bridgeData from '@data/bridges.json'
import { byStatus } from '@src/lib/partners.js'

export { site, lists, roles }

export const activeProjects = projects.filter((p) => p.active)
export const destinations = activeProjects.filter((p) => p.type === 'l2')
export const bridgeRoutes = activeProjects.filter((p) => p.type === 'bridge').slice(0, 2)

const waitsByName = new Map(waits.map((w) => [w.name.toLowerCase(), w]))
export const sourcedWait = (name) => waitsByName.get(String(name || '').toLowerCase()) || null
// What result() takes as k: a slot count (also for based rollups), 'fin' for finality or
// 'just' for justification.
export const waitK = (w) => (w.wait === 'finalized' ? 'fin' : w.wait === 'justified' ? 'just' : w.slots)

// Partners shown in "Using FCR" under the hero: live first, then testing, then integrating.
// Draft partners only appear in local dev and preview builds (showDrafts in vite.config.js).
export const adopters = integrations
  .filter((g) => !g.draft || __SHOW_DRAFTS__)
  .sort(byStatus)

// Time FCR has saved (a lower bound, measured on-chain by scripts/time-saved/), summed over the
// integrations shown in "Using FCR", so a partner counts once its entry is published. null when
// nothing is measured yet.
const shown = new Set(adopters.map((g) => g.id))
const measuredIntegrations = timeSavedData.integrations.filter((i) => shown.has(i.id) && i.transfers > 0)
export const timeSaved = measuredIntegrations.length ? {
  savedSeconds: measuredIntegrations.reduce((s, i) => s + i.savedSeconds, 0),
  transfers: measuredIntegrations.reduce((s, i) => s + i.transfers, 0),
  since: measuredIntegrations.map((i) => i.firstFcrDate).sort()[0], // first day with FCR transfers
  // The oldest "measured until", so the date never claims more than every integration covers.
  asOf: measuredIntegrations.map((i) => i.measuredUntil).sort()[0],
  // The old rules the floors come from ("finality", "blocks", …), so the copy can name them.
  baselines: [...new Set(measuredIntegrations.flatMap((i) => i.routes.map((r) => r.baseline.kind)))],
  integrations: measuredIntegrations.map(({ id, name, savedSeconds, transfers }) => ({ id, name, savedSeconds, transfers })),
} : null

const measuredByName = new Map(measured.map((m) => [m.name.toLowerCase(), m]))
export const measuredFor = (name) => measuredByName.get(String(name || '').toLowerCase()) || null

// The stack a chain is built on (data/stacks.json), for the card's link to its docs guide.
const stackByChain = new Map(stacks.flatMap((st) => st.chains.map((c) => [c.toLowerCase(), st])))
export { ready, waits }
export const stackFor = (name) => stackByChain.get(String(name || '').toLowerCase()) || null

// How fillers on a venue wait for an Ethereum deposit today (data/venues.json).
const venueByName = new Map(venueData.venues.map((v) => [v.name.toLowerCase(), v]))
export const venueFor = (name) => venueByName.get(String(name || '').toLowerCase()) || null
// How each bridge waits on Ethereum today, and the setting that moves it to FCR (data/bridges.json).
const bridgeByName = new Map(bridgeData.bridges.map((b) => [b.name.toLowerCase(), b]))
export const bridgeFor = (name) => bridgeByName.get(String(name || '').toLowerCase()) || null
export const bridgesCheckedOn = bridgeData.checkedOn
