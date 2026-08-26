# Changelog

Notable changes to the AIEF repository.

## [Unreleased]

### Added

- AIEF-000 v0.3.1 as the normative baseline, with AIEF-Core and AIEF-Full conformance.
- Addressable rule sidecar: 64 rules across five files, with a bidirectional parity check
  against the prose.
- **`aief init` / `aief compose`** (AIEF-001) — model, loaders, resolver, emitter and CLI.
- **`aief health`** (AIEF-002) — §48 configuration health and §55 layer-boundary tests,
  read-only. Fourteen detections implemented; three declared unimplemented with their reasons.
- **`aief render`** (AIEF-001 task 17) — provider projection into a managed region of
  `AGENTS.md`, with drift detection wired into CI.
- **`aief baseline`** (AIEF-003) — quality ratchet compared by violation identity, not by count.
- Governance failures with named artifacts: orphan rules, unwaived contradictions,
  expired waivers, unmet conformance claims, unenforceable categories.
- Deterministic Effective Configuration and deterministic baseline.
- JSON Schema contracts generated from the model and validated against real artifacts.
- Stack Profile `node`, binding format, lint, test and dependency audit, and declaring
  violation identities for lint.
- Provider adapter contracts for Claude Code and Codex.
- 86 tests, including dogfooding: this repository composes, audits and ratchets itself.

### Changed

- **Tool-bound Foundation rules now default to `advisory`** (ADR-0005, §8.5). The Foundation
  cannot know which Stack Profile a project selects, so it cannot know whether a binding
  exists. The layer that supplies the binding is the layer that raises the mode.
- The unmet-conformance message names the specific missing detections instead of naming a
  work item, and a requirement leaves that list when it is delivered.
- A cached Foundation is a self-contained bundle: `rules/` and `stacks/` side by side under
  the version directory, so a consumer resolves both offline with no absolute path in any
  artifact.

### Removed

- The secret-scanning waiver. With `AIEF-SEC-001` honestly advisory under §8.5, the waiver
  dispensed nothing, and a waiver that changes no outcome is decorative governance.
- `templates/project/project.yaml.tmpl`, which described a Project Profile shape that
  disagreed with the one `aief init` generates.

### Fixed

- `aief init` produced a repository that failed `aief compose` on its first run
  (`ORPHAN_RULE` for `AIEF-SEC-001`), contradicting §43 step 11. Root cause and correction
  in ADR-0005; regression covered by `test/init.test.js`.
- The §55.1 contamination scan reported a cached bundle's own Stack Profiles as Foundation
  contamination.

### Decided

- ADR-0001 engine runtime and distribution.
- ADR-0002 rule intents as a machine-readable sidecar.
- ADR-0003 offline layered Foundation resolution.
- ADR-0004 JSON Schema as the published governance contract.
- ADR-0005 tool-bound intents default to advisory.
- ADR-0006 the engine may execute Stack Profile commands, under one verb only.

### Known gaps

- `conformance: full` is refused. F5 is the only requirement still refusing it: H4 stale
  rules, H8 unused roles and skills, H10 Stack Profile binding drift.
- Three-platform CI has never executed; verified on Windows only.
- Secret scanning is unbound, so `AIEF-SEC-001` is advisory. Binding it means choosing a
  scanner — a dependency decision carrying a supply-chain flag, and its own ADR.
- `aief adopt` — repository inventory and convention extraction (§45) — is AIEF-004.
- Validated against two projects. §54 asks for three materially different ones, and both
  current ones are governed by a single Stack Profile or none.
