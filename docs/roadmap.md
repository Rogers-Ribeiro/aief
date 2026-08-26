# Roadmap

## Phase 0 — Foundation · done

- [x] AIEF-000 v0.3.1 frozen as the implementation baseline
- [x] Repository bootstrap, governed by AIEF itself

## Phase 1 — AIEF-001: Init & Composition Engine · in progress

- [x] runtime chosen and verified (ADR-0001, Node)
- [x] rule intents addressable via sidecar (ADR-0002) with a parity check
- [x] offline layered Foundation resolution (ADR-0003)
- [x] model, loaders, resolver, emitter
- [x] `compose` and `init`
- [x] Core validation: orphan rules, contradictions, waiver expiry, conformance claims
- [x] deterministic Effective Configuration
- [x] dogfooding: this repository composes itself
- [ ] provider projection generator
- [ ] three-platform CI verified against a remote

## Phase 2 — AIEF-002: Health check

Unblocks declaring `conformance: full`, and closes the secret-scanning waiver.

- [ ] orphan enforcement reporting
- [ ] layer-boundary tests (§55)
- [ ] configuration health check (§48)
- [ ] secret-scan binding

## Phase 3 — AIEF-003: Adoption

- [ ] inventory and convention extraction
- [ ] baseline with violation identity
- [ ] quality ratchet with mechanical monotonicity

## Phase 4 — Provider adapters

- [ ] Claude Code projection
- [ ] Codex projection

## Phase 5 — Stack Profiles

Create only profiles with an immediate consumer. `node` exists because this
repository needed it.

## Phase 6 — Validation

Zero normative Foundation edits across three materially different projects,
including at least one existing repository carrying debt (§54).
