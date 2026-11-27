// What FCR changes for each kind of reader. Pure functions: given a role, a name and
// today's wait, return the copy and numbers. Tiles only show figures we can compute or
// cite; add new tiles here once their data is in data/.
import { site } from '@src/lib/data.js'

const { slotSeconds: SLOT, fcrMinimumSeconds: FCR, finalitySeconds: FINALITY, justifiedSeconds: JUSTIFIED } = site.timing

export function fmt(s) {
  const m = Math.floor(s / 60), r = Math.round(s % 60)
  if (m === 0) return `${r} s`
  return r === 0 ? `${m} min` : `${m} min ${r} s`
}

/**
 * @param {string} role   role id from data/roles.json
 * @param {string} e      the chain, protocol, service, asset or venue
 * @param {number|'fin'|'just'|null} k  blocks waited today, 'fin' for finality, 'just' for the
 *   justified (safe) checkpoint, null if unknown
 * @param {boolean} sourced  whether k comes from data/waits.json (counted in slots)
 * @param {boolean} based    a based rollup: k is the typical wait for the next Ethereum anchor
 */
export function result(role, e, k, sourced, based = false) {
  const fin = k === 'fin', just = k === 'just', tag = fin || just
  let today = fin ? FINALITY : just ? JUSTIFIED : k ? k * SLOT : null
  const known = today !== null
  const tagVal = `~${Math.round(today / 60)} min`
  const tVal = tag ? tagVal : known ? fmt(today) : null
  const saved = known ? fmt(today - FCR) : null
  const unit = sourced ? 'slots' : 'blocks'
  const wait = fin ? 'finality' : just ? 'justification' : based ? `the next Ethereum anchor, about ${k} slots` : k ? `${k} ${unit}` : 'a fixed number of blocks'
  const how = fin ? 'Waits for finality' : just ? 'Waits for justification' : based ? `Based rollup, about ${k} slots` : k ? `Waits ${k} ${unit}` : 'Waits a fixed number of blocks'
  const calc = tag ? `${tagVal}, minus ${FCR} s.` : k ? `${based ? 'About ' : ''}${k} × ${SLOT} s, minus ${FCR} s.` : ''
  let rely = fin
    ? 'Finality: safe, but about 13 minutes after the deposit.'
    : just
      ? `Justification: two thirds of stake has attested, but about ${Math.round(JUSTIFIED / 60)} minutes after the deposit.`
      : `That no reorg goes deeper than ${k ? `${k} blocks` : 'the blocks it counts'}. Nothing checks it.`
  const savedTile = (label) => (saved ? [{ value: saved, label, note: calc }] : [])
  const waitPhrase = known ? `${sourced && !based ? 'at least' : 'about'} ${tVal}` : 'for a fixed number of blocks'

  let r
  switch (role) {
    case 'rollup':
      r = {
        headline: `${e} credits Ethereum deposits after ${wait}. FCR credits them in as little as ${FCR} seconds, and counts attestations instead of blocks.`,
        todayName: `${e} today`, todayHow: how, tiles: savedTile('sooner for every deposit'),
        cta: { label: 'Read the rollups guide', href: 'guide', path: 'integrate/rollups' },
      }
      break
    case 'bridge':
      r = {
        headline: `${e} relays messages from Ethereum after ${wait}. With FCR it can relay them in as little as ${FCR} seconds.`,
        todayName: `${e} today`, todayHow: how, tiles: savedTile('sooner for every message'),
        cta: { label: 'Read the bridge guide', href: 'guide', path: 'integrate/bridges' },
      }
      break
    case 'rpc':
      // RPC providers sell to chains and bridges: the card is about what their customers get,
      // who already wants it, and how little it takes to turn on. Today `safe` is the justified block.
      today = JUSTIFIED
      rely = 'The justified block under safe, or a ~13 minute wait for finality.'
      r = {
        todayName: 'safe today', todayHow: 'safe returns the justified block', fcrHow: 'safe returns the fast-confirmed block',
        tiles: [],
        demand: {
          lede: `Chains and bridges are moving to FCR.`,
          rest: `Each one needs an Ethereum node with FCR on. Most would rather not run their own, so they need a provider that serves it.`,
          more: 'More chains and bridges are integrating. We point every one of them to the providers listed in our docs.',
        },
        enable: {
          lede: `Nothing to build. ${e} turns it on in the nodes it already runs.`,
          steps: [
            { title: 'Turn on FCR in your consensus client', body: 'One flag and a restart. Nimbus already has it on.', clients: true },
            { title: 'Choose who gets it', body: 'Serve it on dedicated nodes for customers who opt in, so safe on your shared endpoints stays the justified block.' },
            { title: 'Get listed', body: 'Tell us and we add you to the docs that chains and bridges read when they integrate.' },
          ],
          note: 'Same safe tag, same methods: customers change nothing but the endpoint they call.',
        },
        cta: { label: 'Read the RPC provider guide', href: 'guide', path: 'integrate/rpc-providers' },
      }
      return { ...r, headline: headlineFor(e, role), today, todayValue: `~${Math.round(JUSTIFIED / 60)} min`, relyToday: rely }
    case 'issuer':
      r = {
        headline: `You wait ${wait} before minting ${e} on other chains. With FCR you can mint as little as ${FCR} seconds after the lock or burn on Ethereum.`,
        todayName: 'Your mints today', todayHow: how, tiles: savedTile('sooner for every cross-chain mint'),
        cta: { label: 'Learn more', href: 'guide', path: 'integrate/bridges' },
      }
      break
    case 'solver':
      r = {
        headline: `On ${e} you fill users right away and carry the reorg risk until their Ethereum deposit is safe. FCR shrinks that window to as little as ${FCR} seconds.`,
        todayName: 'Your risk window', todayHow: how,
        tiles: known ? [{ value: `${Math.round(today / FCR)}×`, label: 'more turns of the same capital per day', note: `Risk window today ÷ ${FCR} s.` }] : [],
        cta: { label: 'Talk to the FCR team', href: 'contact' },
      }
      break
    case 'app':
      r = {
        headline: `Your users bridge in to ${e}, then wait ${waitPhrase}. With FCR their funds can reach your app in as little as ${FCR} seconds, before they drift off.`,
        todayName: `Deposit to ${e}`, todayHow: how, tiles: savedTile('sooner in your app, per deposit'),
        cta: { label: `Tell us you want FCR on ${e}`, href: 'contact' },
      }
      break
    default:
      r = {
        headline: `A deposit from Ethereum to ${e} takes ${known ? waitPhrase : 'a fixed number of blocks'} today. With FCR it can land in as little as ${FCR} seconds.`,
        todayName: `${e} today`, todayHow: how,
        tiles: [...savedTile('less waiting on every deposit'), { value: 'Same', label: 'Ethereum validators. No new committee or multisig.', note: 'FCR counts their attestations.' }],
        cta: { label: `Tell us you want FCR on ${e}`, href: 'contact' },
      }
  }
  return { ...r, headline: headlineFor(e, role), today, todayValue: tVal, relyToday: rely }
}

// What an issuer can do, by how they issue: "Ethereum" alone, "Ethereum and Chainlink", or
// "Ethereum and <another mint-and-burn provider>" (also anything a reader types in).
// Steps may use `backticks` for code. Chainlink's flag: docs.chain.link/ccip/concepts/execution-latency/ftf-token-issuers
export const CCIP_FTF_DOCS = 'https://docs.chain.link/ccip/concepts/execution-latency/ftf-token-issuers'
export function issuerPlan(e) {
  const name = String(e || '').trim()
  if (/^ethereum$/i.test(name)) {
    return {
      kind: 'ethereum',
      lede: 'Your asset lives on Ethereum, so there is nothing to change on your side. FCR helps it spread to L2s.',
      steps: [
        'Ask the L2s and apps you work with to turn on FCR for deposits from Ethereum. Holders can then move your asset to an L2 in seconds instead of minutes.',
      ],
    }
  }
  const provider = name.replace(/^ethereum\s+(and|\+|&)\s+/i, '') || name
  if (/chainlink|ccip/i.test(provider)) {
    // Three cards side by side, as little text as possible (Julian, 17 Nov 2026). The exact calls
    // (rate limit with `fastFinality: true`, fee in `fastFinalityTransferFeeBps`) are in Chainlink's guide.
    return {
      kind: 'chainlink',
      provider: 'Chainlink CCIP',
      lede: 'All on your own token pool. L2s don’t change anything.',
      cards: [
        { title: 'Use a V2 token pool', body: 'V1 pools can’t opt in.' },
        { title: 'Allow the safe flag', body: '`setAllowedFinalityConfig` with `WAIT_FOR_SAFE_FLAG`' },
        { title: 'Cap and price it', body: 'A separate rate limit and fee for fast transfers.', tag: 'Optional' },
      ],
      note: 'On testnet for now: Chainlink still has to enable the safe flag on mainnet lanes.',
      docs: { label: 'Chainlink’s guide for token issuers', href: CCIP_FTF_DOCS },
    }
  }
  return {
    kind: 'provider',
    provider,
    lede: `${provider} mints your asset on the other chain itself, so the L2s don’t need to change anything.`,
    steps: [`Ask your contact at ${provider} to support FCR for transfers out of Ethereum.`],
  }
}

// What an app builder can do. The chain, not the app, decides when deposits from Ethereum
// land, so the one thing that matters is asking the chain to turn FCR on. Intent bridges
// carry the reorg risk until a deposit is safe, so FCR should make them cheaper and faster too.
export function appPlan(e, { live = null, todayValue = null } = {}) {
  const intent = 'Expect intent bridges to get cheaper and faster. Bridges such as Across and Relay give users their funds right away and carry the risk until the Ethereum deposit is safe; FCR shortens that risk. If you integrate one, ask whether it uses FCR.'
  if (live) {
    return {
      kind: 'app',
      lede: `${e} already credits deposits from Ethereum with FCR, so your users’ funds can land in as little as ${live.now}. Nothing to change in your app.`,
      steps: [intent],
    }
  }
  return {
    kind: 'app',
    lede: `Your app doesn’t change. ${e} decides when deposits from Ethereum land, so the step that matters is asking ${e} to turn on FCR.`,
    steps: [
      `Ask the ${e} team to turn on FCR for deposits from Ethereum. Your users’ funds then land in as little as ${FCR} seconds${todayValue ? ` instead of today’s ${todayValue}` : ''}.`,
      intent,
    ],
  }
}

// Bridges and messaging: how long each waits on Ethereum today (data/bridges.json), and the one
// setting that moves it to FCR. `actor` is who reads Ethereum: relayers, DVNs, guardians, validators.
export function bridgePlan(e, b) {
  const name = b ? b.name : e
  const actor = b?.actor || 'your relayers'
  // A bridge whose operator reads Ethereum for its users (CCIP) lists its own steps instead.
  const steps = b?.steps || [
    { title: `Run an Ethereum node with FCR behind ${actor}`, body: 'One flag in Lighthouse, Prysm or Lodestar; on by default in Nimbus. Or use an RPC provider that serves FCR: elsewhere, `safe` is still the justified block, about 9 minutes back.' },
    { title: b?.switchTitle || 'Relay at `safe` instead of a block count', body: b?.switch || 'Process Ethereum events in blocks at or below the `safe` block, instead of head minus a fixed count or `finalized`.' },
    { title: 'Check at finality, cap the value', body: 'When a fast-confirmed block finalizes, compare its hash with the one you relayed and alert on a mismatch. Keep finality for transfers above a size you choose.' },
  ]
  return {
    kind: 'bridge', name, steps,
    lede: b?.lede || `Nothing to redeploy: ${name} changes which Ethereum block ${actor} read.`,
    note: b?.note || '',
    source: b,
  }
}

// One headline for every role; the sections below the headline carry the role-specific detail.
// Issuers name their setup ("Ethereum and LayerZero"), not a product, so their headline is about the asset.
export const headlineFor = (e, role) => (role === 'issuer' ? 'How FCR could help your asset' : role === 'app' ? `How FCR could help your app on ${e}` : `How FCR could help ${e}`)

// "7×": whole numbers below 100 keep one decimal when it matters (2.5×), larger ones round.
export function speedup(todaySeconds, fcrSeconds = FCR) {
  const x = todaySeconds / fcrSeconds
  if (!(x > 1)) return null
  const r = x >= 10 ? Math.round(x) : Math.round(x * 10) / 10
  return `${r}×`
}

// Solvers: what decides their business is (1) filling before other solvers, (2) the reorg risk
// they carry until the user's Ethereum deposit is safe, and (3) whether the chains and bridges
// they repay and rebalance through use FCR. Waits per venue: data/venues.json.
// Reorg figures: ethresear.ch "Post-Pectra effects on Ethereum: reorg rate" (903 reorged of
// 805,546 slots after Pectra, May–Aug 2025 ≈ 8 a day; depth not reported) and the 7-block
// reorg of 25 May 2022 during proposer boost's partial rollout.
export const REORG_RATE_URL = 'https://ethresear.ch/t/post-pectra-effects-on-ethereum-reorg-rate-propagation-and-block-size/23018'
const usd = (n) => (n >= 1000 ? `$${n / 1000}k` : `$${n}`)

/**
 * @param {string} e     the venue as the reader named it
 * @param {object|null} v  its row in data/venues.json
 * @param {number|'fin'|null} k  blocks the reader waits (from the chips) when the venue doesn't publish one
 */
export function solverPlan(e, v, k) {
  const name = v ? v.name : e
  if (v?.kind === 'single-chain') {
    return {
      kind: 'single-chain',
      lede: `${name} orders settle on one chain, so you don’t front funds against a deposit on Ethereum and carry no reorg window.`,
      steps: [
        v.handoff || 'Nothing to change for these fills.',
        'FCR matters when you fill cross-chain orders against a deposit on Ethereum, as on Across, deBridge or 1inch Fusion+.',
      ],
      source: v,
    }
  }
  // The wait to beat: for tiered venues, the one for the largest orders, where most of the value is.
  const top = v?.tiers ? v.tiers[v.tiers.length - 1] : null
  const blocks = top ? top.blocks : v?.blocks ?? (typeof k === 'number' ? k : null)
  const seconds = v?.seconds ?? (blocks ? blocks * SLOT : k === 'fin' ? FINALITY : null)
  const settlement = v?.kind === 'settlement'
  const known = seconds !== null
  const what = settlement ? 'before settlement starts' : top ? 'before filling an order over $10k' : 'before you fill'
  const how = v?.seconds ? `Waits a fixed ${v.seconds} s` : blocks ? `Counts ${blocks} blocks` : k === 'fin' ? 'Waits for finality' : 'Counts a fixed number of blocks'
  const ref = v?.tiers || v?.blocks || v?.seconds ? (settlement ? `${name}’s messaging layer` : `${name}’s reference ${name === 'deBridge' ? 'taker' : name === 'Across' ? 'relayer' : 'resolvers'}`) : 'you'

  // Speed: who fills first wins.
  let race
  if (settlement && !known) race = `${name} settles in batches over its own Hyperlane deployment and doesn’t publish how long it waits on Ethereum. With FCR, settlement and your rebalancing could start after as little as ${FCR} seconds.`
  else if (settlement) race = `${name} settles over Hyperlane, which waits ${blocks} blocks (${fmt(seconds)}) on Ethereum. With FCR, settlement and your rebalancing could start after as little as ${FCR} seconds.`
  else if (v?.seconds && v.seconds <= FCR) race = `${name} already releases Ethereum escrows after a fixed ${v.seconds} seconds. FCR keeps that speed and adds a check: it counts validators’ votes instead of seconds.`
  else if (known) race = `${v?.win ? `${v.win} ` : ''}${ref === 'you' ? 'You wait' : `${ref.charAt(0).toUpperCase()}${ref.slice(1)} waits`} ${fmt(seconds)} ${top ? 'before filling an order over $10k' : 'before filling'}. With FCR you could fill after as little as ${FCR} seconds, at any size.`
  else race = `${v?.win ? `${v.win} ` : ''}${name} doesn’t publish how long fillers wait on Ethereum. Pick yours above to compare.`

  const tiers = v?.tiers ? v.tiers.map((t, i) => ({
    label: t.upToUsd === null ? `Fills over ${usd(v.tiers[i - 1].upToUsd)}` : `Fills up to ${usd(t.upToUsd)}`,
    today: `${t.blocks} blocks · ${fmt(t.blocks * SLOT)}`,
  })) : null

  // Reorg risk: what a block count bets on, against what FCR checks.
  const risk = [
    { label: 'what it checks', today: v?.seconds ? 'Only that time has passed' : 'Only that blocks have passed', fcr: ['That validators keep the block in the chain', 'Over 95% of one slot’s votes, at 24 s'] },
    { label: 'what breaks it', today: ['A reorg deeper than the count', 'Mainnet had a 7-block reorg in May 2022'], fcr: ['Over a quarter of stake attacking while votes arrive late', 'Network trouble makes it wait, not fail'] },
    { label: 'track record', today: ['About 8 blocks a day reorged on mainnet', 'In 2025, after Pectra'], fcr: ['No false confirmations', 'in 2.56M mainnet slots replayed'] },
  ]

  // What to do: their own node, a safe check instead of a count, and a plan for the rare step back.
  const steps = [
    'Run your own Ethereum node with FCR on (a flag in Lighthouse, Prysm or Lodestar; on by default in Nimbus), or use an RPC provider that serves it. Elsewhere, `safe` is still the justified block, about 9 minutes back.',
    `Fill once the deposit’s block is at or below \`safe\`, instead of counting blocks.${v?.config ? ` On ${name} that check replaces the counts in \`${v.config}\`.` : ''} To start, keep a size cap, or require FCR and a small block count.`,
    'Plan for the rare step back: if `safe` falls back to finalized, pause large fills until it moves again.',
  ]

  return {
    kind: settlement ? 'settlement' : 'fill', name, known, seconds, blocks, what, how, race, tiers, risk, steps,
    repaid: v?.repaid || null, source: v,
    usesLede: 'FCR speeds up your capital too: the sooner a chain or bridge credits deposits from Ethereum, the sooner you are repaid and can rebalance.',
    venueLine: settlement ? `${name} (via Hyperlane)` : name,
  }
}
