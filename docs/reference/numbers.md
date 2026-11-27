---
title: Where our numbers come from
description: How every figure on fastconfirm.it was measured, over which period and from which contracts, so you can check it.
---

<script setup>
// Every table on this page is read from the same data files the site uses, so the two can't disagree.
import timeSaved from '../../data/time-saved.json'
import measured from '../../data/measured.json'
import waits from '../../data/waits.json'

const n = (v) => v.toLocaleString('en-US')
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`
const gnosis = timeSaved.integrations.find((i) => i.id === 'gnosis')
// Before FCR: the finality floor (768–1,152 s after the block, typically about 16 min) plus how long
// transfers typically took beyond it in the 30 days before the switch.
const beforeMin = (r) => Math.round((r.typicalFloorSeconds + r.check.typicalAboveFloorSeconds) / 60)
const above = gnosis.routes.map((r) => r.check.typicalAboveFloorSeconds)
const aboveText = Math.min(...above) === Math.max(...above) ? `${above[0]}` : `${Math.min(...above)}–${Math.max(...above)}`
const sep = (i) => (i === gnosis.routes.length - 1 ? '.' : '; ')
const across = (m) => (m.intentBridges || []).find((b) => b.deposits > 0)
const waitText = (w) => (w.live ? `FCR, since ${w.live.sinceText} (finality before)`
  : w.wait === 'finalized' ? 'Finality' : w.wait === 'justified' ? 'Justification'
  : w.wait === 'based' ? `An Ethereum anchor, about ${w.slots} blocks` : `${w.slots} blocks`)
</script>

# Where our numbers come from

Every figure on this site comes from public chain data, a project's own code or docs, or a published study. This page says how each was measured, so you can check it.

## FCR's own times

- **24 seconds at minimum.** The site gives one time for FCR: its minimum after the Glamsterdam upgrade, when `safe` points at the payload of the confirmed block's parent. Until then, a block can be confirmed one slot (12 s) after it's proposed. See [Versions and changes](./versions).
- **End to end, a bridge adds its own steps,** such as polling, signing and the destination chain's block time. Gnosis Chain, below, is the measured example.

## Gnosis Chain before and after FCR

Gnosis's bridge validators switched deposits from Ethereum from finality to FCR on 7 October 2026 ([bridge-validator PR #9](https://github.com/gnosischain/bridge-validator/pull/9)). We measure every transfer from Ethereum to Gnosis Chain on both of its bridges, from the timestamp of the Ethereum block it started in to the timestamp of the Gnosis Chain block it arrived in.

<table v-if="gnosis">
  <thead><tr><th>Bridge</th><th>Before FCR</th><th>With FCR</th></tr></thead>
  <tbody>
    <tr v-for="r in gnosis.routes" :key="r.id">
      <td>{{ r.name }}</td>
      <td>About {{ beforeMin(r) }} min: {{ n(r.check.transfers) }} transfers, {{ day(r.check.from) }} to {{ day(r.check.to) }}</td>
      <td>{{ r.typicalSeconds }} s: {{ n(r.transfers) }} transfers, {{ day(gnosis.fcrSince) }} to {{ day(gnosis.measuredUntil) }}</td>
    </tr>
  </tbody>
</table>

Times are typical (median) values.

- **With FCR:** the typical time from the Ethereum block to arrival on Gnosis Chain.
- **Before FCR:** a transfer could arrive only once its Ethereum block was finalized. That is 768–1,152 seconds after the block, depending on where in the epoch it lands, typically about 16 minutes. Transfers then typically arrived {{ aboveText }} seconds after that point. No transfer in those 30 days arrived earlier than finality allowed.
- **Contracts:** <span v-for="(r, i) in gnosis.routes" :key="r.id">{{ r.name }}: <a :href="`https://etherscan.io/address/${r.contracts.ethereum}`">{{ short(r.contracts.ethereum) }}</a> on Ethereum, <a :href="`https://gnosisscan.io/address/${r.contracts.gnosis}`">{{ short(r.contracts.gnosis) }}</a> on Gnosis Chain{{ sep(i) }}</span>
- **Data:** the same measurement as [Time saved by FCR](./time-saved). It is re-measured from the chain every day, last on {{ day(timeSaved.checkedOn) }}.

## Deposits per chain, last 12 months

The **Numbers** section of the result card on the home page counts deposits from Ethereum to each chain from 19 October 2025 to 19 October 2026 (Ethereum blocks 23,611,840 to 26,226,761). Each count is the number of Ethereum transactions that emitted the chain's own deposit event. Across, the intent bridge, is counted by its `FundsDeposited` events to that chain.

<table>
  <thead><tr><th>Chain</th><th>Own bridge</th><th>Across</th><th>What we counted</th></tr></thead>
  <tbody>
    <tr v-for="m in measured" :key="m.name">
      <td>{{ m.name }}</td>
      <td>{{ n(m.nativeBridge.deposits) }}</td>
      <td>{{ across(m) ? n(across(m).deposits) : '–' }}</td>
      <td>{{ m.nativeBridge.method }} (<a :href="`https://etherscan.io/address/${m.nativeBridge.contract}`">{{ short(m.nativeBridge.contract) }}</a>)</td>
    </tr>
  </tbody>
</table>

Counts include messages sent by contracts, not only user deposits. Across counts include solver and bot flows.

## Deposit waits per chain

The chart **How long Ethereum deposits wait today** shows the rule each chain's bridge follows before it credits a deposit from Ethereum, not the time end to end. Waits come from each chain's code or config, or were measured on chain.

<table>
  <thead><tr><th>Chain</th><th>Waits for</th><th>Source</th><th>Checked</th></tr></thead>
  <tbody>
    <tr v-for="w in waits" :key="w.name">
      <td>{{ w.name }}</td>
      <td>{{ waitText(w) }}</td>
      <td><a v-if="w.sourceUrl" :href="w.sourceUrl">{{ w.source }}</a><span v-else>{{ w.source }}</span></td>
      <td>{{ day(w.checkedOn) }}</td>
    </tr>
  </tbody>
</table>

A block takes 12 seconds. Finality is shown as about 13 minutes and justification as about 9 minutes.

## FCR's track record

The site's one-year backtest is the [EthPandaOps FCR simulator](https://ethpandaops.io/posts/fcr-simulator/): a replay of historical mainnet through the FCR code of four consensus clients.

- **Period:** Lighthouse for 12 months, 29 May 2025 to 20 May 2026 (2.56 million slots). Lodestar from 31 December 2025, and Grandine and Teku from 28 January 2026, to the same end date.
- **5.15 million slot evaluations:** each client's slots counted separately, so this is more than the 2.56 million slots in the year.
- **0 false confirmations:** no client ever fast-confirmed a block that ended up off the finalized chain. A [false confirmation](./glossary#false-confirmation) is a fast-confirmed block that was reorged.
- **About 96 of every 100 slots** would have been fast-confirmed within 12 seconds.

It is a replay, not a live run. See [Security](../evaluate/security#mainnet-track-record) for what it simplifies.

## Time saved

The "saved with FCR" figure on the home page has its own page: [Time saved by FCR](./time-saved).
