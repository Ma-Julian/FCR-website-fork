// Small JSON-RPC helpers shared by the time-saved scripts: retries, log fetching in chunks
// (split smaller when a provider refuses a range) and block timestamps in batches.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let id = 0

export async function call(url, body) {
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
export const rpc = async (url, method, params) => (await call(url, { jsonrpc: '2.0', id: ++id, method, params })).result
export const hex = (n) => '0x' + n.toString(16)

export async function logs(url, filter, from, to, chunk) {
  const out = []
  for (let a = from; a <= to; a += chunk) {
    const b = Math.min(to, a + chunk - 1)
    try {
      out.push(...(await rpc(url, 'eth_getLogs', [{ ...filter, fromBlock: hex(a), toBlock: hex(b) }])))
    } catch (e) {
      if (chunk <= 1000) throw e
      out.push(...(await logs(url, filter, a, b, Math.floor(chunk / 5))))
    }
  }
  return out
}

export async function timestamps(url, blocks) {
  const map = new Map()
  const list = [...new Set(blocks)]
  for (let i = 0; i < list.length; i += 40) {
    const batch = list.slice(i, i + 40).map((n) => ({ jsonrpc: '2.0', id: ++id, method: 'eth_getBlockByNumber', params: [hex(n), false] }))
    const res = await call(url, batch)
    for (const r of res) map.set(parseInt(r.result.number, 16), parseInt(r.result.timestamp, 16))
    await sleep(200)
  }
  return map
}

// The first block at or after a timestamp: estimate from the block time, then binary search
// (starting near the estimate, as public nodes have pruned old blocks).
export async function blockAt(url, t, blockSeconds) {
  const ts = async (n) => parseInt((await rpc(url, 'eth_getBlockByNumber', [hex(n), false])).timestamp, 16)
  const head = parseInt(await rpc(url, 'eth_blockNumber', []), 16)
  const guess = head - Math.ceil((await ts(head) - t) / blockSeconds)
  let lo = Math.max(0, guess - 20000), hi = Math.min(head, guess + 20000)
  while (lo > 0 && (await ts(lo)) > t) lo = Math.max(0, lo - 100000)
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if ((await ts(mid)) < t) lo = mid + 1
    else hi = mid
  }
  return { block: lo, head }
}
