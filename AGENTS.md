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

| Concern                                | Location                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| Normative policy                       | `foundation/AIEF-000-foundation.md`                           |
| Addressable rule intents               | `foundation/rules/*.yaml` (ADR-0002)                          |
| Machine-readable contracts             | `schemas/*.json`                                              |
| Engine implementation                  | `src/{model,load,resolve,audit,projection,ratchet,emit,cli}/` |
| Repository-development utilities       | `scripts/`                                                    |
| Stack bindings                         | `stacks/<stack>/`                                             |
| Provider projection contracts          | `providers/<provider>/`                                       |
| Templates rendered into other projects | `templates/`                                                  |
| This repository's own parameters       | `.ai/project.yaml`, `.ai/waivers/`                            |
| Implementation specs                   | `docs/specs/`                                                 |
| Architecture decisions                 | `docs/adr/`                                                   |

## Commands

```text
npm run verify        format + lint + parity + test + compose. Run before claiming done.
npm test              86 tests
npm run compose       resolve this repository's own configuration
npm run health        §48 health checks and §55 layer-boundary tests, read-only
npm run render        project the composition into this file's managed region
npm run baseline      §46 ratchet. The only command that executes stack tooling.
npm run parity        ADR-0002: prose and rule sidecar must agree
node src/cli/index.js compose --verbose    per-rule modes, bindings and provenance
```

## Module boundaries

Dependencies point one way. `cli → {audit, projection, ratchet, emit} → resolve → load → model`.
Nothing depends on `cli/`.

`ratchet/` is the only module that may import `node:child_process`, and a test enforces that
(ADR-0006). `compose`, `health`, `render` and `init` spawn nothing.

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

<!-- aief:begin -->

_Generated by `aief render`. Everything between the markers is overwritten — edit the Foundation, the Stack Profile or the Project Profile instead (§6)._

Foundation **0.3.1** · conformance **core** · stacks `node`

## Enforced — 12 rule(s)

These are checked. Violating one fails a gate, not a review.

| Rule            | Intent                                                                                                                                          | Enforced by                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `AIEF-CORE-005` | A rule that is enforced, waived, referenced or baselined has a stable identity.                                                                 | `aief compose`                 |
| `AIEF-CORE-006` | A detected contradiction with no active waiver fails rather than warns.                                                                         | `aief compose`                 |
| `AIEF-CORE-007` | An enforced rule whose binding does not exist is an orphan rule and is a defect.                                                                | `aief compose`                 |
| `AIEF-CORE-009` | Every deviation is expressed as a visible, scoped, justified waiver.                                                                            | `aief compose`                 |
| `AIEF-CORE-010` | An expired waiver is a governance failure, not a grace period.                                                                                  | `aief compose`                 |
| `AIEF-CORE-013` | A capability the ecosystem cannot verify is declared unsupported rather than left silent.                                                       | `aief compose`                 |
| `AIEF-CORE-015` | An implementation satisfies every requirement of the conformance level it declares.                                                             | `aief compose`                 |
| `AIEF-CORE-019` | A Foundation rule whose enforcement depends on a stack tool defaults to advisory; only a layer that supplies the binding raises it to enforced. | `aief compose`                 |
| `AIEF-QUAL-013` | Source conforms to the ecosystem's formatter, so that diffs carry meaning rather than style noise.                                              | `npm run format:check`         |
| `AIEF-QUAL-014` | Source passes the ecosystem's linter.                                                                                                           | `npm run lint`                 |
| `AIEF-SEC-006`  | Dependencies are managed intentionally and scanned where the ecosystem supports it.                                                             | `npm audit --audit-level=high` |
| `AIEF-TEST-002` | A bug fix carries regression coverage, written failing first.                                                                                   | `npm test`                     |

## Commands the gates run

```text
npm audit --audit-level=high  # dependency_audit
npm run format:check  # format
npm run lint  # lint
npm test  # test
```

## Advisory — 52 rule(s)

Not enumerated here on purpose: an always-loaded file spends context on every line it carries (§13). Run `aief compose --verbose` for the full list.

- `AIEF-CORE` — 11
- `AIEF-FLOW` — 14
- `AIEF-QUAL` — 13
- `AIEF-SEC` — 7
- `AIEF-TEST` — 7

<!-- aief:end -->
