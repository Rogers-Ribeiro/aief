# AIEF-001 — Plan

## 1. Approach

Build the resolver first, the commands second. Composition is the only part with real logic; `init` and `compose` are thin entry points over it. Building the CLI first would mean testing the logic through an interface that exists to be convenient rather than to be verified.

Dogfooding drives the choice of first profiles. AC14 requires the AIEF repository to compose its own configuration, and the AIEF repository is a Node project — so the first Stack Profile is **node**, justified by an immediate consumer rather than by guessing which stack matters most (§29, §59). The first provider adapter is **Claude Code**, for the same reason. Codex follows once the projection interface has survived one real implementation.

## 2. Module boundaries

```text
src/
├── model/          schemas and types: Rule, Waiver, StackProfile, ProjectProfile
├── load/           read and validate artifacts from disk
├── resolve/        composition: precedence, provenance, waivers, failures
├── emit/           Effective Configuration materialization, provider projections
├── cli/            init, compose
└── foundation/     resolve a referenced Foundation version to rule intents
```

Dependency direction is one-way: `cli → emit → resolve → load → model`. `foundation/` is reachable from `load/` only. Nothing depends on `cli/`.

This boundary is itself an AIEF parameter and is enforced in the repository's own Project Profile, which is the cheapest possible proof that the model works.

## 3. Data shapes

The Foundation is Markdown, not data. Rule intents must therefore be extractable without turning the spec into a database.

**Decision:** rule intents live in a machine-readable sidecar within the Foundation distribution — `foundation/rules/*.yaml` — carrying `id`, `intent`, `default_mode`, `enforcement_category`. The prose specification remains the normative explanation; the sidecar is the addressable form. A rule present in one and absent from the other is a Foundation defect, checked in the AIEF repository's own CI.

This avoids parsing prose, and it makes §10 stable identity real rather than aspirational.

```text
Rule          id · intent · origin_layer · origin_artifact · mode · binding? · scope? · parameters?
Waiver        rule_id · scope · reason · owner · created_at · expires_at? · tracking_ref? · risk?
StackProfile  name · version · capabilities{supported, command?} · signals{} · rules[]
ProjectProfile project · foundation{version, conformance} · stacks[] · risk_flags · quality · governance
Resolved      rule + provenance chain + effective mode + applied waiver?
```

## 4. Resolution algorithm

```text
1. Load Project Profile.                          fail on schema violation
2. Resolve referenced Foundation version.         fail if unresolvable
3. Load selected Stack Profiles.                  fail on unknown profile
4. Load Waivers.                                  fail on expired or unknown rule_id
5. Index all rules by ID.                         fail on duplicate ID within a layer
6. Apply precedence per §11.3.                    record every override
7. Bind intents to Stack capabilities.            fail on enforced-without-binding
8. Detect contradictions.                         fail when unwaived
9. Apply waivers.                                 record scope and expiry
10. Emit according to conformance level.
```

Every step that can fail produces a message naming the artifact, the rule ID and the layer. A governance failure that does not say where it came from costs more than it saves.

## 5. Verification strategy

| Target               | Approach                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `model/`, `resolve/` | Unit tests, no filesystem. This is where most tests live                                            |
| `load/`              | Fixture repositories on disk, real reads                                                            |
| `emit/`              | Snapshot tests against materialized output; AC12 determinism is a property test over input ordering |
| `cli/`               | Thin smoke coverage only                                                                            |
| Cross-platform       | CI matrix on Windows, macOS and Linux — AC13                                                        |
| Dogfooding           | AIEF composes its own repository in CI — AC14                                                       |

Failure paths get the same weight as success paths: every entry in spec §5.3 has a test asserting the failure occurs and names the offending artifact.

## 6. Rollout

No external consumers exist, so there is no compatibility surface to preserve. The first external application is the first validation project (§54), and it happens only after AC14 passes.

## 7. Rollback

Every effect is confined to one repository and reverts with the commit. The engine writes only generated artifacts, marked as such, and never edits authored content — so a bad composition is discarded by deleting the generated output and re-running.

## 8. ADR needs

- **ADR-0001** — engine runtime and distribution. Written.
- **ADR-0002** — rule intents as a machine-readable sidecar alongside the normative prose. Required before task 3; the alternative considered is parsing the specification directly.
- **ADR-0003** — Foundation version resolution without network access. Required before task 4.
