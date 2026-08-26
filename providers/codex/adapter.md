# Provider adapter — Codex

Documented against the adapter contract in AIEF-000 §39.

**Status: contract only.** No projection generator exists yet, and the capability
statuses below are declared rather than verified. Declaring an unverified capability
as working would be the same defect as a Stack Profile claiming `supported: true`
with no binding behind it.

## Source artifacts consumed

```text
.ai/effective-config.json     the resolved composition, when materialized
.ai/project.yaml              conformance level and stack selection
foundation/rules/*.yaml       rule intents, modes and enforcement categories
```

## Capability status

| Capability               | Status         | Note                                                                                         |
| ------------------------ | -------------- | -------------------------------------------------------------------------------------------- |
| Canonical entry point    | supported      | Codex reads `AGENTS.md` natively, which is why the neutral entry point needs no adapter here |
| Nested instruction files | to-be-verified | Nearest-file resolution is expected but has not been tested in this repository               |
| Scoped rules             | to-be-verified | No confirmed native path-scoping mechanism                                                   |
| Roles                    | to-be-verified | Whether role prompts can be registered rather than pasted is unknown                         |
| Skills                   | supported      | A plugin manifest may point at a shared `skills/` directory                                  |
| Hooks                    | to-be-verified | No confirmed pre/post tool event mechanism                                                   |

Every `to-be-verified` row is a question to answer by reading the current Codex
documentation and testing against the installed version — not by assuming behaviour
that sounds plausible (AIEF-QUAL-010).

Verified locally at the time of writing: `codex-cli 0.148.0`.

## Provider files created or mapped

| File                        | Contents                                            | Authored or generated                 |
| --------------------------- | --------------------------------------------------- | ------------------------------------- |
| `AGENTS.md`                 | The neutral entry point. Codex consumes it directly | Generated                             |
| `.codex-plugin/plugin.json` | Manifest pointing at shared skills                  | Generated, once the projection exists |

Nothing here restates an engineering rule.

## Unsupported AIEF semantics

- **Waiver expiry.** No native mechanism observes a date; expiry is enforced by
  `aief compose`, which is why composition belongs in CI and not only in a session.
- **Modes requiring a merge-time gate.** Session-level tooling cannot block a merge;
  those rules remain enforced in CI.

## Known pitfalls

To be filled from evidence rather than anticipation. An empty section here is honest;
inventing pitfalls would be the same error as inventing an API.

## Verification method

```text
aief compose            resolution succeeds
diff                    regenerated projection matches the committed one (§55.4)
```
