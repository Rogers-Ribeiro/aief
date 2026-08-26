# AIEF-001 — Init & Composition Engine

- **Status:** Draft
- **Date:** 2026-08-26
- **Foundation:** AIEF-000 v0.3.1
- **Change Level:** **L3** — introduces a new system boundary
- **Risk Flags:** `supply-chain` (third-party dependencies), `file-processing` (reads and writes repository configuration)
- **ADR:** ADR-0001 (engine runtime and distribution)

> Classification note per §20.1: declared before implementation. L3 rather than L4 because every effect is confined to one repository and is revertible by reverting the commit. Governance configuration carries a floor of L2 (§20.3); the new boundary raises it to L3.

## 1. Problem

AIEF-000 defines three knowledge layers, an allocation test, and a composition model. None of it is executable. Today a project can _describe_ conformance but cannot _resolve_ what rules actually apply to it, and nothing prevents the layers from being mixed — which is the failure the Foundation exists to prevent.

Without an engine, AIEF is a document about avoiding documents that nothing verifies.

## 2. Purpose

Deliver the smallest executable core that makes AIEF real:

- **init** — bootstrap a repository onto a referenced Foundation version.
- **compose** — resolve Foundation + Stack Profile(s) + Project Profile + active Waivers into the applicable configuration, with provenance.

## 3. Scope

```text
aief init      bootstrap a repository (§43)
aief compose   resolve the applicable configuration (§9)
```

Supporting deliverables:

- Project Profile schema and loader (§41)
- Stack Profile contract, schema and loader (§40)
- Waiver schema and loader (§31)
- Provenance model: every resolved rule reports its origin layer
- Conformance level handling: `core` resolves and traces; `full` materializes (§4)
- One Stack Profile, chosen by the first real consumer
- Provider projection for one provider, chosen by the first real consumer

## 4. Out of scope

Deferred to later work items, and deliberately not built now (§27, §29):

```text
AIEF-002  health check: orphan detection, contamination tests, conformance audit
AIEF-003  adopt: inventory, convention extraction, baseline, ratchet
AIEF-004  configuration audit from friction evidence
```

`compose` must not grow health-checking behaviour. Resolving and judging are different jobs, and merging them makes both harder to test.

## 5. Behaviour

### 5.1 `aief init`

Follows §43. Refuses to run against a repository that already has a Project Profile, and points at AIEF-003 when the repository has existing content but no profile.

Writes only artifacts that have content (§29). Never creates empty rule directories, unused role files, or provider directories for providers not in use.

Shows the proposed changes before writing (§38), because everything it writes is governance configuration.

### 5.2 `aief compose`

Reads the Project Profile, resolves the referenced Foundation version and selected Stack Profiles, applies active Waivers, and produces the applicable configuration.

Resolution obeys the precedence order in §11.3. Overrides are recorded, never silently dropped.

Conformance-dependent output:

| Level  | Behaviour                                                                      |
| ------ | ------------------------------------------------------------------------------ |
| `core` | Applicable configuration is resolvable and traceable; materialization optional |
| `full` | Effective Configuration MUST be materialized as an inspectable artifact (§9)   |

### 5.3 Failure behaviour

The engine fails, rather than warns, when:

- a rule referenced by a waiver does not exist;
- a waiver has expired (§31.5);
- an enforced rule has no binding in any selected Stack Profile (§12.1);
- two rules contradict with no active waiver (§11.2);
- the declared conformance level requires a capability the implementation does not provide (§4.3);
- a Stack Profile declares a capability `supported: true` with no binding behind it (§40.1).

Warnings are reserved for signals (§50), never for governance defects.

## 6. Acceptance criteria

```text
AC1   `init` on an empty repository produces a Project Profile that `compose` resolves without error.
AC2   `init` refuses to run where a Project Profile already exists, and names AIEF-003.
AC3   `init` creates no artifact that has no content.
AC4   `init` shows every proposed write and requires confirmation before writing.
AC5   `compose` reports, for every resolved rule, its origin layer and the artifact it came from.
AC6   A Project rule overriding a Stack rule wins, and the override is visible in the output.
AC7   An expired waiver fails composition with a message naming the waiver and its rule.
AC8   A waiver referencing an unknown rule ID fails composition.
AC9   An enforced rule with no binding in any selected Stack Profile fails as an orphan rule.
AC10  A Stack Profile declaring `supported: true` with no binding fails.
AC11  `conformance: core` resolves without materializing; `conformance: full` materializes.
AC12  Composition is deterministic: identical inputs produce byte-identical output.
AC13  The engine runs on Windows, macOS and Linux from the same source with no platform branch.
AC14  The AIEF repository governs itself: its own Project Profile composes cleanly in CI.
```

AC14 is the real test. A governance engine that does not govern its own repository is an untested claim (§44).

## 7. Constraints

- Node ESM, per ADR-0001.
- Dependency budget: one YAML parser. Any addition is a separate decision with its own justification (§27).
- No network access at composition time. A referenced Foundation version resolves from a local cache or an explicit path; resolution strategy is part of the plan.
- The engine never writes outside the repository it is invoked in.
- The engine never edits authored content — only generated artifacts, which are marked as such (§42).

## 8. Risks

| Risk                                                                    | Mitigation                                                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `compose` accretes health-check responsibilities and becomes untestable | Out-of-scope list in §4 is normative for this work item; failures listed in §5.3 are resolution failures, not audits |
| Node unavailable in a target repository                                 | Verification task in `tasks.md`; ADR-0001 revisit trigger                                                            |
| Schemas churn once a second Stack Profile appears                       | Only one Stack Profile is built now; the contract is validated against the second one before it is frozen            |
| Provenance is designed but never used, becoming speculative structure   | AC5 makes it observable in the primary output path, not an optional flag                                             |
| Show-before-write becomes friction in CI                                | Non-interactive mode is explicit and refuses to run against unversioned governance files                             |
