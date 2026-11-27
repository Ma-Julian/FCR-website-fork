// Base: deposits from Ethereum through the OptimismPortal. Base does NOT use FCR yet
// (fcrSince: null), so nothing is counted; this keeps a 30-day check of its current rule ready
// for the day it switches, and exercises the pipeline at Base's volume (~500 deposits a day).
// When Base switches: set fcrSince, add Base to data/integrations.json.
import { opstackDeposits } from '../lib/opstack.mjs'

const ETH_RPC = process.env.ETH_RPC || 'https://rpc.mevblocker.io'
const BASE_RPC = process.env.BASE_RPC || 'https://mainnet.base.org'
const PORTAL = '0x49048044D57e1C92A77f79988d21Fa8fAF74E97e'

export default {
  id: 'base',
  name: 'Base',
  fcrSince: null,
  routes: [
    {
      id: 'deposits',
      name: 'Deposits through the OptimismPortal',
      // The sequencer only adopts an Ethereum block as L1 origin once 14 blocks sit on top of it
      // (sequencer l1-confs; data/waits.json). A deposit can't land on Base before that.
      baseline: { kind: 'blocks', blocks: 14 },
      contracts: { ethereum: PORTAL },
      fetch: ({ from }) => opstackDeposits({ ethRpc: ETH_RPC, l2Rpc: BASE_RPC, portal: PORTAL, from }),
    },
  ],
}
