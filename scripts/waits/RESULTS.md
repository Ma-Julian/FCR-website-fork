# Deposit waits: how each chain decides an Ethereum deposit is safe to include

Checked 19 Oct 2026. Katana and X Layer: the wait is for the Agglayer bridge, which carries their deposits;
their OP Stack origin lag is 5. These are the figures behind `data/waits.json`.

**Slots** means L1 blocks on top of the deposit's block at the moment the chain includes it. That is the
operator's setting plus the time it takes to act on it. **Justified** and **finalized** mean the chain waits for
that Ethereum checkpoint, which takes a variable number of slots.

Every entry has two checks: the code or config that sets the wait, and an on-chain measurement. Where the
operator's config is private (all OP Stack chains, Lighter), the measurement is the source.

## OP Stack chains: measured

The op-node `--sequencer.l1-confs` setting defaults to 4 L1 blocks
([flags.go](https://github.com/ethereum-optimism/optimism/blob/5af01c2674806c849f2f392631941fe4bbe57e28/op-node/flags/flags.go#L278-L284)).
Chains don't publish what their sequencer runs, so we measured it with `op-stack-l1-lag.py`. It sampled four
windows of L2 blocks, at today and 10, 20 and 30 days back, and recorded the L1 blocks on top of each new L1
origin. A chain running the default 4 shows up as 5: the origin only moves when the L2 clock reaches it.

| Chain | Slots (mode) | Range | Delay, median | Epochs sampled |
|---|---|---|---|---|
| Base | 14 | 14–15 | 178 s | 99 |
| Hemi | 8 | 7–8 | 96 s | 599 |
| OP Mainnet | 6 | 6–7 | 78 s | 79 |
| World Chain | 6 | 5–6 | 72 s | 99 |
| Ink | 5 | 5–6 | 71 s | 49 |
| Zora | 5 | 4–5 | 64 s | 99 |
| Mode | 5 | 4–5 | 64 s | 77 |
| Soneium | 5 | 4–5 | 62 s | 99 |
| Metal | 5 | 4–6 | 64 s | 68 |
| Unichain | 4 | 4–5 | 55 s | 40 |
| Fraxtal | 15 | 15 | 178–190 s | 30 |
| Manta Pacific | 11 | 11–12 | 140 s | 151 |
| BOB | 5 | 4–6 | 64 s | 31 |
| Mantle | 3 | 3–4 | 47 s | 77 |

## Chains that wait for an Ethereum checkpoint

| Chain | Waits for | Source | On chain |
|---|---|---|---|
| Arbitrum One | justified | Nitro delayed sequencer reads L1 `safe` by default ([delayed_sequencer.go L120–126](https://github.com/OffchainLabs/nitro/blob/ccc5c828d9ea22f161efc784bac4d4a6559b7e59/arbnode/delayed_sequencer.go#L120-L126)) | 53 deposits, 411–769 s, median 551 s; each fits the next justified checkpoint |
| Arbitrum Nova | justified | Same Nitro code | 55 deposits; all fit justified, 14 rule out finalized |
| Robinhood Chain | justified | Same Nitro code | 51 deposits, 450–787 s, median 650 s; all within 3 blocks of justified |
| Linea | finalized | Coordinator anchors L1 messages up to `FINALIZED` ([MessageAnchoringConfigToml.kt L29–33](https://github.com/Consensys/linea-monorepo/blob/5e5ea64898561935078dd061047c1eb625b016ff/coordinator/config/src/main/kotlin/lineth/coordinator/config/v2/toml/MessageAnchoringConfigToml.kt#L29-L33)) | 25 messages, 787–1151 s, median 1006 s |
| Scroll | finalized | l2geth forces `--l1.confirmations finalized` on mainnet ([flags.go L2033–2035](https://github.com/scroll-tech/go-ethereum/blob/206013805c3e0c57a4e2110299f18ecfdd590c67/cmd/utils/flags.go#L2033-L2035)) | 40 messages, 774–1121 s, median 1003 s |
| ZKsync Era | finalized | Mainnet config leaves `confirmations_for_eth_event` empty, so the watcher reads up to `finalized` ([mainnet.yaml L22](https://github.com/matter-labs/zksync-era/blob/ff5f519b11cff863edcfa0f75af10fea113806b0/etc/env/file_based/overrides/mainnet.yaml#L22), [client.rs L558–564](https://github.com/matter-labs/zksync-era/blob/ff5f519b11cff863edcfa0f75af10fea113806b0/core/node/eth_watch/src/client.rs#L558-L564)) | 39 deposits, 800–1159 s, median 952 s |
| X Layer | finalized | Deposits go through the Agglayer bridge; its oracle syncs L1 exit roots at `FinalizedBlock` by default ([aggkit default.go L106](https://github.com/agglayer/aggkit/blob/b8dce2b40f12847214bedfddc75eda0f7d8f6041/config/default.go#L106)) | 18 exit-root updates, all 0.5–1.4 slots after finality |
| Celo | finalized | Sequencer follows only finalized Ethereum blocks ([Celo docs](https://docs.celo.org/specs/finality)) | 96 epochs over 30 days, 68–107 L1 blocks on top, median 1060 s (measured 21 Oct with `op-stack-l1-lag.py`) |
| MegaETH | finalized | Measured only: the L1 origin advances in jumps of an epoch, following finalized Ethereum blocks | 5 epochs sampled over 7 days, 867–1147 s |
| Ronin | finalized | Ronin's bridge runs on Chainlink CCIP, which waits for Ethereum finality by default ([Ronin blog](https://roninchain.com/blog/posts/the-ronin-bridge-ccip-migration-has-begun)); its OP Stack portal (4 blocks, 58–62 s measured) carries few deposits | – |
| Plume | justified | Arbitrum Nitro chain, same delayed-sequencer default as Arbitrum One | 6 deposits, 443–665 s, median 645 s |
| Gnosis Chain | FCR since 7 Oct 2026 (was finalized) | Bridge validators read Ethereum with FCR ([bridge-validator #9](https://github.com/gnosischain/bridge-validator/pull/9)) | Omnibridge ETH deposits: ~16 min median before, ~30 s after |
| Morph | finalized | Sync service defaults to `finalized` ([config.go L38](https://github.com/morph-l2/morph/blob/50d14fe339b3a5faed663cb0b340fee5aab95909/node/sync/config.go#L38)) | 58 deposits, 772–1144 s, median 973 s |

Justified takes 33–64 slots after the deposit block (it depends on where in the epoch the deposit lands).
Finalized takes 64–96.

## Other chains with a fixed count

| Chain | Slots | Source | On chain |
|---|---|---|---|
| Polygon PoS | 64 | Heimdall's `main_chain_tx_confirmations` is 64 on mainnet ([chainmanager params](https://heimdall-api.polygon.technology/chainmanager/params); code default 6) | 17 state syncs, 937–1285 s, median 1141 s (64 blocks plus Heimdall and Bor processing) |
| Starknet | 10 | Sequencer deployment config `finality: 10` ([l1_events_scraper.libsonnet L4](https://github.com/starkware-libs/sequencer/blob/93f58aa57f7f6cd1659aaafe08599c8a57bf3496/deployments/sequencer/configs/jsonnet/lib/applicative_config/components/l1_events_scraper.libsonnet#L4)) | 9 messages, 204–235 s (a 30 s poll and 70 s cooldown come on top) |
| Paradex | 10 | Same Starknet sequencer config | 60 deposits, 110–142 s; 9–11 blocks on top |
| Lighter | 8 | Sequencer is closed source; measured only | 174 deposits, 98–121 s; 8 blocks on top in 138, 9 in 36 |
| Metis | 13 | Measured only | 15 L1-origin transactions, 153–163 s, median 159 s |
| Katana | 13 | Deposits go through the Agglayer bridge (Katana docs call it canonical); the operator runs a shorter setting than aggkit's finalized default | 20 exit-root updates, 152–189 s, 12–15 blocks on top |
| ADI Chain | 2 | zksync-os server defaults to `confirmations: 2` ([mod.rs L1385–1387](https://github.com/matter-labs/zksync-os-server/blob/e29a2c0a584b7f3f985e9a414bfbe179456c093d/node/bin/src/config/mod.rs#L1385-L1387)) | 33 deposits, 25–28 s; exactly 2 blocks on top |

## Not in waits.json yet

- **Taiko**: L2 blocks anchor an L1 block 5 behind the head and move the anchor every 32 L1 blocks, so a
  deposit waits 5–36 slots depending on timing (median ~21).
- **Aztec**: an L1→L2 message is usable two Aztec checkpoints (72 s each) after it is sent: 11–30 slots,
  median 16, over 135 messages.
- **Polygon zkEVM** (shut down July 2026), **Blast** and **Abstract** were removed from the chain list.
