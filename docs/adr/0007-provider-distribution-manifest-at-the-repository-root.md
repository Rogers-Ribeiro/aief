# ADR-0007 — A provider distribution manifest may live at the repository root

- **Status:** Accepted
- **Date:** 2026-08-26
- **Change Level:** L2
- **Risk Flags:** none

## Context

AIEF ships a Claude Code plugin so that the repeated procedures — spec, plan, ADR, configuration
audit — can be installed into a project rather than copied into it by hand.

The plugin format is not ours. Claude Code discovers a marketplace by reading
`.claude-plugin/marketplace.json` **at the repository root**. The path is fixed; there is no
configuration that moves it.

That collides with §6 and with this repository's own layout rule. Provider-specific artifacts
belong in `providers/<provider>/`, and the reason is not tidiness: a provider file at the root
is where a rule starts to look like a top-level truth rather than a projection of one.

## Decision

**A provider distribution manifest may live at the repository root when the provider's format
requires it. Nothing else provider-specific may.**

The distinction that makes this safe is between two kinds of file:

```text
distribution manifest    where a provider looks to find the plugin      may sit at the root
policy or instruction    anything that tells an agent what to do        may not
```

`.claude-plugin/marketplace.json` names one plugin and points at `plugins/aief/`. It contains no
instruction, no rule and no engineering guidance — remove it and nothing about how this
repository is governed changes; only installation breaks.

Three constraints keep this from becoming a precedent:

1. **The manifest is a pointer, not content.** Everything the plugin actually carries lives
   under `plugins/aief/`.
2. **The plugin restates no rule.** Its skills describe procedures; the rules stay in the
   Foundation, and `aief compose` remains the only thing that says what applies. A rule that
   existed only in the plugin would be the §6 defect this ADR is careful about.
3. **This ADR is the exception, and it is enumerated.** A second provider needing root
   placement needs its own entry here, not an appeal to this one.

## Consequences

**Positive**

- `/plugin marketplace add Rogers-Ribeiro/aief` works without a wrapper repository whose only
  content would be a pointer to this one.
- The four skills in `templates/skills/` gain a real consumer. They were orphaned artifacts —
  the exact thing §29 prohibits — and are now shipped rather than kept in case.
- The Claude Code adapter stops being a document describing something that does not exist.

**Negative**

- The repository root now shows a provider name, which reads as a layer violation to anyone who
  has not read this file. Mitigated only by this file existing and being findable.
- A format we do not control now constrains our layout. If Claude Code moves the path, we move.
- The temptation is now live: the next provider-specific convenience will argue it is "just
  like the marketplace manifest". Constraint 3 is what that argument has to get past.

## Alternatives Considered

| Alternative                                                       | Rejected because                                                                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A separate public repository holding only the marketplace**     | Two repositories to keep in sync so that one JSON file can sit somewhere tidier. The plugin would drift from the Foundation it projects, which is the drift §55.4 exists for. |
| **A symlink from the root to `providers/claude-code/`**           | Not portable across the platforms this project already tests on, and it hides the coupling instead of documenting it.                                                         |
| **Do not ship a plugin**                                          | Leaves `templates/skills/` orphaned and the Claude Code adapter describing a projection nobody can install. Both are defects this project names elsewhere.                    |
| **Put the whole plugin at the root, since the manifest is there** | Confuses the exception with the rule. The manifest has a fixed path; the plugin's contents do not, and `plugins/` keeps them out of the way.                                  |

## Trigger to Revisit

- Claude Code supports a configurable marketplace path, at which point the manifest moves under
  `providers/claude-code/` and this ADR is superseded.
- A second provider requires root placement, which would make "root is for distribution
  manifests" a genuine layout rule rather than one enumerated exception.
- The plugin acquires content that restates a rule, which means constraint 2 failed and the
  arrangement, not just the content, needs re-examining.
