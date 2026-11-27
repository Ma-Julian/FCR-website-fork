// OP Stack deposits from Ethereum, for any chain with an OptimismPortal (Base, OP Mainnet, …).
// A deposit is a TransactionDeposited log on the portal. Its L2 transaction hash follows from the
// log alone (OP Stack deposit spec: source hash from the L1 block hash and log index, then the
// 0x7E deposit transaction), so arrival is one receipt lookup per deposit, no scanning of L2 blocks.
import { keccak_256 } from '@noble/hashes/sha3'
import { logs, blockAt, call } from './rpc.mjs'

// TransactionDeposited(address indexed from, address indexed to, uint256 indexed version, bytes opaqueData)
const DEPOSITED = '0xb3813568d9991fc951961fcb4c784893574240a28925604d09fc577c55bb7c32'

const bytes = (h) => Uint8Array.from(Buffer.from(h.replace(/^0x/, ''), 'hex'))
const hex = (b) => '0x' + Buffer.from(b).toString('hex')
const cat = (...a) => { const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length } return o }
const word = (n) => bytes(BigInt(n).toString(16).padStart(64, '0'))

// Minimal RLP: byte strings and lists.
const rlpLen = (len, offset) => {
  if (len < 56) return Uint8Array.of(offset + len)
  const l = bytes(len.toString(16).padStart(len.toString(16).length + (len.toString(16).length % 2), '0'))
  return cat(Uint8Array.of(offset + 55 + l.length), l)
}
const rlp = (x) => {
  if (Array.isArray(x)) { const body = cat(...x.map(rlp)); return cat(rlpLen(body.length, 0xc0), body) }
  if (x.length === 1 && x[0] < 0x80) return x
  return cat(rlpLen(x.length, 0x80), x)
}
const uint = (b) => { let i = 0; while (i < b.length && b[i] === 0) i++; return b.slice(i) } // minimal big-endian

// The L2 hash of the deposit transaction that a TransactionDeposited log creates.
export function depositTxHash(log) {
  const from = bytes(log.topics[1]).slice(12)
  const to = bytes(log.topics[2]).slice(12)
  if (BigInt(log.topics[3]) !== 0n) throw new Error(`unknown deposit version ${log.topics[3]}`)
  const d = bytes(log.data)
  const len = Number(BigInt(hex(d.slice(32, 64))))
  const opaque = d.slice(64, 64 + len) // mint(32) value(32) gas(8) isCreation(1) data
  const mint = opaque.slice(0, 32), value = opaque.slice(32, 64), gas = opaque.slice(64, 72)
  const isCreation = opaque[72] === 1
  const data = opaque.slice(73)
  const userSource = keccak_256(cat(bytes(log.blockHash), word(BigInt(log.logIndex))))
  const sourceHash = keccak_256(cat(word(0), userSource)) // domain 0: user deposit
  const tx = rlp([sourceHash, from, isCreation ? new Uint8Array() : to, uint(mint), uint(value), uint(gas), new Uint8Array(), data])
  return hex(keccak_256(cat(Uint8Array.of(0x7e), tx)))
}

// Batched calls, throttled: public L2 RPCs count each batch item against a per-second limit
// (mainnet.base.org: 25/s). Set L2_RPS higher for a private endpoint.
const RPS = Number(process.env.L2_RPS || 20)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// Answers are matched by id, and any item the RPC dropped or answered without a `result` is asked
// again (a missing answer must not read as "not on L2 yet"). `null` is a real answer: no receipt.
async function batch(url, method, paramsList, { nullIsAnswer = true } = {}) {
  const out = new Array(paramsList.length)
  let todo = paramsList.map((_, i) => i)
  for (let attempt = 0; todo.length; attempt++) {
    if (attempt > 5) throw new Error(`${method}: ${todo.length} items still unanswered after retries`)
    const missing = []
    for (let i = 0; i < todo.length; i += RPS) {
      const t0 = Date.now()
      const ids = todo.slice(i, i + RPS)
      const res = [await call(url, ids.map((id) => ({ jsonrpc: '2.0', id, method, params: paramsList[id] })))].flat()
      const byId = new Map(res.filter((r) => r && 'result' in r).map((r) => [r.id, r.result]))
      for (const id of ids) {
        const r = byId.get(id)
        if (r === undefined || (r === null && !nullIsAnswer)) missing.push(id)
        else out[id] = r
      }
      await sleep(Math.max(0, 1100 - (Date.now() - t0)))
    }
    todo = missing
    if (todo.length) await sleep(3000)
  }
  return out
}

// Completed deposits that started at or after `from`: { transfers, pending }.
export async function opstackDeposits({ ethRpc, l2Rpc, portal, from }) {
  const e = await blockAt(ethRpc, from, 12)
  const sent = await logs(ethRpc, { address: portal, topics: [DEPOSITED] }, e.block, e.head, 10_000)
  if (sent.some((l) => !l.blockTimestamp)) throw new Error('the Ethereum RPC returned logs without blockTimestamp')
  const fresh = sent.map((l) => ({ l, hash: depositTxHash(l) }))
  return lookup(l2Rpc, fresh)
}

async function lookup(l2Rpc, fresh) {
  const sent = fresh.map((x) => x.l)
  const hashes = fresh.map((x) => x.hash)
  const receipts = await batch(l2Rpc, 'eth_getTransactionReceipt', hashes.map((h) => [h]))
  const blocks = [...new Set(receipts.filter(Boolean).map((r) => r.blockNumber))]
  const heads = await batch(l2Rpc, 'eth_getBlockByNumber', blocks.map((b) => [b, false]), { nullIsAnswer: false })
  const time = new Map(heads.map((h) => [h.number, parseInt(h.timestamp, 16)]))
  const transfers = []
  let pending = 0
  sent.forEach((l, i) => {
    const r = receipts[i]
    if (!r) { pending++; return } // not on L2 yet (or a hash we got wrong: shows up as pending)
    transfers.push({
      key: hashes[i], // the L2 deposit hash identifies the deposit on both sides
      start: parseInt(l.blockTimestamp, 16),
      end: time.get(r.blockNumber),
      sourceTx: l.transactionHash,
      destinationTx: hashes[i],
    })
  })
  return { transfers, pending }
}
