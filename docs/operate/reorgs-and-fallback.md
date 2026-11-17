# Reorgs and fallback

A reorg of a fast-confirmed block is extremely unlikely. FCR's [assumptions](../evaluate/assumptions-and-attacks) are necessary for an attack, not sufficient: an attacker would also need more than 25% of a committee *and* to eclipse your node. A one-year replay of mainnet through the clients' FCR code found [no false confirmations](../evaluate/security#mainnet-track-record), and the rule's safety is [formally verified](../evaluate/security#formal-verification). Still, your product should be able to handle a reorg, as it should for any confirmation rule short of finality. This page shows how.

Two things can happen to the `safe` block:

- **It moves back.** `safe` points to an older block than before, on the same chain. FCR is less sure right now, but the blocks it confirmed earlier are still on the chain and will most likely be finalized. Nothing you did needs undoing; new blocks just take longer.
- **A fast-confirmed block is reorged.** A block `safe` pointed to is no longer on the chain. This is the case that needs action.

## What your product sees

| State | What happens to `safe` | What it means | What to do |
| --- | --- | --- | --- |
| **Normal** | Moves forward about once per slot | Blocks are fast-confirmed in seconds | Act on `safe` |
| **Degraded** | Pauses, or moves back to the finalized block | FCR can't vouch for new blocks right now. Nothing you acted on has changed | Wait. New blocks confirm at finality speed for a while |
| **Incident** | Moves back, and a block you acted on is no longer on the chain | A fast-confirmed block was reorged | Stop acting on `safe`, find what you acted on, and settle it (below) |

The only way to tell degraded from incident is to compare block hashes: a lower `safe` on its own is not a reorg.

## When `safe` pauses or moves back

When FCR can't confirm a new block safely, `safe` stays where it is. If the block it had confirmed can no longer be re-confirmed (it's too old, it's off the canonical chain, or it fails the [check at the start of an epoch](../evaluate/assumptions-and-attacks#when-the-assumptions-don-t-hold)), `safe` resets to the finalized block. That means **`safe` can move to a lower block number**. This is rare: in normal conditions FCR re-confirms its block every slot. The most common cause is operational: after a node restart, `safe` starts from the finalized block until FCR catches up. The justified block, which `safe` returns without FCR, can also move back in rare cases, so this isn't new.

Handle it like this:

- **Keep track of how far you've processed.** Store the number of the last block you've processed, in your own database. Each round, process only the blocks after it, up to `safe`. If `safe` is lower than your stored number, process nothing and wait for `safe` to pass it again.
- **Don't reprocess.** A lower `safe` doesn't mean the blocks you processed were reorged. Your finality re-check (below) tells you whether anything actually changed.
- **Treat it as a delay, not an error.** Users should see their transfer as still confirming, not as failed.
- **Alert on long pauses.** If `safe` hasn't moved for more than an epoch (6.4 minutes), something is off with your node or the network. See [Monitoring](./monitoring).

## If a fast-confirmed block is reorged

### Detect it

Once each block you processed under FCR finalizes, compare its hash with the canonical block at that number. Compare execution block hashes by number, not beacon block roots: a different hash means the block you processed was replaced.

Keep every block you processed as *pending* until this check has run. If a block can't be fetched, leave it pending and retry; never drop it, or it will look verified.

### Check again before you act

If there's a delay between reading an event and acting on it (signing, relaying, crediting), re-read the event's block just before you act. If the event is gone, drop it instead of acting on it.

### Decide what it means for you

| You run | If a fast-confirmed block is reorged |
| --- | --- |
| A rollup | The rollup reorgs with L1, as it would today for any L1 reorg it had derived from. Deposits in the replaced block are re-derived from the new L1 chain, or dropped if they're no longer there. |
| A bridge or relayer | A message may have been relayed that no longer exists on Ethereum. You can't take back a signature or a relayed message, so record it, alert, and settle it off-chain. |
| An exchange | A deposit may have been credited that no longer exists. Treat it like any reversed deposit. |

### Optional safeguards

FCR is built to carry large value flows, and Gnosis runs its bridges on it. If you want an extra margin, some options are: a separate rate limit for transfers that use FCR, waiting for `finalized` above a size you choose, or a switch to turn FCR off per flow. Which, if any, is up to you.

## How Gnosis handles it

The [Gnosis bridge validator](https://github.com/gnosischain/bridge-validator) signs Ethereum events from the `safe` block, and checks each one after the fact:

- Every event read under FCR is stored as *pending*, with its block hash.
- Once the block finalizes, a separate task compares the stored hash with the canonical block at that number. A match marks it *confirmed*; a different hash marks it *reverted*, writes a row to a `fcr_false_positives` table (traceable to the exact signed message) and logs an error. A block that can't be fetched stays pending.
- Nothing is undone on-chain: a signature can't be taken back. The check makes a reorg visible so it can be settled.
- It warns when more than 100 blocks are waiting for this check, since that means signed messages are piling up unverified.

More detail: [Bridges and messaging](../integrate/bridges#example-gnosis-bridges).
