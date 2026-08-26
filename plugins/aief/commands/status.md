---
description: Report what this repository's AIEF configuration actually enforces, and where it is drifting
allowed-tools: Bash(npx aief*), Bash(aief*), Read
---

Report the governance state of this repository. Run the engine rather than reading the
configuration and inferring — the whole point of the engine is that inference is where the
lying starts.

```bash
aief compose && aief health && aief render --check && aief baseline
```

If `aief` is not on PATH, try `npx aief`. If the Foundation cannot be resolved, the error names
every path it tried; pass `--foundation <path>` rather than guessing.

Then summarise for the reader, in this order:

1. **What is enforced** — the count, and what backs each one. A rule enforced by the engine and
   a rule enforced by a stack command are different guarantees and should not be reported as
   one number.
2. **What failed** — each governance failure with its code and the artifact named. These block.
3. **What is advisory and why** — specifically, whether anything is advisory because no binding
   exists. That is the honest gap, and it is the one people forget they have.
4. **Active waivers** — and how long each has left. A waiver inside its last month is about to
   become a build failure.
5. **Declared gaps** — the health checks reporting `not implemented`, with their reasons.

Do not present a passing run as "everything is fine". A configuration can pass every check it
has while checking very little; say how much is actually being checked.

If any command exits non-zero, report the failure and stop. Do not offer to fix governance
failures in the same breath as reporting them — the reader decides whether a rule is wrong or
the code is.
