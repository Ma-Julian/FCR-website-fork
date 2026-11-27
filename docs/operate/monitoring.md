# Monitoring

What to watch once FCR is live, and when to alert.

## Signals

| Signal | How to get it | Normal | Alert when |
| --- | --- | --- | --- |
| `safe` lag | `latest` minus `safe`, in blocks | A few blocks | More than ~32 blocks: FCR is off or has fallen back |
| Time since `safe` moved | Track when the `safe` number last changed | Under ~30 s | More than an epoch (6.4 min) |
| `safe` going backwards | Compare each `safe` with the previous one | Rare: mostly after a node restart | Any time outside a restart: log it, and check you didn't reprocess blocks |
| Re-check mismatches | Your finality re-check | Zero | Any: page someone |
| Pending backlog | Events processed under FCR, not yet finalized | A few epochs' worth | Growing without bound: your re-check has stopped |
| Node health | Peer count, sync status, CPU | Your usual baselines | Low peers or high CPU: FCR is more exposed |

::: tip Network-wide status
To see whether FCR is healthy across the network, not just on your node, compare with a second node, ideally running another client. If FCR is delayed on both, the network is the cause, not your node.
:::

## Client metrics

If you run the consensus client, it exports FCR metrics for Prometheus. Four are the same in Lighthouse, Prysm, Lodestar and Teku:

| Metric | Type | What it measures | Alert when |
| --- | --- | --- | --- |
| `beacon_fast_confirmation_slot` | Gauge | Slot of the latest fast-confirmed block | It stops increasing |
| `beacon_fast_confirmation_reorgs_total` | Counter | Fast-confirmed blocks that were reorged | It increases |
| `beacon_fast_confirmation_fallbacks_total` | Counter | Resets of the confirmed block to the finalized block | It increases outside a restart |
| `beacon_fast_confirmation_restarts_total` | Counter | Restarts from a justified checkpoint at the start of an epoch | For context only |

Each client adds its own:

| Client | Extra metrics |
| --- | --- |
| Lighthouse | `beacon_fast_confirmation_delay_slots` (head slot minus confirmed slot), `beacon_fast_confirmation_settled_delay_slots`, `beacon_fast_confirmation_fallback_reasons_total` (by reason), `beacon_fast_confirmation_errors_total` (by error), `beacon_fast_confirmation_seconds` (run time), and more in [`metrics.rs`](https://github.com/sigp/lighthouse/blob/stable/consensus/fast_confirmation/src/metrics.rs) |
| Prysm | `beacon_fast_confirmation_distance_slots` (current slot minus confirmed slot), `beacon_fast_confirmation_duration_milliseconds` (run time) |
| Lodestar | `lodestar_fast_confirmation_paused` (1 while syncing), `lodestar_fast_confirmation_resets_total`, `lodestar_fast_confirmation_duration_seconds` (run time) |
| Teku | `beacon_fast_confirmation_timeout_total` (slots where the rule didn't finish in time), `beacon_fast_confirmation_calculation_seconds` (run time) |
| Nimbus | None yet: use the [`fast_confirmation` event](../reference/apis#beacon-api-fast-confirmation-event) or compare `safe` with `latest` |

## Tell "stalled" from "off"

Both show up as a large `safe` lag. To tell them apart:

- **FCR off** (or a provider serving the justified block): `safe` jumps forward about once per epoch, and lands on epoch boundaries.
- **FCR stalled**: `safe` was moving every slot and has stopped. It catches up once the network recovers, or resets to `finalized`.

If you also run the consensus client, the [`fast_confirmation` event](../reference/apis#beacon-api-fast-confirmation-event) fires every slot while the rule runs.

## Dashboards

Plot `latest`, `safe` and `finalized` block numbers on one chart. With FCR on, `safe` hugs `latest`; when it drops to `finalized`, you're in fallback.

