# Glossary

### Attestation

A validator's signed message naming the block it sees as the head of the chain.

### Epoch

32 slots, about 6.4 minutes. Every validator attests once per epoch.

### False confirmation

A block FCR fast-confirmed that then left the chain: a fast-confirmed block that was reorged. A one-year replay of mainnet through the clients' FCR code found none ([Security](../evaluate/security#mainnet-track-record)).

### Fast-confirmed

A block FCR has confirmed: under its assumptions, it won't be reorged. Returned by the `safe` tag.

### Finalized

A block two-thirds of stake has locked in. Reverting it would burn at least a third of all staked ETH. Takes about two epochs (~13 minutes).

### Head

The latest block a node sees. It can still be reorged.

### Reorg

When the chain switches to a different branch, and blocks a node had seen are replaced.

### `safe` tag

An execution JSON-RPC block tag. With FCR on, it returns the latest fast-confirmed block.

### Slot

12 seconds. At most one block is proposed per slot.
