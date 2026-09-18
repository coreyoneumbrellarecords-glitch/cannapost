---
name: Credential migration races
description: Concurrency rule for lazily upgrading stored secrets from plaintext to encrypted values.
---

Lazy plaintext-to-ciphertext credential migration must condition each update on the exact plaintext value that was read, then re-read if the conditional update loses a race.

**Why:** An update constrained only by the record owner can overwrite a newer credential saved concurrently with encryption of the stale plaintext value.

**How to apply:** For any read-triggered secret migration, use compare-and-swap or a locked transaction; never write a stale credential based only on its owner or row ID.