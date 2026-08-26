# AIEF-002 — Tasks

## Status — 2026-08-26

| Task                                        | State | Evidence                                                         |
| ------------------------------------------- | ----- | ---------------------------------------------------------------- |
| 1 `src/audit/` module boundary              | done  | `cli → audit → resolve → load → model`; audit performs no writes |
| 2 H1 duplicate instructions                 | done  | fails on two rules sharing a normalized intent                   |
| 3 H2 contradictions, H6 orphan rules        | done  | read from composition rather than re-derived                     |
| 4 H3 always-loaded context budget           | done  | warns only — a signal is not a gate (AIEF-QUAL-012)              |
| 5 H5 waiver expiry, present and approaching | done  | warns inside 30 days, fails once expired                         |
| 6 H7 orphan enforcement                     | done  | warns, per §12.2                                                 |
| 7 H11 unsupported capability references     | done  | a real gap that nothing checked before this work item            |
| 8 H12 conformance claim audit               | done  | refusal message now names the specific missing detections        |
| 9 L1 Foundation contamination               | done  | banned vocabulary derived from the artifacts present             |
| 10 L2 Stack contamination                   | done  | project id and name, scanned against each Stack Profile          |
| 11 L3 Project leakage upward                | done  | an invented rule id is an implicit Foundation edit request       |
| 12 `aief health` + report renderer          | done  | `npm run health`; wired into `npm run verify` and CI             |
| 13 Tests                                    | done  | 17 audit tests; every failing path observed to fail              |

Verification, 2026-08-26:

```text
npm run verify          exit 0
parity ok — 63 rules across 64 specification sections
schemas ok — 6 contracts published and satisfied by this repository
tests 62 · pass 62 · fail 0
compose  63 rules · 12 enforced · 51 advisory · 0 off · 0 waived
health   11 pass · 0 fail · 0 warn · 5 not implemented
```

## Declared not implemented

Five detections are reported by `aief health` with their reasons rather than omitted.

| ID  | Detection                   | Closed by                                      |
| --- | --------------------------- | ---------------------------------------------- |
| H4  | stale rules                 | §30.4 measurement data — no work item yet      |
| H8  | unused roles and skills     | whichever work item introduces roles or skills |
| H9  | provider projection drift   | AIEF-001 task 17                               |
| H10 | Stack Profile binding drift | a Stack Profile self-check contract            |
| L4  | provider truth drift        | AIEF-001 task 17                               |

## Conformance after this work item

`conformance: full` is still refused, and correctly so. F5 and F6 are partial, F7 is untouched.
The value delivered is that the refusal now names what is missing instead of naming a work item.

Two of the five gaps close together with AIEF-001 task 17.

## Not done

- **Secret scanner binding.** Left out deliberately. `secret_scan` has no binding, so
  `AIEF-SEC-001` stays advisory and honest under §8.5. Binding it means choosing a scanner —
  a dependency decision carrying a supply-chain flag, which needs its own ADR and the user's
  call between an external binary, an npm package, and platform-level push protection.
- **H10 via command execution.** Rejected in spec §5.3, not deferred.
