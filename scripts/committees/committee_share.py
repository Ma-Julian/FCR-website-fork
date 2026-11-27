"""
How often does an attacker with a share `beta` of all stake hold more than 25% of one slot's
committee stake?

Model (consensus specs, phase0 `get_beacon_committee`): every epoch the active validator set is
shuffled and split into SLOTS_PER_EPOCH = 32 slot committees; each validator is in exactly one,
whatever its balance. Fork choice weighs each vote by effective balance. So a slot committee is a
uniform random 1/32 of the validators, and the attacker's committee share is

    R = (attacker effective balance in the committee) / (all effective balance in the committee).

R > t  <=>  S = sum over committee members of e_i > 0,  with e_i = a_i - t * b_i
(a_i = b_i for attacker validators, 0 otherwise). Two estimates:

  * saddlepoint (Lugannani-Rice) on S, treating membership as independent Bernoulli(1/32);
    accurate far into the tail, where a simulation can't reach;
  * Monte Carlo of the real thing: a random permutation split into 32 committees per epoch.

Data: active validators from any beacon node, e.g.
  curl -H 'Accept: application/json' -o validators.json \
    "https://ethereum-beacon-api.publicnode.com/eth/v1/beacon/states/head/validators?status=active_ongoing,active_exiting,active_slashed"
  (about 400 MB). The first run caches effective balances in validators.npz next to it.

Usage: python3 committee_share.py validators.json [--mc EPOCHS] [--kinds largest,max2048,small]
Needs numpy and scipy. Results for 21 Oct 2026 are in RESULTS.md.
"""

import argparse
import math
import sys

import numpy as np
from scipy.optimize import brentq
from scipy.stats import norm

SLOTS = 32
SLOT_S = 12
T = 0.25


def pick_attacker(eb, cred, beta, kind, rng):
    """Boolean mask (or balances) of attacker validators holding `beta` of total stake."""
    total = eb.sum()
    target = beta * total
    if kind == "largest":  # worst case today: the attacker owns the biggest existing validators
        order = np.argsort(-eb, kind="stable")
        cum = np.cumsum(eb[order])
        k = int(np.searchsorted(cum, target)) + 1
        att = np.zeros(len(eb), bool)
        att[order[:k]] = True
        return eb, att
    if kind == "small":  # attacker holds only 32 ETH (0x01) validators
        idx = np.flatnonzero(eb == 32)
        k = int(round(target / 32))
        att = np.zeros(len(eb), bool)
        att[rng.choice(idx, k, replace=False)] = True
        return eb, att
    if kind == "max2048":
        # attacker consolidates everything into 2048 ETH validators; it re-stakes the same ETH,
        # so remove an equal amount of honest 32 ETH validators and add 2048 ETH attacker ones.
        k = int(round(target / 2048))
        small = np.flatnonzero(eb == 32)
        drop = rng.choice(small, k * 64, replace=False)
        keep = np.ones(len(eb), bool)
        keep[drop] = False
        eb2 = np.concatenate([eb[keep], np.full(k, 2048)])
        att = np.zeros(len(eb2), bool)
        att[-k:] = True
        return eb2, att
    raise ValueError(kind)


def groups(eb, att, t=T):
    """(value e, count) per distinct (attacker?, balance)."""
    out = []
    for flag in (False, True):
        vals, cnt = np.unique(eb[att == flag], return_counts=True)
        e = vals * ((1 - t) if flag else -t)
        out += list(zip(e.astype(float), cnt.astype(float)))
    e, c = np.array(out).T
    return e, c


def saddlepoint_tail(e, c, p=1 / SLOTS):
    """P(S > 0), S = sum_g sum_{k<c_g} e_g * Bernoulli(p), by Lugannani-Rice."""
    lp, lq = math.log(p), math.log1p(-p)

    def parts(s):
        z = s * e + lp  # log(p e^{s e})
        lse = np.logaddexp(lq, z)  # log(q + p e^{s e})
        w = np.exp(z - lse)  # tilted prob of inclusion
        K = (c * lse).sum()
        K1 = (c * e * w).sum()
        K2 = (c * e * e * w * (1 - w)).sum()
        return K, K1, K2

    mean = parts(0.0)[1]
    if mean >= 0:
        return 0.5
    hi = 1e-6
    while parts(hi)[1] < 0:
        hi *= 2
    s = brentq(lambda s: parts(s)[1], 0.0, hi, xtol=1e-14, rtol=1e-12)
    K, _, K2 = parts(s)
    w = math.sqrt(-2 * K)
    u = s * math.sqrt(K2)
    return norm.sf(w) + norm.pdf(w) * (1 / u - 1 / w)


def monte_carlo(eb, att, epochs, rng, t=T):
    n = len(eb)
    a = np.where(att, eb, 0).astype(np.int64)
    b = eb.astype(np.int64)
    shares = []
    bounds = np.linspace(0, n, SLOTS + 1).astype(int)
    for _ in range(epochs):
        perm = rng.permutation(n)
        ca = np.add.reduceat(a[perm], bounds[:-1])
        cb = np.add.reduceat(b[perm], bounds[:-1])
        shares.append(ca / cb)
    shares = np.array(shares)
    per_slot = (shares > t).mean()
    per_epoch = (shares > t).any(axis=1).mean()
    return per_slot, per_epoch, shares


def fmt_interval(p):
    if p <= 0:
        return "never"
    s = SLOT_S / p
    for unit, sec in (("years", 365.25 * 86400), ("days", 86400), ("hours", 3600), ("minutes", 60)):
        if s >= sec:
            v = s / sec
            return f"{v:,.3g} {unit}" if v < 1e4 else f"{v:.1e} {unit}"
    return f"{s:.0f} s"


def load(path):
    """Effective balances (ETH) and credential prefixes, from beacon API JSON or a cached .npz."""
    if path.endswith(".npz"):
        return np.load(path)
    import json, os
    cache = os.path.splitext(path)[0] + ".npz"
    if os.path.exists(cache):
        return np.load(cache)
    d = json.load(open(path))["data"]
    eb = np.array([int(v["validator"]["effective_balance"]) // 10**9 for v in d])
    cred = np.array([v["validator"]["withdrawal_credentials"][:4] for v in d])
    np.savez(cache, eb=eb, cred=cred)
    return {"eb": eb, "cred": cred}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("npz", help="validators.json from the beacon API, or a cached .npz")
    ap.add_argument("--mc", type=int, default=0, help="Monte Carlo epochs per row (0 = off)")
    ap.add_argument("--kinds", default="largest,max2048,small")
    ap.add_argument("--betas", default="0.15,0.16,0.17,0.18,0.19,0.20,0.21,0.22,0.23,0.24,0.25")
    args = ap.parse_args()
    z = load(args.npz)
    eb = z["eb"]
    rng = np.random.default_rng(1)
    print(f"active validators {len(eb):,}, stake {eb.sum():,} ETH, committee ~{len(eb)//SLOTS:,} validators")
    for kind in args.kinds.split(","):
        print(f"\n== attacker: {kind}")
        print("beta   att.vals  P(>25%, one slot)  P(any slot of epoch)  once every   MC per slot")
        for beta in map(float, args.betas.split(",")):
            eb2, att = pick_attacker(eb, z["cred"], beta, kind, rng)
            e, c = groups(eb2, att)
            p1 = saddlepoint_tail(e, c)
            pe = -math.expm1(SLOTS * math.log1p(-p1)) if p1 < 1 else 1.0
            mc = ""
            if args.mc:
                ps, pep, _ = monte_carlo(eb2, att, args.mc, rng)
                mc = f"{ps:.3g} (epoch {pep:.3g})"
            print(f"{beta:5.1%} {att.sum():9,}  {p1:17.3g}  {pe:20.3g}  {fmt_interval(p1):>12}   {mc}")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
