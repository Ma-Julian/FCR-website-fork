"""Measure how many L1 blocks an OP Stack sequencer waits before including Ethereum deposits.

For each L2 block in a few windows over the last 30 days, read the L1Block predeploy
(number() and sequenceNumber()) to get the block's L1 origin. At each epoch start (sequence
number 0) the L2 block includes the deposits made in L1 origin block N. We report:
  - delay_s: L2 block time - L1 block N time
  - confs_on_top: L1 blocks on top of N at that moment (the value used in data/waits.json,
    taken as the mode)
OP Stack L2 timestamps are deterministic, so L2 block times are computed, not fetched.

usage: B=4 S=1.5 python3 op-stack-l1-lag.py NAME L2_RPC [windows] [blocks_per_window]
  B = L2 blocks per batch request, S = seconds to sleep between batches (for rate limits)
"""
import json, sys, statistics, urllib.request, time, os

L1 = "https://ethereum-rpc.publicnode.com"
L1BLOCK = "0x4200000000000000000000000000000000000015"


def rpc(url, batch):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, data=json.dumps(batch).encode(),
                                         headers={"content-type": "application/json", "user-agent": "curl/8"})
            out = json.load(urllib.request.urlopen(req, timeout=60))
            if isinstance(out, dict):
                raise RuntimeError(out)
            out.sort(key=lambda r: r["id"])
            if any("result" not in r for r in out):
                raise RuntimeError([r for r in out if "result" not in r][:1])
            return [r["result"] for r in out]
        except Exception as e:  # noqa
            err = e
            time.sleep(5 + 5 * attempt)
    raise err


def one(url, method, params):
    return rpc(url, [{"jsonrpc": "2.0", "id": 0, "method": method, "params": params}])[0]


def decode(inp):
    b = bytes.fromhex(inp[2:])
    sel = b[:4].hex()
    if sel == "015d8eb9":  # Bedrock ABI: number, timestamp, basefee, hash, seq, ...
        w = [int.from_bytes(b[4 + 32 * i: 36 + 32 * i], "big") for i in range(5)]
        return w[0], w[4]
    # Ecotone and later packed layout: scalar(4) blobScalar(4) seq(8) ts(8) number(8)
    seq = int.from_bytes(b[12:20], "big")
    num = int.from_bytes(b[28:36], "big")
    return num, seq


l1cache = {}


def l1_times(nums):
    need = sorted(set(n for n in nums if n not in l1cache))
    for i in range(0, len(need), 10):
        chunk = need[i:i + 10]
        res = rpc(L1, [{"jsonrpc": "2.0", "id": j, "method": "eth_getBlockByNumber",
                        "params": [hex(n), False]} for j, n in enumerate(chunk)])
        for n, r in zip(chunk, res):
            if r:
                l1cache[n] = int(r["timestamp"], 16)


def l1_head_at(t, guess):
    """Highest L1 block number with timestamp <= t, searching near guess."""
    n = guess
    l1_times(range(n, n + 10))
    while l1cache.get(n + 1, 1 << 62) <= t:
        n += 1
        if n + 1 not in l1cache:
            l1_times(range(n + 1, n + 10))
    return n


HEAD = {}


def call(n, sel):
    return {"jsonrpc": "2.0", "method": "eth_call", "params": [{"to": L1BLOCK, "data": sel}, hex(n)]}


def window(url, start, count, batch=int(os.environ.get("B", "8"))):
    # OP Stack L2 timestamps are deterministic: t(n) = t(head) - (head - n) * blocktime
    rows = []
    for i in range(start, start + count, batch):
        nums = list(range(i, min(i + batch, start + count)))
        reqs = []
        for n in nums:
            reqs += [call(n, "0x8381f58a"), call(n, "0x64ca23ef")]
        for j, r in enumerate(reqs):
            r["id"] = j
        res = rpc(url, reqs)
        for k, n in enumerate(nums):
            num, seq = int(res[2 * k], 16), int(res[2 * k + 1], 16)
            t = HEAD["t"] - (HEAD["n"] - n) * HEAD["bt"]
            rows.append((n, t, num, seq))
        time.sleep(float(os.environ.get("S", "0.8")))
    return rows


def main():
    name, url = sys.argv[1], sys.argv[2]
    windows = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    per = int(sys.argv[4]) if len(sys.argv) > 4 else 300
    head = int(one(url, "eth_blockNumber", []), 16)
    first = one(url, "eth_getBlockByNumber", [hex(head), False])
    blocktime = int(first["timestamp"], 16) - int(one(url, "eth_getBlockByNumber", [hex(head - 100), False])["timestamp"], 16)
    blocktime = round(blocktime / 100)
    HEAD.update(n=head, t=int(first["timestamp"], 16), bt=blocktime)
    # windows spread over the last ~30 days
    span = int(30 * 86400 / blocktime)
    starts = [head - per - int(span * k / max(1, windows - 1)) for k in range(windows)]
    delays, confs, details = [], [], []
    for s in starts:
        rows = window(url, s, per)
        l1_times([r[2] for r in rows])
        for (n, t, num, seq) in rows:
            if seq != 0:
                continue
            d = t - l1cache[num]
            h = l1_head_at(t, num)
            delays.append(d)
            confs.append(h - num)
        details.append((s, rows[0][1]))
    delays.sort(); confs.sort()
    q = lambda xs, p: xs[min(len(xs) - 1, int(p * len(xs)))]
    print(json.dumps({
        "chain": name, "l2_head": head, "l2_block_time_s": blocktime, "epochs_sampled": len(delays),
        "window_start_times_utc": [time.strftime('%Y-%m-%d %H:%M', time.gmtime(t)) for _, t in details],
        "delay_s": {"min": delays[0], "p10": q(delays, .1), "median": statistics.median(delays), "p90": q(delays, .9), "max": delays[-1]},
        "confs_on_top": {"min": confs[0], "median": statistics.median(confs), "max": confs[-1],
                         "mode": statistics.mode(confs)},
    }))


main()
