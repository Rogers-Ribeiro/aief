# ADR-0003 — Foundation version resolution without network access

- **Status:** Accepted
- **Date:** 2026-08-26
- **Change Level:** L2
- **Risk Flags:** supply-chain

## Context

AIEF-000 §57 states that the Foundation is **referenced by version, never vendored** into a project repository. A Project Profile declares `foundation.version`, and the engine must turn that reference into rule intents.

Two constraints pull against each other. Composition runs in CI and in agent sessions, where a network fetch is slow, sometimes unavailable, and always a supply-chain surface. But §57 forbids copying the Foundation into every repository, because a multi-thousand-line specification inside each repo is precisely the always-loaded context the Foundation exists to prevent.

## Decision

Resolution is **offline and layered**, first match wins:

```text
1. explicit path         --foundation <path>        development and testing
2. workspace             a foundation/ directory in the invoking repository
3. local cache           a versioned, content-addressed cache on the machine
4. failure               named, actionable, never a silent fallback
```

The engine performs **no network access** during composition. Populating the cache is a separate, explicit act — never a side effect of `compose`.

Resolution is recorded in the output: every composed configuration reports which Foundation version was used and which strategy resolved it.

Step 2 is what lets the AIEF repository govern itself: it _is_ the Foundation, so its own `foundation/` directory resolves naturally, without a special case in the code.

## Consequences

**Positive**

- Composition is deterministic and works offline, in CI and in a locked-down environment.
- No network at composition time means no supply-chain surface on the hot path.
- Self-hosting falls out of the ordering rather than requiring a bootstrap exception.
- Recording the resolution strategy makes "which Foundation actually applied?" answerable after the fact.

**Negative**

- A cache must be populated before first use in a fresh environment, which is one more step in onboarding and in CI setup.
- A stale cache silently resolves an old version — mitigated by recording the resolved version in the output, and by CI pinning.
- Layered resolution has four paths to test rather than one.

## Alternatives Considered

| Alternative                                    | Rejected because                                                                                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fetch on demand**                            | Puts the network on the hot path of every composition, breaks offline and CI-locked environments, and adds a supply-chain surface to an operation that should be pure. |
| **Vendor the Foundation into each repository** | Directly contradicts §57 and reintroduces the context-budget problem the section exists to solve.                                                                      |
| **Package-manager dependency**                 | Couples governance resolution to one ecosystem's package manager, which fails the portability goal the moment a repository has no such manager.                        |
| **Single fixed global location**               | Cannot express per-project pinning, and makes self-hosting a special case.                                                                                             |

## Trigger to Revisit

- A validation project needs two Foundation versions resolvable at once.
- Cache staleness causes a real incident despite the version being recorded.
- A distribution mechanism appears that is offline-first and cheaper than a hand-populated cache.
