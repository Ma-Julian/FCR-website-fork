# Run a node with FCR

FCR runs in the consensus client. Your application reads it through the execution client's `safe` tag. So the node you read from must be a consensus client with FCR on, paired with an execution client.

## What you need

| Part | Requirement |
| --- | --- |
| Consensus client | A client with FCR on: Lighthouse v8.3.0+, Prysm v7.2.0+, Nimbus v26.6.0+ (on by default), Lodestar v1.44.0+ or Teku v26.9.0+ (hidden flag). See [Client support](../reference/clients). For production, run at least two different ones: see [Security recommendations](../operate/security-recommendations#use-at-least-two-different-clients). |
| Execution client | Any execution client, paired with that consensus client over the Engine API. No change needed. |
| Network | Well-peered, with a stable connection. See [Security recommendations](../operate/security-recommendations). |
| Hardware | Your usual node, plus CPU headroom: FCR adds work on every slot. |

## How `safe` gets to your application

1. Every slot, after the attestations are in, the consensus client runs the rule and updates its confirmed block.
2. It sends that block to the execution client as `safeBlockHash` in `engine_forkchoiceUpdated`.
3. The execution client answers `eth_getBlockByNumber("safe")` and every other `safe` query with that block.

Your application only talks to the execution client. If you also want push updates, subscribe to the consensus client's [`fast_confirmation` event](../reference/apis#beacon-api-fast-confirmation-event).

## Set it up

::: code-group

```sh [Lighthouse]
lighthouse bn \
  --network mainnet \
  --execution-endpoint http://localhost:8551 \
  --execution-jwt /secrets/jwt.hex \
  --enable-fast-confirmation
```

```sh [Prysm]
beacon-chain \
  --mainnet \
  --execution-endpoint=http://localhost:8551 \
  --jwt-secret=/secrets/jwt.hex \
  --enable-fast-confirmation
```

```sh [Nimbus]
# FCR is on by default since v26.6.0: no flag needed
nimbus_beacon_node \
  --network=mainnet \
  --el=http://localhost:8551 \
  --jwt-secret=/secrets/jwt.hex
```

```sh [Lodestar]
lodestar beacon \
  --network mainnet \
  --execution.urls http://localhost:8551 \
  --jwt-secret /secrets/jwt.hex \
  --chain.fastConfirmation
```

```sh [Teku]
# Hidden, experimental flag
teku \
  --network=mainnet \
  --ee-endpoint=http://localhost:8551 \
  --ee-jwt-secret-file=/secrets/jwt.hex \
  --Xfast-confirmation-enabled
```

:::

Run your execution client as usual, with the same JWT secret.

## Leave CPU headroom

FCR adds work on every slot. Lodestar describes it as computationally heavy, so watch CPU headroom, and validator effectiveness if the node also serves validators. Teku's flag is hidden and experimental.

## More than one node

For production, we strongly recommend reading from at least two nodes running different consensus clients, and treating a block as fast-confirmed only when they agree. See [Security recommendations](../operate/security-recommendations#use-at-least-two-different-clients).
