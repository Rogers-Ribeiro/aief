# ADR-0001 — Engine runtime and distribution

- **Status:** Accepted
- **Date:** 2026-08-26
- **Change Level:** L3 (new system boundary)
- **Risk Flags:** supply-chain

## Context

AIEF-001 delivers the Init & Composition Engine. The engine runs **inside the repository being governed**, and AIEF's validation criteria (§54) require it to work across materially different stacks — including repositories with no interpreter of their own beyond their platform toolchain.

Constraints that shape the decision:

- The engine must not require the target project's toolchain. A Salesforce or .NET repository has no reason to install a Python environment to resolve governance configuration.
- The target providers are Claude Code and Codex, both distributed in ecosystems where Node is present.
- Primary development is on Windows, with the engine expected to run on macOS and Linux in CI.
- Governance artifacts are YAML and Markdown; the engine reads and composes them, and writes derived projections.
- §57 forbids vendoring the Foundation into projects, so the engine must resolve a referenced version rather than read a local copy by default.

## Decision

The engine is written in **Node (ESM)**, distributed as a multi-provider plugin repository containing both `.claude-plugin/` and `.codex-plugin/` manifests over a shared implementation.

- No dependency on the target project's language runtime.
- One cross-platform script layer — no paired shell dialects.
- Dependencies kept minimal; a YAML parser is the only category accepted for v0.x.

## Consequences

**Positive**

- Runs wherever the target providers run, in any stack's repository.
- Hooks, engine and provider adapters share one runtime, so there is a single place to test.
- Windows, macOS and Linux behave identically without shell-dialect handling.

**Negative**

- Adds Node as a prerequisite for repositories that otherwise have none.
- Node presence is assumed rather than proven; see the verification task in AIEF-001.
- A supply-chain surface exists from the moment a third-party dependency is added, which is why the dependency budget is deliberately near zero.

## Alternatives Considered

| Alternative                                     | Rejected because                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Python**                                      | Absent by default in .NET, Java and Salesforce repositories. Version and environment management would become the adopter's first experience of AIEF.                |
| **Compiled binary (Go/Rust)**                   | Best runtime story, worst distribution story at v0.x: platform matrix, signing, and release engineering before the model has been validated once. Reconsider at v1. |
| **Paired `.ps1` + `.sh` scripts**               | Doubles maintenance, and composition logic in shell is not testable at the level this engine needs.                                                                 |
| **Provider-native only (no standalone engine)** | Would make the engine a provider feature, violating §6: provider files are projections, never policy sources.                                                       |

## Verification (AIEF-001 task 0)

Checked on the primary development machine, Windows 11, 2026-08-26:

```text
node        v24.13.0    C:\Program Files\nodejs\node
npm         11.6.2
npx         11.6.2
codex-cli   0.148.0
```

The premise holds on the development machine. It remains **unproven** on the machines of future adopters and in CI runners of non-JavaScript projects — which is what the first revisit trigger below exists to catch. This verification lowers the risk; it does not close it.

## Trigger to Revisit

Revisit when **any** of the following occurs:

- a validation project (§54) cannot adopt AIEF because Node is unavailable or disallowed;
- provider distribution stops implying a Node runtime;
- the dependency count required by the engine exceeds a small, auditable set;
- the engine reaches v1 and distribution as a signed binary becomes cheaper than the Node prerequisite.
