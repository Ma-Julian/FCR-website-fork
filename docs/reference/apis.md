# APIs

## Execution JSON-RPC: the `safe` tag

With FCR on in the paired consensus client, the `safe` block tag returns the latest fast-confirmed block. It works anywhere a block tag is accepted.

```json
{ "jsonrpc": "2.0", "id": 1, "method": "eth_getBlockByNumber", "params": ["safe", false] }
```

Other methods that take a block tag, such as `eth_getBalance`, `eth_call` and `eth_getLogs` (`toBlock`), work the same way.

`safe` always returns a valid block. When FCR can't advance, it returns the latest block it did confirm, or the finalized block.

## Beacon API: `fast_confirmation` event

Beacon nodes that support it emit a `fast_confirmation` event on the event stream after each run of the rule, about once per slot, even when the confirmed block hasn't changed.

```sh
curl -N 'http://localhost:5052/eth/v1/events?topics=fast_confirmation'
```

| Field | Meaning |
| --- | --- |
| `block` | Root of the fast-confirmed beacon block |
| `slot` | Slot of that block |
| `current_slot` | The slot in which the rule ran |

Specified in beacon-APIs [PR #598](https://github.com/ethereum/beacon-APIs/pull/598) and [PR #616](https://github.com/ethereum/beacon-APIs/pull/616), in beacon-APIs v5.0.0-beta.0. Lighthouse v8.3.0 emits all three fields.

## Lodestar: `/eth/v1/lodestar/fast_confirmation`

Returns the confirmed block, head, justified and finalized checkpoints, and the rule's internal state. Requires `--rest.namespace lodestar`.
