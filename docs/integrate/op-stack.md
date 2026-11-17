# OP Stack

op-node doesn't read L1 at `safe`. It picks the L1 origin for new L2 blocks a fixed number of blocks behind the L1 head, and there's no setting to switch that to `safe` in a release today. A change that adds one is under review upstream.

## How op-node reads deposits today

| Flag | Default | What it does |
| --- | --- | --- |
| `--sequencer.l1-confs` | `4` | The sequencer picks an L1 origin this many blocks behind the L1 head. Deposits in newer L1 blocks wait. |
| `--verifier.l1-confs` | `0` | Verifiers derive L2 this many blocks behind the L1 head. |
| `--l1.epoch-poll-interval` | `384s` (one epoch) | How often op-node fetches L1 `safe` and `finalized`. |

Both confirmation depths are applied by one wrapper, [`op-node/rollup/confdepth/conf_depth.go`](https://github.com/ethereum-optimism/optimism/blob/develop/op-node/rollup/confdepth/conf_depth.go), which hides L1 blocks within *k* of the L1 head.

## What FCR changes

With the default 4 blocks, deposits already arrive after about 48 seconds. FCR's gain for the OP Stack is mostly the **guarantee**: 4 blocks is a guess that no reorg goes deeper, while a fast-confirmed block has been checked against attestations.

## The proposed change upstream

A proposal to let op-node and op-batcher count their confirmations from L1 `safe` is open in the Optimism repo: issue [#23790](https://github.com/ethereum-optimism/optimism/issues/23790), with draft PRs [#23791](https://github.com/ethereum-optimism/optimism/pull/23791) (op-node) and [#23792](https://github.com/ethereum-optimism/optimism/pull/23792) (op-batcher and the other services). It adds three flags; each defaults to `latest`, so nothing changes until an operator sets it:

| Proposed flag | Values | What it does |
| --- | --- | --- |
| `--sequencer.l1-block-tag` | `latest`, `safe` | `--sequencer.l1-confs` is counted from this L1 block. |
| `--verifier.l1-block-tag` | `latest`, `safe`, `finalized` | `--verifier.l1-confs` is counted from this L1 block. |
| `--num-confirmations-block-tag` | `latest`, `safe`, `finalized` | op-batcher's `--num-confirmations` is counted from this L1 block. |

With FCR, an OP Stack chain would run:

```sh
op-node --sequencer.l1-block-tag=safe --sequencer.l1-confs=0 \
        --verifier.l1-block-tag=safe --verifier.l1-confs=0 \
        --l1.epoch-poll-interval=12s
op-batcher --num-confirmations-block-tag=safe --num-confirmations=1
```

- **Lower the poll interval.** op-node fetches L1 `safe` only every `--l1.epoch-poll-interval`, one epoch (384 s) by default. Without lowering it, the sequencer would wait longer than today's 4 blocks.
- **Plan for a stall.** If Ethereum stops finalizing, L1 `safe` stops moving too. The sequencer keeps building L2 blocks on its current origin until the next block would exceed the max sequencer drift, then stops until `safe` moves again. The draft has no automatic fallback to a block count, so alert on the gap between L1 `safe` and the L1 head.

::: warning Not available upstream yet
These flags are a proposal under review, not in an op-node release. Names and behaviour may change. If you run an OP Stack chain and want to use FCR, [talk to us](/../#talk).
:::

## The L1 node

Whatever you change in op-node, the L1 node it reads from must run FCR. See [Run a node with FCR](./run-a-node).
