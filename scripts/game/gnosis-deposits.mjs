// Refreshes data/gnosis-deposits.json: real ETH deposits from Ethereum to Gnosis Chain through
// the Omnibridge since the bridge switched to FCR, with how long each took to arrive. They are
// the cargo in the F+C+R game ("a real fast-confirmed deposit").
//   node scripts/game/gnosis-deposits.mjs
// FCR_SINCE: the Gnosis bridge validators switched the Ethereum side to FCR on 7 Oct 2026. The
// last deposit before took 793 s (15:37 UTC), the first after 39 s (18:09 UTC); see the project
// note data-gnosis-eth-deposits. Only deposits from this moment on are kept.
// Ethereum side: TokensBridgingInitiated(token = WETH) on the Omnibridge foreign mediator.
// Gnosis side: TokensBridged with the same messageId on the home mediator. The bridge time is
// the Gnosis block's timestamp minus the Ethereum block's.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ETH_RPC = process.env.ETH_RPC || 'https://rpc.mevblocker.io'
const GNO_RPC = process.env.GNO_RPC || 'https://rpc.gnosischain.com'
const ETH_MEDIATOR = '0x88ad09518695c6c3712AC10a214bE5109a655671'
const GNO_MEDIATOR = '0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d'
const INITIATED = '0x59a9a8027b9c87b961e254899821c9a276b5efc35d1f7409ea4f291470f1629a' // TokensBridgingInitiated(address,address,uint256,bytes32)
const BRIDGED = '0x9afd47907e25028cdaca89d193518c302bbb128617d5a992c5abd45815526593' // TokensBridged(address,address,uint256,bytes32)
const WETH = '0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const FCR_SINCE = '2026-10-07T18:00:00Z'
const SINCE_S = Date.parse(FCR_SINCE) / 1000
const MIN_ETH = 0.01

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let id = 0
async function call(url, body) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      const errs = [j].flat().filter((x) => x.error)
      if (errs.length) throw new Error(errs[0].error.message)
      return j
    } catch (e) {
      if (i >= 5) throw e
      await sleep(3000)
    }
  }
}
const rpc = async (url, method, params) => (await call(url, { jsonrpc: '2.0', id: ++id, method, params })).result
const hex = (n) => '0x' + n.toString(16)

async function logs(url, filter, from, to, chunk) {
  const out = []
  for (let a = from; a <= to; a += chunk) {
    const b = Math.min(to, a + chunk - 1)
    try {
      out.push(...(await rpc(url, 'eth_getLogs', [{ ...filter, fromBlock: hex(a), toBlock: hex(b) }])))
    } catch (e) {
      if (chunk <= 2000) throw e
      out.push(...(await logs(url, filter, a, b, Math.floor(chunk / 5))))
    }
  }
  return out
}

// Block timestamps in batches of 40.
async function timestamps(url, blocks) {
  const map = new Map()
  const list = [...new Set(blocks)]
  for (let i = 0; i < list.length; i += 40) {
    const batch = list.slice(i, i + 40).map((n) => ({ jsonrpc: '2.0', id: ++id, method: 'eth_getBlockByNumber', params: [hex(n), false] }))
    const res = await call(url, batch)
    for (const r of res) map.set(parseInt(r.result.number, 16), parseInt(r.result.timestamp, 16))
    await sleep(300)
  }
  return map
}

const ethHead = parseInt(await rpc(ETH_RPC, 'eth_blockNumber', []), 16)
const ethHeadTime = parseInt((await rpc(ETH_RPC, 'eth_getBlockByNumber', [hex(ethHead), false])).timestamp, 16)
const ethFrom = ethHead - Math.ceil((ethHeadTime - SINCE_S) / 12) - 300 // a margin of an hour; filtered by time below
const sent = await logs(ETH_RPC, { address: ETH_MEDIATOR, topics: [INITIATED, WETH] }, ethFrom, ethHead, 50_000)
console.log(`${sent.length} ETH deposits on Ethereum`)
const ethTimes = await timestamps(ETH_RPC, sent.map((l) => parseInt(l.blockNumber, 16)))

// Find the Gnosis block range that covers the same period (5 s blocks), with a day of slack.
const gnoHead = parseInt(await rpc(GNO_RPC, 'eth_blockNumber', []), 16)
const gnoHeadTime = parseInt((await rpc(GNO_RPC, 'eth_getBlockByNumber', [hex(gnoHead), false])).timestamp, 16)
const firstTime = Math.max(SINCE_S, Math.min(...ethTimes.values()))
const gnoFrom = Math.max(0, gnoHead - Math.ceil((gnoHeadTime - firstTime + 86400) / 5))
const arrived = await logs(GNO_RPC, { address: GNO_MEDIATOR, topics: [BRIDGED] }, gnoFrom, gnoHead, 100_000)
const byMessage = new Map(arrived.map((l) => [l.topics[3], l]))
const matched = sent.filter((l) => byMessage.has(l.topics[3]))
const gnoTimes = await timestamps(GNO_RPC, matched.map((l) => parseInt(byMessage.get(l.topics[3]).blockNumber, 16)))

const deposits = matched
  .map((l) => {
    const g = byMessage.get(l.topics[3])
    const t = ethTimes.get(parseInt(l.blockNumber, 16))
    return {
      tx: l.transactionHash,
      gnosisTx: g.transactionHash,
      time: new Date(t * 1000).toISOString().slice(0, 16) + 'Z',
      eth: Number(BigInt(l.data.slice(0, 66)) / 10n ** 12n) / 1e6,
      seconds: gnoTimes.get(parseInt(g.blockNumber, 16)) - t,
    }
  })
  .filter((d) => d.eth >= MIN_ETH && d.seconds > 0 && Date.parse(d.time) >= SINCE_S * 1000)
  .reverse()

writeFileSync(
  fileURLToPath(new URL('../../data/gnosis-deposits.json', import.meta.url)),
  JSON.stringify({
    source: `Omnibridge, Ethereum ${ETH_MEDIATOR} (TokensBridgingInitiated, WETH) matched to Gnosis ${GNO_MEDIATOR} (TokensBridged) by messageId`,
    fcrSince: FCR_SINCE,
    checkedOn: new Date().toISOString().slice(0, 10),
    deposits,
  }, null, 1) + '\n',
)
console.log(`${deposits.length} matched deposits written (${sent.length - matched.length} not found on Gnosis)`)
