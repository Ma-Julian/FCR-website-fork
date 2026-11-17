---
title: Time saved by FCR
description: How fastconfirm.it measures the waiting FCR has saved, transfer by transfer, as a lower bound.
---

<script setup>
import data from '../../data/time-saved.json'
import integrations from '../../data/integrations.json'

// Same rule as the home page: an integration counts once its entry is published.
const published = new Set(integrations.filter((g) => !g.draft).map((g) => g.id))
const rows = data.integrations.filter((i) => published.has(i.id) && i.transfers > 0)
const hours = (s) => Math.floor(s / 3600).toLocaleString('en-US')
const n = (v) => v.toLocaleString('en-US')
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
</script>

# Time saved by FCR

The home page shows how much waiting FCR has saved so far. It is a **lower bound**, measured
on-chain for every transfer that relied on FCR.

## The rule

For each transfer from Ethereum that an integration handled with FCR:

**time saved = earliest moment the old rule could have let it through − when it actually arrived**

- **The old rule** is what the integration waited for before it switched, such as finality or a
  number of blocks.
- **The earliest moment** is a floor set by the protocol, counted from the Ethereum block the transfer started in:
  - **Finality:** a block is finalized with the first epoch checkpoint at or after it. That checkpoint is
    finalized two epochs later at the earliest, so the floor is 768–1,152 seconds after the block. Late
    finality would only have made the wait longer.
  - **A number of blocks:** 12 seconds per block. Empty slots would only have made the wait longer.
- **What the floor leaves out:** anything the old path added on top, such as polling, signing and the
  destination chain's block time.
- **Slow transfers:** a transfer that took longer than its floor counts as negative.

So the real saving is higher than the number shown.

## Checking the floor against the old rule

Each integration is also measured over the 30 days before its switch. If any transfer from that
period arrived before its floor, the floor doesn't describe the old rule. In that case the site
build fails and shows nothing.

## Measured integrations

<table v-if="rows.length">
  <thead><tr><th>Integration</th><th>First FCR transfer</th><th>Transfers</th><th>Typical time with FCR</th><th>Old rule (typical floor)</th><th>Saved, at least</th></tr></thead>
  <tbody>
    <template v-for="i in rows" :key="i.id">
      <tr v-for="r in i.routes" :key="i.id + r.id">
        <td>{{ i.name }} · {{ r.name }}</td>
        <td>{{ day(i.firstFcrDate) }}</td>
        <td>{{ n(r.transfers) }}</td>
        <td>{{ r.typicalSeconds }} s</td>
        <td>{{ r.baseline.label }} ({{ Math.round(r.typicalFloorSeconds / 60) }} min)</td>
        <td>{{ hours(r.savedSeconds) }} h</td>
      </tr>
    </template>
  </tbody>
</table>
<p v-else><em>No published integrations are measured yet.</em></p>

The figures are re-measured from the chain every day, last on {{ day(data.checkedOn) }}.

**What is kept:**
- The totals.
- The same totals per integration, route and day.

**Reproducing them:** individual transfers aren't stored. Anyone can re-measure them from public chain data: the
contracts are listed per integration.

## Add your integration

If you use FCR and want your transfers counted, [talk to us](/support). We need:

- the contracts or events that mark a transfer leaving Ethereum and arriving on the other side;
- when you switched;
- what you waited for before.
