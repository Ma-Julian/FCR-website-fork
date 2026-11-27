<script setup>
// The same list as the home page's Readiness section (data/ready.json "rpc").
import ready from '../../data/ready.json'
</script>

# RPC providers

## Who serves FCR

<p v-if="ready.rpc.length">These RPC providers serve FCR:</p>
<ul v-if="ready.rpc.length">
  <li v-for="p in ready.rpc" :key="p.name"><a :href="p.url" target="_blank" rel="noopener">{{ p.name }}</a></li>
</ul>

Some providers already serve FCR. Ask yours whether it does and how to get it on your endpoint, and check what `safe` returns before you rely on it ([below](#don-t-assume-check)). Many providers still return the justified block under `safe`, to stay backwards compatible for customers who rely on that (see [below](#backwards-compatibility)).

A provider running Nimbus nodes may return fast-confirmed blocks without saying so: Nimbus has served FCR under `safe` by default since v26.6.0.

You can also read `safe` from [your own node](./run-a-node).

::: tip Offer FCR? Get listed here
If you run an RPC service that serves FCR, [tell us](/../#talk) the endpoint, how customers turn it on, and which consensus clients you run. We'll add it to this page after review.
:::

## Don't assume, check

A provider can change what `safe` means without notice, and a load balancer can mix nodes with and without FCR. Before you rely on a provider, and continuously after:

- **Check how far `safe` is behind `latest`.** With FCR it's usually a few blocks. Without, it's 32 or more.
- **Check that `safe` never runs ahead of what your own node has confirmed**, if you run one.
- **Fail loudly.** If you expect FCR and see the justified block, switch to your own node or to `finalized`, and alert. Don't quietly accept the slower block. Gnosis's bridge validator does this at startup: see [Bridges and messaging](./bridges#example-gnosis-bridges).

## For RPC providers

If you run an RPC service and want to offer FCR:

| | Today | With FCR on |
| --- | --- | --- |
| `safe` returns | The latest justified block | The latest fast-confirmed block |
| How often `safe` moves | About once per epoch (6.4 min) | About once per slot (12 s) |
| Endpoint or method changes | None | None |

- **Keep nodes consistent behind one endpoint**, so `safe` doesn't jump back and forth. Note that Nimbus v26.6.0+ serves FCR by default, so a mixed fleet may already be inconsistent.
- **Watch CPU.** FCR adds work on every slot.

### Backwards compatibility

This is the question providers raise most.

**Our view:** for almost every application, FCR is the better choice than justification: it's much faster and very secure. We think applications should use either FCR or `finalized`; justification is an awkward middle ground, minutes slower than FCR without finality's economic guarantee.

**Why it still isn't a clean upgrade:** an application can take the latest justified block and add its own checks, for example accepting only a justification it saw before the next epoch started. Used that way, justification can be more secure than FCR in some settings: it tolerates a larger attacker, and needs the network to be in sync only for a short window (see [About justification](../evaluate/comparison#about-justification)). A provider may not know which customers do this, so it may not be able to decide for them which one `safe` should return.

What switching `safe` to FCR changes for customers, with every method and parameter the same:

- **`safe` returns a much newer block,** usually a few blocks behind the head instead of 32 or more. It's no longer an epoch checkpoint.
- **`safe` can still move backwards, in rare cases.** That was already true with justification (when a later justification on a competing branch replaces it), and it stays true with FCR (when FCR can't re-confirm its block, `safe` resets to the finalized block). Code that treats the highest `safe` it has seen as a point of no return should handle it either way.
- **Customers who build on justification lose it,** unless they get another way to read it.

**Options being worked on:**

- **A new endpoint or block tag for fast-confirmed blocks,** so `safe` can keep returning the justified block. We're investigating whether this can be done; it needs coordination across consensus and execution clients.
- **Dedicated nodes.** A provider can offer nodes with FCR on to customers who opt in, while shared endpoints keep `safe` as justified.

[Talk to us](/../#talk) if you're planning to offer FCR; we can share where each option stands.
