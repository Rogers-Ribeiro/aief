# AIEF — AI Engineering Foundation

A provider-neutral engineering governance system for software built with AI coding agents.

It separates three kinds of knowledge that otherwise collapse into one unreusable file:

```text
FOUNDATION       how we work with agents        universal
    ↓ specializes
STACK PROFILE    how a rule is verified here    per ecosystem
    ↓ parameterizes
PROJECT PROFILE  what is true about this system per repository
```

Provider integrations are not a fourth layer. They are projections of the composed configuration, never independent policy sources.

## Status

|            |                                      |
| ---------- | ------------------------------------ |
| Foundation | **v0.3.1** — implementation baseline |
| Engine     | **AIEF-001** — not yet implemented   |

## Layout

```text
foundation/     normative specification (AIEF-000)
docs/adr/       architecture decision records
docs/specs/     work items: spec → plan → tasks
```

Directories appear when they have content. Nothing here is created speculatively — the specification says so, so the repository has to mean it.

## Conformance

Two levels, so that "this project follows AIEF" is a checkable claim rather than a declaration of intent:

- **AIEF-Core** — three layers, allocation test, intent/binding/parameters, verification evidence, change classification, visible waivers, clean layer separation, no load-bearing personal configuration, baseline-and-ratchet adoption.
- **AIEF-Full** — Core plus inspectable Effective Configuration, stable rule identity, orphan detection, failure on unwaived contradictions, health checks, layer-boundary tests, mechanical baseline monotonicity.

## Start here

- `foundation/AIEF-000-foundation.md` — the specification
- `docs/specs/aief-001-init-composition-engine/spec.md` — the next work item
- `docs/adr/0001-engine-runtime-and-distribution.md` — why the engine is what it is
