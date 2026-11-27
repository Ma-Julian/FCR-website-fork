# Quick start

Turn FCR on in your consensus client, then read the `safe` block. Most integrations need nothing else.

::: info A node with FCR, yours or a provider's
Some RPC providers already serve FCR: see [RPC providers](./rpc-providers). Or run a consensus client with FCR on, paired with an execution client: see [Run a node with FCR](./run-a-node).
:::

## 1. Turn on FCR in your consensus client

FCR is off by default. Turn it on in the beacon node that feeds your execution client.

::: code-group

```sh [Lighthouse]
lighthouse bn --enable-fast-confirmation
```

```sh [Prysm]
beacon-chain --enable-fast-confirmation
```

```sh [Nimbus]
# On by default since v26.6.0: nothing to turn on
nimbus_beacon_node
```

```sh [Lodestar]
lodestar beacon --chain.fastConfirmation
```

```sh [Teku]
# Hidden, experimental flag
teku --Xfast-confirmation-enabled
```

:::

Versions and caveats per client: [Client support](../reference/clients).

## 2. Read the `safe` block

With FCR on, the execution client's `safe` tag points at the latest fast-confirmed block.

```sh
curl -s -X POST http://localhost:8545 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getBlockByNumber","params":["safe", false]}'
```

That block and its ancestors are fast-confirmed. `safe` can move back to a lower block, so keep track of the highest block you've processed rather than re-reading from `safe` each time: see [Reorgs and fallback](../operate/reorgs-and-fallback#when-safe-pauses-or-moves-back).

## 3. Check it's working

Compare `safe` with `latest` a few times over a minute:

- **FCR on:** `safe` is usually a few blocks behind `latest` and moves forward about once per slot (12 s).
- **FCR off:** `safe` is the justified block, 32 or more blocks behind `latest`, and moves about once per epoch (6.4 min).

If `safe` stays far behind with FCR on, see [Reorgs and fallback](../operate/reorgs-and-fallback).

## Next

Follow the guide for what you run: [rollups](./rollups), [bridges](./bridges) or [exchanges](./exchanges). Before going live, read [Test and roll out](./rollout).
