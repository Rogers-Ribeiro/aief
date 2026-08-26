# ADR-0002 — Rule intents as a machine-readable sidecar

- **Status:** Accepted
- **Date:** 2026-08-26
- **Change Level:** L3 (defines the addressable form of every rule)
- **Risk Flags:** none

## Context

AIEF-000 §10 requires stable rule identity: waivers reference rule IDs, orphan detection compares rules against bindings, and health checks address rules individually. But the Foundation is a prose specification. Prose is the right form for explaining _why_ a rule exists; it is the wrong form for a resolver to address.

Something has to bridge the two, and the choice determines whether §10 is real or aspirational.

## Decision

Rule intents live in a **machine-readable sidecar** distributed with the Foundation:

```text
foundation/
├── AIEF-000-foundation.md      normative prose — the explanation
└── rules/*.yaml                addressable intents — the identity
```

Each sidecar entry carries `id`, `intent`, `default_mode`, `enforcement_category`, `conformance` and the `section` of the prose it derives from.

**The prose remains normative.** The sidecar is a projection of it, not a replacement — the same relationship the Foundation defines between composed configuration and provider files (§6).

A **parity check** enforces the correspondence in both directions: a rule in the prose with no sidecar entry, or a sidecar entry citing a section that does not exist, is a Foundation defect that fails CI.

## Consequences

**Positive**

- §10 becomes implementable without parsing prose.
- Waivers, orphan detection and health checks get a stable target.
- The sidecar is diffable, so a change to a rule's mode is visible in review.
- The parity check makes drift between explanation and identity detectable rather than gradual.

**Negative**

- Two artifacts must move together. The parity check is what makes this survivable, and it is mandatory rather than optional.
- Adding a rule costs two edits.
- The `section` reference is a text anchor, so restructuring the specification breaks it — deliberately, since a rule whose explanation moved unnoticed is exactly the drift worth catching.

## Alternatives Considered

| Alternative                                 | Rejected because                                                                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parse the specification directly**        | Turns Markdown formatting into a contract. Any heading or emphasis change becomes a breaking change, and the parser becomes the real specification.                                 |
| **Front-matter inside the prose document**  | Keeps one file, but makes a 1900-line document the thing every tool reads and re-reads, and rules cannot be loaded selectively.                                                     |
| **Sidecar as the only form, prose deleted** | Loses the reasoning. A rule without its rationale cannot be evaluated for retirement (§30.6), and the reasoning is what makes an agent apply it correctly in an unanticipated case. |
| **Rule IDs embedded as inline anchors**     | Fragile in a different way, and still requires parsing.                                                                                                                             |

## Trigger to Revisit

- The parity check becomes a routine annoyance rather than a rare catch, indicating the split is in the wrong place.
- A third artifact needs the same identities, suggesting the sidecar should become a package rather than files.
- The Foundation stabilizes to the point where prose and identity no longer change independently.
