# Changelog

Notable changes to the AIEF repository.

## [Unreleased]

### Added

- AIEF-000 v0.3.1 as the normative baseline, with AIEF-Core and AIEF-Full conformance.
- Addressable rule sidecar: 62 rules across five files, with a parity check against the prose.
- Init & Composition Engine: model, loaders, resolver, emitter and CLI.
- Governance failures with named artifacts: orphan rules, unwaived contradictions,
  expired waivers, unmet conformance claims, unenforceable categories.
- Deterministic Effective Configuration.
- Stack Profile `node`; provider contracts for Claude Code and Codex.
- Project and governance templates.
- 39 tests, including dogfooding: this repository composes its own configuration.

### Decided

- ADR-0001 engine runtime and distribution.
- ADR-0002 rule intents as a machine-readable sidecar.
- ADR-0003 offline layered Foundation resolution.
- ADR-0004 JSON Schema as the published governance contract.

### Known gaps

- Provider projection generator not built.
- Three-platform CI has never executed; verified on Windows only.
- Secret scanning unbound, covered by a waiver expiring 2026-11-26.
- 11 of 62 rules are enforced; the rest are advisory because nothing yet enforces them.
