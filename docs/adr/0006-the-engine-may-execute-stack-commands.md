# ADR-0006 — The engine may execute Stack Profile commands, under one verb only

- **Status:** Accepted
- **Date:** 2026-08-26
- **Change Level:** **L3** — changes what the engine is allowed to do
- **Risk Flags:** `command-execution`, `supply-chain`
- **Supersedes nothing.** Narrows the position taken in AIEF-002 spec §5.3.

## Context

§46 requires the quality ratchet to be mechanical: `New = Current − Baseline`, compared by
**violation identity**, not by count. Counts are explicitly insufficient — swapping one old
violation for one new one must fail.

Current violations can only come from the tool that finds them. Getting them means running it.

AIEF-002 spec §5.3 refused exactly this for health check H10, on the grounds that a read-only
audit must not execute arbitrary commands. That refusal was right for an audit and would be
wrong as a blanket rule: it would make F7 permanently unreachable and reduce §46 to review
discipline, which §46 itself calls "not a ratchet".

The two cases differ in who asked. `aief health` runs on a cadence and in CI, often against a
repository the reader has not inspected. `aief baseline` is typed by someone who wants the
tool run.

## Decision

**The engine executes Stack Profile commands under `aief baseline` only.**

Four constraints, all mechanical:

1. **One verb.** `compose`, `health`, `render` and `init` never execute anything. A reader can
   run all four against an untrusted repository and know that nothing ran.
2. **Stack Profiles only.** Commands come from a Stack Profile resolved through the ADR-0003
   chain. The Project Profile — the layer a repository author controls most freely — cannot
   introduce a command. It parameterizes; it does not execute.
3. **Declared, not inferred.** A capability supplies violation identities only through an
   explicit `identities` block. Absent it, the ratchet reports the capability as
   unmeasurable and says so; it never guesses a command or a parser.
4. **No shell.** Commands are spawned as argv, never through a shell, so a profile cannot
   chain, redirect or substitute.

## Consequences

**Positive**

- F7 becomes reachable, and §46's central claim — no new debt, by identity — becomes real.
- The blast radius is one verb and one artifact type, both nameable in a sentence.
- The read-only guarantee of `health` survives, and is now a documented property rather than
  an accident of what happens to be implemented.

**Negative**

- Running a Stack Profile means trusting whoever wrote it. That trust already existed —
  a profile's commands were always going to be run by CI — but the engine now runs them
  directly, which shortens the chain between a compromised profile and execution.
- `aief baseline` is slow in a way the other verbs are not, because it runs real tools.
- Parsing tool output means the engine knows something about a tool's format. This is
  confined to the Stack Profile's `identities` declaration, which is where stack knowledge
  belongs, but the parser shapes the engine supports are a contract that will grow.

## Alternatives Considered

| Alternative                                        | Rejected because                                                                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Never execute; read a report file the CI wrote** | Moves execution into CI configuration, where it is invisible to AIEF and unversioned. The ratchet would silently compare against whatever a build step happened to emit. |
| **Execute in every verb, including `health`**      | Destroys the property that auditing an unfamiliar repository is safe. The audit is the verb most likely to be pointed at code nobody has read.                           |
| **Let the Project Profile declare commands too**   | The Project Profile is the layer a pull request touches most easily. A command there is a code-execution vector reviewed as configuration.                               |
| **Count-only comparison, no execution**            | §46 rejects it in as many words: one violation removed and one added must fail, and counts cannot see that.                                                              |
| **Shell out with `shell: true` for convenience**   | Buys pipe support and sells command injection. Profiles that need a pipeline can wrap it in a script the ecosystem already runs.                                         |

## Trigger to Revisit

- A stack appears whose only sane invocation needs a shell pipeline, forcing constraint 4 to
  be re-argued rather than worked around.
- The set of supported `identities` parser shapes grows past the point where it can be
  reviewed in one sitting — at which point the parser belongs outside the engine.
- Someone wants the ratchet in a pre-commit hook, which would put execution back on a path
  the reader did not explicitly invoke.
