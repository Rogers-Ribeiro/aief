# ADR-0004 — JSON Schema as the published governance contract

- **Status:** Accepted
- **Date:** 2026-08-26
- **Change Level:** L2
- **Risk Flags:** supply-chain (adds a dependency)

## Context

Governance artifacts — rules, waivers, Project Profiles, Stack Profiles — are validated today
by hand-written JavaScript in `src/model/schema.js`. That works for this engine, and only for
this engine.

AIEF's portability goal (§54) requires the format to be usable from projects that will never
run this engine. A Java or .NET repository should be able to validate its own Project Profile
in CI without installing Node, and a second implementation should be able to agree with this
one on what a valid artifact is.

A prose description of the format cannot settle disagreements between implementations. A
schema can.

The counter-pressure is real: a schema that nothing validates is decorative, and decorative
governance artifacts are exactly what §12 exists to detect. Publishing schemas without wiring
them into a check would reproduce the defect this project criticises.

## Decision

Publish the governance contracts as **JSON Schema (draft 2020-12)** under `schemas/`, and
validate this repository's real artifacts against them on every `npm run verify` and in CI.

The schemas are **generated from the same model the engine enforces**, not authored
independently — a second hand-written definition would drift from the first.

`ajv` is added as the second and, for now, final runtime dependency. Per the Definition of
Done, a dependency requires its own decision; this is it.

Division of responsibility:

- **JSON Schema** — the published, language-neutral shape of an artifact.
- **`src/model/schema.js`** — the same shape plus the semantic checks a schema cannot express,
  such as "a capability declared supported must carry a binding command" (AIEF-CORE-013).

## Consequences

**Positive**

- The format becomes checkable from any ecosystem with a JSON Schema validator.
- A second implementation has something to conform to rather than something to interpret.
- The zip-supplied schemas that diverged from the model are replaced by generated ones, so
  divergence becomes impossible rather than merely discouraged.

**Negative**

- A second dependency, and with it a supply-chain surface on the verification path.
- Two artifacts describe overlapping truth. Mitigated by generating one from the other and by
  validating real artifacts against both.
- JSON Schema cannot express the conditional rules that matter most, so it is necessary but
  not sufficient — which must stay visible or people will assume schema-valid means valid.

## Alternatives Considered

| Alternative                                           | Rejected because                                                                                                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keep JavaScript validators only**                   | Makes the format unusable outside Node, which contradicts the portability goal that justifies the whole three-layer model.                                                                |
| **Adopt the zip's schemas as authored artifacts**     | They diverge from the model: no `enforcement_category`, no `section`, no `conformance`, and `mode` missing `off`. Our own rules fail them. Authored schemas drift; generated ones cannot. |
| **Publish schemas without validating against them**   | A contract nothing checks is the orphan-enforcement defect (§12.2) wearing a different hat.                                                                                               |
| **Write a validator by hand instead of adding `ajv`** | Reimplementing a specification is more supply-chain risk, not less, and it would be the second hand-written definition this ADR exists to avoid.                                          |

## Trigger to Revisit

- A third artifact type needs validation and the generated schemas stop being expressive enough.
- `ajv` becomes unmaintained, or the dependency count required by the engine grows beyond a
  small auditable set.
- A second AIEF implementation appears and reports that the schemas are ambiguous in practice.
