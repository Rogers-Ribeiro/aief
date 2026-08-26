# AIEF-003 — Tasks

## Status — 2026-08-26

| Task                                | State | Evidence                                                           |
| ----------------------------------- | ----- | ------------------------------------------------------------------ |
| 1 ADR-0006 execution boundary       | done  | one verb, Stack Profiles only, declared not inferred, no shell     |
| 2 `identities` in the Stack Profile | done  | schema, JSON Schema, and the node profile's eslint binding         |
| 3 `src/ratchet/` module             | done  | the only module importing `node:child_process`, asserted by a test |
| 4 Violation identity                | done  | `capability :: file :: rule :: message`, line deliberately absent  |
| 5 Comparison by identity            | done  | one-for-one swap fails; count comparison would have passed         |
| 6 `.ai/baseline.json`               | done  | deterministic, sorted, no timestamp                                |
| 7 §46.2 write guard                 | done  | growing the baseline needs a waiver naming each added identity     |
| 8 `aief baseline` verb              | done  | `npm run baseline`, wired into `npm run verify` and CI             |
| 9 §46.4 report in `aief health`     | done  | H13, read from the baseline — `health` still executes nothing      |
| 10 Tests                            | done  | 13 ratchet tests, including both ADR-0006 safety constraints       |

Verification, 2026-08-26:

```text
npm run verify          exit 0
parity ok — 64 rules across 64 specification sections
schemas ok — 6 contracts published and satisfied by this repository
tests 86 · pass 86 · fail 0
compose  64 rules · 12 enforced · 52 advisory · 0 off · 0 waived
health   14 pass · 0 fail · 0 warn · 3 not implemented
```

## Observed working against real data

The ratchet was exercised on this repository, not only on fixtures. With a baseline recorded
and one unused variable introduced into `scripts/check-parity.js`:

```text
0 remaining  ·  1 new  ·  0 resolved
  FAIL lint    0 remaining, 1 new, 0 resolved
       + lint :: scripts/check-parity.js :: no-unused-vars :: 'unusedOnPurpose' is assigned a value but never used.

1 new violation(s). Existing debt may be baselined; new debt must not make the baseline worse (§46).
```

`--write` then refused to absorb it, naming the identity and pointing at §46.2. The violation
was reverted.

## Conformance after this work item

```text
F5  partial — H4, H8 and H10 remain
F6  complete
F7  implemented where a Stack Profile declares violation identities
```

F7 is deliberately phrased as a capability, not a blanket claim. The node profile names
identities for `lint` only; `format`, `test` and `dependency_audit` report as **unmeasurable**
rather than as zero, because a silent zero is how a ratchet comes to guard nothing (§46.5).

`conformance: full` is still refused, and F5 is now the only thing refusing it. F6 and F7 were
removed from the engine’s unmet-requirement list when they landed: listing a satisfied
requirement as a blocker is the same defect as claiming an unsatisfied one.

## Not done

- **`aief adopt`** — repository inventory and convention extraction (§45). Split out as
  AIEF-004 in spec §4: the ratchet is mechanical and finishable, inventory is heuristic, and
  shipping them together would let the heuristic half borrow the mechanical half's credibility.
- **Identity formats beyond `eslint-json`.** One parser, because one stack binds one tool.
  A second arrives with the first stack that needs it.
- **AC9 wording.** H13 reports accepted debt from the baseline; new and resolved counts come
  from `aief baseline`, which is the verb allowed to measure. §46.4 asks for all three "on
  every run" — read strictly, that would require `health` to execute, which ADR-0006 forbids.
  The split is deliberate and is the one place this work item does not satisfy §46 literally.
