// The one place partner types and statuses are named. The "Using FCR" strip, Readiness,
// the bridge card and the data check all read these, so a partner is described the same
// way everywhere on the site.
// Keys are what data/integrations.json uses; values are what visitors read.
// "Chain" rather than "L2" or "Rollup" so it also fits chains like Gnosis that aren't rollups.
export const CATEGORIES = {
  l2: 'Chain', bridge: 'Bridge', messaging: 'Messaging', exchange: 'Exchange', wallet: 'Wallet',
  rpc: 'RPC service', client: 'Consensus client', issuer: 'Issuer', solver: 'Solver', app: 'App',
}
export const STATUSES = {
  live: 'Live on mainnet',
  testnet: 'Testing',
  building: 'Integrating',
}
// Live partners first, then testing, then integrating; alphabetical within each.
const STATUS_ORDER = Object.keys(STATUSES)
export const byStatus = (a, b) =>
  STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.name.localeCompare(b.name)
