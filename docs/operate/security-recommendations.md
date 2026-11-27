# Security recommendations

FCR's guarantee holds under its [assumptions](../evaluate/assumptions-and-attacks). Today, the larger risk is not an attack on those assumptions but a bug in a client's FCR code. These recommendations guard against both, starting with the most important one.

## Use at least two different clients

::: warning Strongly recommended
Fast-confirm a block only when nodes running **at least two different consensus clients** agree on it.
:::

**Why.** The FCR implementations in consensus clients are new, and have had less testing and auditing than the code for justification and finality. They also have more room for bugs: justification and finality are read from on-chain data with simple logic, while FCR counts attestations as they arrive over the network and runs a more involved algorithm on them. For now, the chance of a bug in one client is far higher than the chance of the conditions under which FCR's guarantee breaks. Requiring two independent implementations to agree turns a bug in one of them into a short delay instead of a wrong confirmation.

**How.**

1. Run two or more nodes, each with a different consensus client with FCR on. See [Client support](../reference/clients) for which clients have it.
2. Read `safe` from each node.
3. Take the lowest of their `safe` block numbers. Treat that block as fast-confirmed only if every node returns the same block hash at that number.
4. If the nodes disagree, don't confirm. Wait for them to agree, and alert if they keep disagreeing, since that points to a bug in one of them.

A third-party RPC can count as one of the sources, as long as you've [checked what it serves](../integrate/rpc-providers#don-t-assume-check) and know which client is behind it.

**Optional extra checks.** These are not required, but they bound the damage if something still goes wrong:

- **Add a small block count.** Confirm a block only when FCR confirms it *and* it has a few blocks on top (for example 3). A clearly wrong result from FCR is then filtered out.
- **Cap the value.** Above an amount you choose, wait for `finalized`.

## Your application

- **Re-check at finality** and alert on any mismatch. See [Reorgs and fallback](./reorgs-and-fallback).
- **Fail loudly, fall back quietly.** If an RPC can't serve FCR, alert: it's a misconfiguration. If `safe` is merely late, wait: it's expected.
- **Make it a switch.** Be able to turn FCR off per chain or per flow without a deploy.

## Report a vulnerability

FCR is in scope of the [Ethereum Foundation bug bounty](https://ethereum.org/bug-bounty/). Report through the form there, not in public channels.
