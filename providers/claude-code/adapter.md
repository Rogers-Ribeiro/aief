# Provider adapter — Claude Code

Documented against the adapter contract in AIEF-000 §39. This adapter projects
the composed configuration into Claude Code's native mechanisms. It is a
projection, never a policy source (§6).

## Source artifacts consumed

```text
.ai/effective-config.json     the resolved composition, when materialized
.ai/project.yaml              conformance level and stack selection
foundation/rules/*.yaml       rule intents, modes and enforcement categories
```

## Projection status

`aief render` generates the managed region of `AGENTS.md`, the neutral entry point this
provider consumes. That region is verified against the composition by `aief render --check`
and by health checks H9 and L4 — drift is a build failure, not a discrepancy someone notices.

Every other file in the table below is still **contract only**: documented, not generated. A
table row is a claim about what the adapter does; these rows describe what it will do.

## Provider files created or mapped

| File                    | Contents                                                       | Authored or generated |
| ----------------------- | -------------------------------------------------------------- | --------------------- |
| `CLAUDE.md`             | An import of the neutral entry point plus Claude-only pointers | Generated             |
| `.claude/agents/*.md`   | Thin wrappers naming the canonical role file                   | Generated             |
| `.claude/settings.json` | Hook registrations for rules bound to enforcement categories   | Generated             |

Nothing here restates an engineering rule. A rule appearing only in a provider
file is a defect, not a shortcut.

## Loading behaviour

`CLAUDE.md` is read at session start. It uses the import mechanism rather than
a symbolic link: on Windows a symlink requires Developer Mode or elevation plus
`git config core.symlinks=true`, and degrades silently into a text file
containing a path — leaving the agent reading that path as its entire
instruction set.

Nested instruction files resolve nearest-first, so a directory-level file
specializes the root without repeating it (§14).

## Scoping behaviour

AIEF scoped rules (§17) map onto Claude Code's path-scoped rule mechanism.
Scope types AIEF supports that have no native equivalent are listed below with
their fallback.

| AIEF scope type | Native support | Fallback                                  |
| --------------- | -------------- | ----------------------------------------- |
| `paths`         | Yes            | —                                         |
| `language`      | No             | Expanded to path globs at projection time |
| `module`        | No             | Expanded to the module's path globs       |

## Unsupported AIEF semantics

- **Enforced modes requiring a gate that runs outside the session.** Hooks fire
  on tool events, not on merge. Rules bound to CI-only categories project as
  advisory in-session and remain enforced in CI.
- **Waiver expiry.** No native mechanism observes a date. Expiry is enforced by
  `aief compose`, which is why composition belongs in CI rather than only in a
  session.

## Known pitfalls

**Directory access is not instruction loading.** Granting the tool access to an
additional directory does _not_ load that directory's instruction file or its
scoped rules. An agent can then read code without the rules that govern it, and
nothing signals the gap. When a project spans directories, each must be brought
in through the composed configuration rather than by access alone.

**A generated provider file edited by hand is silently lost** on the next
projection. Generated files carry a header saying so; the header is the only
warning the mechanism can give.

## Verification method

```text
aief compose            resolution succeeds and the projection is reproducible
diff                    regenerated projection matches the committed one (§55.4)
```

A projection that cannot be regenerated from the composed source has become a
second source of truth, which is the failure this contract exists to prevent.
