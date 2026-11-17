# The `safe` tag with FCR

Exactly what `safe` means when the consensus client runs FCR, and what it doesn't promise.

## Where it comes from

The consensus client keeps a confirmed block (`confirmed_root` in a separate fast-confirmation store, next to fork choice). Every slot, after the attestations for that slot are applied, it runs the rule and updates it. It passes the matching execution block to the execution client as `safeBlockHash` in `engine_forkchoiceUpdated`, and the execution client returns it for the `safe` tag.

Without FCR, the same field carries the justified checkpoint's block. With FCR on, when the rule errors or is skipped while the node syncs, Lighthouse sends the finalized block, never the justified one.

## What it promises

| Property | With FCR |
| --- | --- |
| Valid | Always a valid block on the node's canonical chain |
| Fresh | Usually a few blocks behind `latest` |
| Updates | Once per slot, after the attestations for that slot are in |
| Won't be reorged | Under the [assumptions](../evaluate/assumptions-and-attacks): synchrony, and less than 25% of stake acting against it |

## What it doesn't promise

| Not promised | Why it matters |
| --- | --- |
| Only goes up | If FCR can't re-confirm its block (it's too old, off the canonical chain, or fails the check at the start of an epoch), `safe` resets to the finalized block: a lower block number. This is rare, as it is for the justified block without FCR, but possible. Keep your own record of the last block you processed. |
| Never reorged | If the assumptions break, a fast-confirmed block can be reorged. A one-year replay of mainnet found no such false confirmation ([Security](../evaluate/security#mainnet-track-record)). |
| Economic finality | Reverting a fast-confirmed block burns no stake. |
| The same on every node | Each node computes `safe` from the attestations it has seen, so two nodes can briefly disagree. |
| FCR on a given endpoint | `safe` without FCR is the justified block. Check which one you get: see [RPC providers](../integrate/rpc-providers#don-t-assume-check). |
