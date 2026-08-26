# AIEF-001 — Tasks

Each task is one commit. Each begins with a failing test. A task is done when its verification command passes and its output is reported as evidence (§33).

| #   | Task                                                                                                                                                                                                                               | Verification                                                                                  | Closes        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------- |
| 0   | **Verify the runtime premise.** Confirm Node availability across the installation paths of both target providers, on Windows at minimum. Record the finding in ADR-0001. If it fails, stop and revisit the ADR before writing code | Recorded finding                                                                              | ADR-0001 risk |
| 1   | Repository skeleton: Node ESM, test runner, lint, formatter, CI matrix on three platforms                                                                                                                                          | `test`, `lint` green on all three                                                             | AC13          |
| 2   | `model/` — schemas and validators for Rule, Waiver, StackProfile, ProjectProfile                                                                                                                                                   | Unit tests: valid accepted, each invalid field rejected with a named error                    | —             |
| 3   | **ADR-0002**, then `foundation/rules/*.yaml` sidecar plus the parity check that every prose rule has a sidecar entry and vice versa                                                                                                | Parity check fails on a deliberately removed entry                                            | §10           |
| 4   | **ADR-0003**, then `load/` — read Project Profile, resolve the referenced Foundation version offline, load Stack Profiles and Waivers                                                                                              | Fixture repositories; unknown profile and unresolvable version both fail with named artifacts | —             |
| 5   | `resolve/` step 5–6: index by ID, apply precedence (§11.3), record overrides                                                                                                                                                       | Project rule beats Stack rule; override visible; duplicate ID within a layer fails            | AC6           |
| 6   | `resolve/` provenance: every resolved rule carries origin layer and artifact                                                                                                                                                       | Every rule in the output has a non-empty provenance chain                                     | AC5           |
| 7   | `resolve/` waivers: apply, reject unknown `rule_id`, reject expired                                                                                                                                                                | Two failing cases named in the message                                                        | AC7, AC8      |
| 8   | `resolve/` binding: bind intents to Stack capabilities; enforced-without-binding fails                                                                                                                                             | Orphan-rule failure names rule and profile                                                    | AC9           |
| 9   | `resolve/` capability integrity: `supported: true` with no binding fails                                                                                                                                                           | Failure names the capability                                                                  | AC10          |
| 10  | `resolve/` contradiction detection; unwaived contradiction fails, waived passes                                                                                                                                                    | Both paths tested                                                                             | §11.2         |
| 11  | `emit/` — materialize Effective Configuration; `core` resolves without materializing, `full` materializes                                                                                                                          | Both levels asserted                                                                          | AC11          |
| 12  | `emit/` determinism: identical inputs produce byte-identical output                                                                                                                                                                | Property test over input ordering                                                             | AC12          |
| 13  | `cli/compose` over the resolver                                                                                                                                                                                                    | Smoke test on a fixture repository                                                            | —             |
| 14  | `cli/init` — bootstrap per §43, refuse where a Project Profile exists, create nothing empty                                                                                                                                        | Three tests: success, refusal naming AIEF-003, no empty artifacts                             | AC1, AC2, AC3 |
| 15  | `cli/init` show-before-write with an explicit non-interactive mode that refuses unversioned governance files                                                                                                                       | Confirmation required; non-interactive refusal asserted                                       | AC4           |
| 16  | Stack Profile **node**, with real bindings for format, lint, typecheck and test                                                                                                                                                    | Composes against the AIEF repository itself                                                   | —             |
| 17  | Provider projection **Claude Code**, documented against the §39 adapter contract                                                                                                                                                   | Projection reproducible from composed source                                                  | §55.4         |
| 18  | **Dogfooding:** AIEF's own Project Profile, including the module-boundary parameter from plan §2, composing in CI                                                                                                                  | `compose` green in CI on all three platforms                                                  | AC14          |

## Sequencing

Tasks 0–4 are prerequisites. Tasks 5–10 are the resolver and may proceed in order without interruption. Tasks 11–12 depend on the resolver being complete. Tasks 13–15 are the CLI. Tasks 16–18 are the dogfooding proof and are the acceptance gate for the work item.

Task 0 is first for a reason: it can invalidate ADR-0001, and discovering that after task 15 would waste the entire CLI layer.

## Definition of Done for AIEF-001

Beyond the standing Definition of Done (§49):

```text
all 14 acceptance criteria demonstrated by an automated test
every failure path in spec §5.3 has a test asserting the failure and its message
ADR-0002 and ADR-0003 written and accepted
the AIEF repository composes its own configuration in CI on three platforms
no dependency added beyond the YAML parser without its own recorded decision
```

---

## Status — 2026-08-26

| Task                          | State       | Evidence                                                          |
| ----------------------------- | ----------- | ----------------------------------------------------------------- |
| 0 Verify runtime premise      | done        | `node v24.13.0`, `codex-cli 0.148.0`; recorded in ADR-0001        |
| 1 Repository skeleton         | done        | `npm run verify` exit 0 locally; CI workflow written              |
| 2 `model/`                    | done        | 13 schema tests                                                   |
| 3 ADR-0002 + sidecar + parity | done        | `parity ok — 63 rules`; the check found 4 real gaps on first run  |
| 4 ADR-0003 + `load/`          | done        | resolves via `workspace`, no network                              |
| 5–10 `resolve/`               | done        | 16 resolver tests                                                 |
| 11–12 `emit/`                 | done        | 7 emit tests, determinism included                                |
| 13 `cli compose`              | done        | `npm run compose`                                                 |
| 14–15 `cli init`              | done        | 4 end-to-end tests in a temporary directory (`test/init.test.js`) |
| 16 Stack Profile `node`       | done        | binds format, lint, test, dependency_audit and raises those rules |
| 17 Provider projection        | **partial** | §39 contract documented; the projection generator is not built    |
| 18 Dogfooding                 | **partial** | composes locally; the three-platform CI matrix has never run      |

### Defect found and fixed after the first status entry

`init` produced a repository that failed `compose` on its first run — `ORPHAN_RULE` for
`AIEF-SEC-001` — contradicting AC1, §43 step 11 and this spec's §6.1. The cause was the
Foundation declaring tool-bound rules `enforced` without any way to know whether a binding
existed. Recorded in ADR-0005, corrected as §8.5 / `AIEF-CORE-019`, and now covered by
`test/init.test.js`, which bootstraps a temporary directory and composes it.

The lesson is about the acceptance criteria, not the bug: AC1 was marked satisfied on the
strength of the code paths existing. It was only false once someone ran it.

### Not verified

- **AC13 (three platforms).** The CI matrix exists but has not executed — there is no remote. Verified on Windows only.
- **AC4 interactive confirmation.** Implemented as an explicit `--yes` flag rather than a TTY prompt, which is what makes it testable. A real prompt is untested.
