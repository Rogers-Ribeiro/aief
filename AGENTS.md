# AGENTS.md — AIEF

This repository implements the AI Engineering Foundation, and is governed by it.
The normative specification is `foundation/AIEF-000-foundation.md`.

Conformance declared in `.ai/project.yaml`: **core**.

## Non-negotiable rules

1. Foundation, Stack Profiles and Project Profiles are the only policy layers.
2. Provider files are projections. A rule that exists only in a provider file is a defect.
3. Apply the allocation test (§7) before adding any governance artifact.
4. Split a cross-layer rule into Intent, Binding and Parameters (§8).
5. Keep stack, project and provider detail out of `foundation/`.
6. Create nothing speculatively. No directory, rule, template or file without a current consumer.
7. Search before creating a new abstraction, rule, schema, command or capability.
8. A rule marked `enforced` must have something that actually enforces it. Otherwise it is `advisory` — say so honestly.
9. Governance changes are at least L2 and use show-before-write.
10. Never invent an external API or provider behaviour. Verify against the installed version.
11. Never report completion without the command, its exit status and its real output.
12. Minimal coherent diff. No drive-by refactors.
13. Adding a dependency requires its own ADR.
14. If implementation evidence contradicts AIEF-000, record the finding before changing the Foundation.

## Where things belong

| Concern                                | Location                                   |
| -------------------------------------- | ------------------------------------------ |
| Normative policy                       | `foundation/AIEF-000-foundation.md`        |
| Addressable rule intents               | `foundation/rules/*.yaml` (ADR-0002)       |
| Machine-readable contracts             | `schemas/*.json`                           |
| Engine implementation                  | `src/{model,load,resolve,audit,emit,cli}/` |
| Repository-development utilities       | `scripts/`                                 |
| Stack bindings                         | `stacks/<stack>/`                          |
| Provider projection contracts          | `providers/<provider>/`                    |
| Templates rendered into other projects | `templates/`                               |
| This repository's own parameters       | `.ai/project.yaml`, `.ai/waivers/`         |
| Implementation specs                   | `docs/specs/`                              |
| Architecture decisions                 | `docs/adr/`                                |

## Commands

```text
npm run verify        format + lint + parity + test + compose. Run before claiming done.
npm test              62 tests
npm run compose       resolve this repository's own configuration
npm run health        §48 health checks and §55 layer-boundary tests, read-only
npm run parity        ADR-0002: prose and rule sidecar must agree
node src/cli/index.js compose --verbose    per-rule modes, bindings and provenance
```

## Module boundaries

Dependencies point one way. `cli → {audit, emit} → resolve → load → model`. Nothing depends
on `cli/`.

`resolve/` composes. It does not audit. `audit/` reads a composition and judges it, and never
writes: a checker that repairs what it finds cannot be trusted to report honestly. Baseline
comparison is neither, and belongs to AIEF-003.

## Traps specific to this repository

**Adding a rule costs two edits.** A rule lives in the prose _and_ in `foundation/rules/`.
`npm run parity` fails if they disagree. That is the cost of ADR-0002, accepted deliberately.

**`enforced` is a claim about the code.** The engine enforces exactly the rule IDs listed in
`ENGINE_ENFORCED` in `src/resolve/index.js`. Adding an ID there is a claim that must be backed
by a code path and a test. Everything else that is enforced must bind to a stack capability.

**A Foundation rule with a tool-bound category cannot default to `enforced`** (§8.5, ADR-0005).
The Foundation cannot see bindings, so the Stack Profile that supplies the command is the layer
that raises the mode. `validateRule` rejects the alternative before composition runs.

**A capability declared `supported: true` needs a real command.** Declaring a gap is
information; leaving it silent produces an orphan rule.

**This repository resolves its own Foundation from `foundation/`** — the workspace strategy in
ADR-0003. That is why self-hosting needs no bootstrap special case.

## Current target

`AIEF-002 — Configuration health check & layer-boundary tests` is delivered;
`AIEF-001` remains open on task 17, the provider projection generator, which is also what
blocks health checks H9 and L4.

Status in `docs/specs/aief-001-init-composition-engine/tasks.md` and
`docs/specs/aief-002-health-check/tasks.md`.

Do not build provider adapters or stack profiles beyond what the open work item requires.

## Definition of Done

```text
acceptance criteria satisfied
npm run verify green, with output pasted as evidence
new dependency, if any, has an ADR
generated artifacts reproducible; no authored file overwritten
no unrelated changes
checks that could not be run are disclosed with reasons
```
