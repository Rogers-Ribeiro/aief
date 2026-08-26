# ADR-0005 — A tool-bound intent defaults to advisory

- **Status:** Accepted
- **Date:** 2026-08-26
- **Change Level:** L3
- **Risk Flags:** governance-semantics (changes the resolved mode of five Foundation rules)

## Context

`aief init --id probe --stack node --yes` followed by `aief compose` produced a repository
that failed its own gates on the first run:

```text
62 rules  ·  12 enforced  ·  50 advisory  ·  0 off  ·  0 waived

  FAIL [ORPHAN_RULE] "AIEF-SEC-001" is enforced but no selected Stack Profile
  supports "secret_scan".
```

This contradicts §43 step 11 and AIEF-001 spec §6.1: init must leave the repository passing
the gates it just installed.

The immediate cause was that the Foundation declared `AIEF-SEC-001` as `default_mode: enforced`
while the node Stack Profile declares `secret_scan: supported: false`. This repository composed
only because it carried a waiver; a project created by `init` carries none.

The underlying cause is worse, and is the reason this ADR exists rather than a bug fix.

Five Foundation rules — `AIEF-QUAL-013`, `AIEF-QUAL-014`, `AIEF-SEC-001`, `AIEF-SEC-006`,
`AIEF-TEST-002` — declared `enforced` with tool-bound enforcement categories. Four of them
resolved cleanly, but only because the node profile happens to bind format, lint, test and
dependency audit. The Foundation was not stating a universal truth; it was **guessing which
bindings exist**, and it guessed from the one Stack Profile that exists today.

That is stack knowledge encoded in the universal layer — precisely the contamination §55 and
conformance requirement C8 exist to prevent. A Java profile without a formatter binding would
have produced the identical orphan for `AIEF-QUAL-013`. Secrets were not a special case; they
were simply the first capability the node profile did not bind.

## Decision

**A Foundation rule whose enforcement depends on a stack tool declares `default_mode: advisory`.
The layer that supplies the binding is the layer entitled to raise the mode.**

Recorded normatively as §8.5, addressable as `AIEF-CORE-019`, and enforced by the engine at
artifact-validation time: `validateRule` rejects a Foundation rule that pairs `enforced` with a
category in `TOOL_BOUND`. The check runs before composition, so a contaminated Foundation cannot
be loaded at all.

Consequences in this repository:

- the five rules become advisory in `foundation/rules/`;
- `stacks/node/profile.yaml` gains a rule overlay raising the four it actually binds;
- `.ai/waivers/secret-scanning.yaml` is deleted — with `AIEF-SEC-001` honestly advisory, the
  waiver waived nothing, and a waiver that changes no outcome is the decorative-governance
  defect this project names in §12;
- `TOOL_BOUND` moves from `src/resolve/` to `src/model/`, since validation and resolution both
  need it and the dependency direction is `resolve → model`.

Enforced-rule counts are unchanged for this repository: seven engine-enforced, four raised by
the node stack, plus `AIEF-CORE-019` itself.

## Consequences

**Positive**

- `aief init` produces a repository that composes cleanly, verified by `test/init.test.js`
  rather than asserted in prose.
- The Foundation no longer encodes an assumption about which stacks exist.
- A new Stack Profile can be added without auditing the Foundation for rules it fails to bind.
- Enforcement strength now grows with real capability instead of being declared up front and
  eroded by waivers.

**Negative**

- A project on a stack that binds nothing gets an all-advisory configuration, which is honest
  but weaker than a reader might assume from "AIEF-Core". §12.2 orphan-enforcement reporting
  and the AIEF-002 health check are what surface that.
- Every Stack Profile now carries the responsibility to raise the rules it binds. Forgetting to
  is silent, because an unraised advisory rule breaks nothing. The §12.2 warning covers the
  inverse case only — a capability with no rule — so this gap is real and belongs to AIEF-002.
- The secret-scanning gap loses its expiry date. It was time-boxed by the waiver; it is now
  tracked only by AIEF-002.

## Alternatives Considered

| Alternative                                                    | Rejected because                                                                                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Make `init` emit a starter waiver for unbindable rules**     | Teaches waiving as the normal bootstrap step and puts a deviation record in a repository that has not deviated from anything.                                          |
| **Keep the rules enforced; have `init` fail loudly with help** | Still hands the reader a red gate on commit one, and still leaves the Foundation guessing at bindings — it makes the symptom articulate without treating the cause.    |
| **Auto-promote advisory rules when a binding is found**        | Implicit, and it removes the provenance record that makes the Effective Configuration auditable. An explicit stack overlay states who raised the mode and can be read. |
| **Treat only `AIEF-SEC-001` as the defect**                    | The other four are the same defect passing by luck. Fixing one would have left the Foundation contaminated and the next Stack Profile would have rediscovered it.      |

## Trigger to Revisit

- A Stack Profile forgets to raise a rule it binds and the omission reaches production, which
  would argue for detecting unraised-but-bindable rules as a third orphan class in §12.
- Conformance levels grow a notion of minimum enforced coverage, making an all-advisory
  configuration a conformance failure rather than an honest report.
