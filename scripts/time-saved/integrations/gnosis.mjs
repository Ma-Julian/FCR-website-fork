// Gnosis Chain: the bridge validators switched the Ethereum side to FCR on 7 Oct 2026
// (gnosischain/bridge-validator PR #9, ETH_BLOCK_PROCESSING_MODE=fcr). Before, they only read
// Ethereum events up to the finalized block (`block-finality` mode). Both bridges they run count,
// Ethereum → Gnosis only (the Gnosis side still waits for Gnosis finality).
import { logs, blockAt } from '../lib/rpc.mjs'

const ETH_RPC = process.env.ETH_RPC || 'https://rpc.mevblocker.io' // serves old logs without a key
const GNO_RPC = process.env.GNO_RPC || 'https://rpc.gnosischain.com'

// Ethereum-side request → Gnosis-side completion, matched by `match`; `key` identifies a transfer.
async function bridge({ eth, gno, match, key, ok = () => true }, { from, to }) {
  const e = await blockAt(ETH_RPC, from, 12)
  const eTo = to ? (await blockAt(ETH_RPC, to, 12)).block : e.head
  const g = await blockAt(GNO_RPC, from - 3600, 5)
  const sent = await logs(ETH_RPC, { address: eth.address, topics: [eth.topic] }, e.block, eTo, 50_000)
  const done = await logs(GNO_RPC, { address: gno.address, topics: [gno.topic] }, g.block, g.head, 100_000)
  const ts = (l) => {
    if (!l.blockTimestamp) throw new Error('the RPC returned logs without blockTimestamp')
    return parseInt(l.blockTimestamp, 16)
  }
  const byMatch = new Map(done.map((l) => [match.gno(l), l]))
  const transfers = []
  let pending = 0
  for (const l of sent) {
    const d = byMatch.get(match.eth(l))
    if (!d) { pending++; continue }
    if (!ok(d)) continue // executed but failed on Gnosis: not a completed transfer
    transfers.push({ key: key(l), start: ts(l), end: ts(d), sourceTx: l.transactionHash, destinationTx: d.transactionHash })
  }
  return { transfers, pending }
}

export default {
  id: 'gnosis', // same id as in data/integrations.json
  name: 'Gnosis Chain',
  // Last slow transfer started 15:37 UTC (793 s), first fast one 16:41 UTC (27 s); none in between.
  fcrSince: '2026-10-07T16:00:00Z',
  routes: [
    {
      id: 'amb',
      name: 'Arbitrary Message Bridge (Omnibridge and other apps)',
      baseline: { kind: 'finality' },
      contracts: { ethereum: '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e', gnosis: '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59' },
      // UserRequestForAffirmation(bytes32 indexed messageId, bytes) → AffirmationCompleted(sender, executor, bytes32 indexed messageId, bool status)
      fetch: (w) => bridge({
        eth: { address: '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e', topic: '0x482515ce3d9494a37ce83f18b72b363449458435fafdd7a53ddea7460fe01b58' },
        gno: { address: '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59', topic: '0xe194ef610f9150a2db4110b3db5116fd623175dca3528d7ae7046a1042f84fe7' },
        match: { eth: (l) => l.topics[1], gno: (l) => l.topics[3] },
        key: (l) => l.topics[1],
        ok: (l) => BigInt(l.data) === 1n,
      }, w),
    },
    {
      id: 'xdai',
      name: 'xDAI bridge',
      baseline: { kind: 'finality' },
      contracts: { ethereum: '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016', gnosis: '0x7301CFA0e1756B71869E93d4e4Dca5c7d0eb0AA6' },
      // UserRequestForAffirmation(address recipient, uint256 value, bytes32 nonce) → AffirmationCompleted(same fields)
      fetch: (w) => bridge({
        eth: { address: '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016', topic: '0xf6968e689b3d8c24f22c10c2a3256bb5ca483a474e11bac08423baa049e38ae8' },
        gno: { address: '0x7301CFA0e1756B71869E93d4e4Dca5c7d0eb0AA6', topic: '0x6fc115a803b8703117d9a3956c5a15401cb42401f91630f015eb6b043fa76253' },
        match: { eth: (l) => l.data, gno: (l) => l.data },
        key: (l) => '0x' + l.data.slice(-64),
      }, w),
    },
  ],
}
