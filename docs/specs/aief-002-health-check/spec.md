# AIEF-002 — Configuration health check & layer-boundary tests

- **Status:** Draft
- **Date:** 2026-08-26
- **Foundation:** AIEF-000 v0.3.1
- **Change Level:** **L3** — adds a new module and a new command surface
- **Risk Flags:** `file-processing` (reads every governance artifact and every always-loaded instruction file)
- **Depends on:** AIEF-001 (composition), ADR-0005 (tool-bound intents default to advisory)

> Classification note per §20.1: declared before implementation. L3 rather than L2 because it introduces `src/audit/` as a new module boundary and a second CLI verb. Confined to one repository and revertible.

## 1. Problem

AIEF-Full requires two mechanisms that do not exist:

```text
F5  run a configuration health check on a defined cadence (§48)
F6  provide layer-boundary tests (§55)
```

Their absence is not cosmetic. Without F6, nothing prevents the exact failure this framework exists to prevent — stack or project knowledge accumulating in the universal layer. ADR-0005 records that this already happened, in the Foundation, undetected, and was found by accident while testing an unrelated command.

Without F5, governance artifacts decay silently: waivers approach expiry unnoticed, a Project Profile names a capability no selected stack provides, two rules restate the same intent under different identities.

The engine currently refuses `conformance: full` for exactly this reason. That refusal is honest, and it should become narrower rather than disappear.

## 2. Purpose

Deliver `aief health`: a read-only audit that reports the state of this repository's governance configuration and exits non-zero when a check fails.

The command answers one question — **is the configuration still telling the truth?**

## 3. Scope

```text
aief health [--verbose] [--foundation <path>]
```

Two families of check, from §48 and §55, in one report.

## 4. Out of scope

```text
AIEF-001 task 17   provider projection generator — H9 and L4 depend on it
AIEF-003           baseline, ratchet, adoption inventory (F7, §46)
AIEF-004           configuration audit from friction evidence (§47)
secret scanner     binding `secret_scan` means choosing a scanner, which is an
                   ADR-level decision carrying a supply-chain flag — not a side
                   effect of this work item
```

`audit/` reads. It never writes and never repairs. A checker that fixes what it finds cannot be trusted to report honestly, and repair belongs to a command the reader invoked deliberately.

## 5. Behaviour

`aief health` loads the same layers as `compose`, composes them, then applies the checks composition deliberately does not perform.

Each check reports one of four states:

```text
pass              the property holds
fail              the property is violated — exit non-zero
warn              attention, not a defect
not_implemented   declared, with its reason and the work item that closes it
```

**`not_implemented` is a first-class result, not an omission.** A health check that silently skips what it cannot do is the orphan-enforcement defect (§12.2) applied to itself. Every detection §48 and §55 require appears in the report, including the ones that are absent.

### 5.1 Health checks (§48)

| ID  | §48 item                                               | Implementation                                                                    |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| H1  | duplicate instructions                                 | two rules whose normalized intent text is identical                               |
| H2  | contradictory rules without a waiver                   | from composition (`UNWAIVED_CONTRADICTION`)                                       |
| H3  | oversized always-loaded context                        | total bytes of always-loaded instruction files against a project signal           |
| H4  | stale rules                                            | `not_implemented` — needs the §30.4 measurement data nothing collects yet         |
| H5  | expired waivers                                        | from composition, plus a warning for waivers expiring within 30 days              |
| H6  | orphan rules                                           | from composition (`ORPHAN_RULE`)                                                  |
| H7  | orphan enforcement                                     | from composition warnings (§12.2)                                                 |
| H8  | unused roles and skills                                | `not_implemented` — no role or skill artifact type exists yet (§29)               |
| H9  | provider projection drift                              | `not_implemented` — needs the generator, AIEF-001 task 17                         |
| H10 | Stack Profile binding drift                            | `not_implemented` — see §5.3                                                      |
| H11 | Project Profile references to unsupported capabilities | every capability named in `quality.capabilities` is supported by a selected stack |
| H12 | conformance claims not satisfied                       | from composition (`CONFORMANCE_UNMET`)                                            |

### 5.2 Layer-boundary tests (§55)

The banned vocabulary is **derived from the artifacts present**, never hardcoded. A hardcoded list goes stale the moment a stack or project is added, and would itself be project knowledge living in the engine.

| ID  | §55 item                 | Implementation                                                                              |
| --- | ------------------------ | ------------------------------------------------------------------------------------------- |
| L1  | Foundation contamination | `foundation/` must not contain any stack name, binding command, provider name or project id |
| L2  | Stack contamination      | a Stack Profile must not contain the project id or project name                             |
| L3  | Project leakage upward   | a Project Profile rule must address an existing Foundation rule, never invent one           |
| L4  | Provider truth drift     | `not_implemented` — needs the generator, AIEF-001 task 17                                   |

### 5.3 Why H10 is not implemented

Confirming that a binding command still exists means either executing it — which makes a read-only audit run arbitrary commands — or parsing an ecosystem's runner manifest, which puts stack knowledge in the engine. Both are worse than declaring the gap. A Stack Profile that wants this can expose its own self-check; that is a change to the Stack Profile contract, and it belongs to whichever work item first needs it.

## 6. Effect on conformance

F5 and F6 remain **unmet**, and the engine must keep refusing `conformance: full`. Six detections stay unimplemented after this work item, four of them behind one missing capability.

What changes is that the refusal becomes specific:

```text
F5  configuration health check — H4, H8, H9, H10 unimplemented
F6  layer-boundary tests — L4 unimplemented (AIEF-001 task 17)
F7  mechanical baseline monotonicity — AIEF-003
```

Narrowing an honest refusal is worth more than removing it. A framework that granted itself `full` on partial machinery would be the governance-that-lies defect, committed by the project that named it.

## 7. Acceptance criteria

```text
AC1   `aief health` exits 0 on this repository
AC2   every §48 and §55 item appears in the report with an explicit state
AC3   no check writes, moves or repairs any file
AC4   L1 fails when a stack name or binding command is planted in foundation/
AC5   L2 fails when the project id is planted in a Stack Profile
AC6   H1 fails when two rules share a normalized intent
AC7   H5 warns for a waiver expiring inside 30 days and fails once expired
AC8   H11 fails when the Project Profile names a capability no stack supports
AC9   the unmet-conformance message names the specific unimplemented checks
AC10  `npm run verify` includes `aief health` and stays exit 0
```

## 8. Verification

Unit tests over synthetic artifacts for every failing path, plus this repository as the passing case. A check that has never been observed to fail is an untested claim (§33).
