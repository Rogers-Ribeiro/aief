# AIEF-000 — AI Engineering Foundation

- **Status:** Decided — v0.3.1 implementation baseline
- **Version:** 0.3.1
- **Date:** 2026-08-26
- **Scope:** Universal AI-assisted software engineering foundation
- **Target:** AI coding agents and provider-specific coding tools
- **Applicability:** Any programming language, framework, architecture, repository shape, or business domain
- **Supersedes:** v0.3 (v0.3.1 changelog in §63; v0.2 → v0.3 changelog in §62)

**Normative keywords.** MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as defined in RFC 2119. Every normative statement is tagged with the conformance level that requires it: **[Core]** or **[Full]** (§4).

---

# 0. Executive decision

AIEF is a **provider-neutral engineering governance system** for software built with AI coding agents.

It separates three kinds of knowledge:

```text
FOUNDATION
    ↓ specializes
STACK PROFILE
    ↓ parameterizes
PROJECT PROFILE
```

Provider integrations are **not a fourth knowledge layer**.

They are an orthogonal projection mechanism:

```text
Foundation
    │
    ▼
Stack Profile(s)
    │
    ▼
Project Profile
    │
    └────────────── compose ──────────────┐
                                          ▼
                               Effective Configuration
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
               Generic Agent       Provider Adapter A   Provider Adapter B
               Instructions
```

The invariant is:

> **Foundation, Stack Profile, and Project Profile are the source of truth. Provider-specific files are projections, never independent policy sources.**

AIEF defines two conformance levels so that adoption is a checkable claim rather than a declaration of intent (§4).

---

# 1. Purpose

The **AI Engineering Foundation (AIEF)** defines how AI coding agents should:

- understand a repository;
- locate applicable engineering rules;
- classify a requested change;
- plan before making non-trivial changes;
- implement within declared boundaries;
- verify work with evidence;
- review changes consistently;
- evolve engineering configuration from observed friction;
- avoid speculative complexity and AI-generated technical debt.

AIEF does **not** define a product architecture.

AIEF does **not** prescribe a programming language, framework, database, cloud platform, deployment style, or business domain.

It defines a reusable engineering system that project-specific architecture can plug into.

---

# 2. Design goals

AIEF optimizes for:

1. **Portability** — the core must work across materially different software projects.
2. **Low context waste** — always-loaded agent context remains small.
3. **Deterministic enforcement** — machine-verifiable rules do not remain prose forever.
4. **Clear ownership** — every instruction has a defined layer and owner.
5. **Low vibe debt** — agents do not create duplicate concepts, speculative abstractions, or unrelated refactors.
6. **Verification over confidence** — completion requires evidence.
7. **Gradual adoption** — existing repositories can adopt AIEF without immediately failing every quality gate.
8. **Explicit exceptions** — deviations are visible, scoped, justified, and reviewable.
9. **Configuration lifecycle** — rules can be promoted, demoted, waived, or retired.
10. **Provider neutrality** — tool-specific configuration does not redefine engineering policy.
11. **Checkable conformance** — claiming AIEF adoption implies verifiable properties.

---

# 3. Non-goals

AIEF must not become:

- a universal application architecture;
- a framework selection guide;
- a generic clean-code encyclopedia;
- a mandatory micro-process for trivial edits;
- a giant always-loaded instruction file;
- a source of project-specific domain terminology;
- a replacement for compiler, linter, test suite, CI, or security tooling;
- a collection of empty files created "for later";
- a provider-specific setup kit disguised as an engineering standard.

---

# 4. Conformance levels

A framework whose central mechanisms are all optional cannot deliver the properties that justify adopting it. AIEF therefore defines two conformance levels.

## 4.1 AIEF-Core

The minimum that makes "this project follows AIEF" mean something.

An AIEF-Core implementation MUST:

```text
C1  maintain exactly three knowledge layers (§5)
C2  keep provider files as projections, never policy sources (§6)
C3  apply the allocation test to every new governance artifact (§7)
C4  decompose cross-layer rules into intent / binding / parameters (§8)
C5  require verification evidence for completion (§33)
C6  classify every change by Change Level and Risk Flags (§19–§21)
C7  express every deviation as a visible, scoped, justified waiver (§31)
C8  keep the normative Foundation free of stack, project and provider detail (§55, §58)
C9  never make the repository depend on personal configuration (§18.4)
C10 use baseline + ratchet when adopting into an existing repository (§45, §46)
```

## 4.2 AIEF-Full

Everything in Core, plus the machinery that makes governance self-checking.

An AIEF-Full implementation MUST additionally:

```text
F1  produce an inspectable Effective Configuration (§9)
F2  assign stable identities to governing rules (§10)
F3  detect orphan rules and orphan enforcement (§12)
F4  fail on unwaived rule contradictions (§11)
F5  run a configuration health check on a defined cadence (§48)
F6  provide layer-boundary tests (§55)
F7  enforce baseline monotonicity mechanically (§46)
```

## 4.3 Declaring conformance

A project MUST declare its level in the Project Profile.

```yaml
foundation:
  version: "0.3.1"
  conformance: core        # core | full
```

Claiming a level without satisfying its MUSTs is a governance defect, detectable by the health check at AIEF-Full.

**[Core]** Statements below tagged [Core] are required at both levels. **[Full]** statements are required only at AIEF-Full, and are RECOMMENDED at Core.

---

# 5. The three knowledge layers

## 5.1 Foundation

Foundation contains **universal engineering intent**.

A statement belongs in Foundation when it remains valid:

- across different programming languages;
- across different frameworks;
- across different repositories;
- across different business domains;
- across different AI coding providers.

Examples of Foundation-level intent:

```text
Do not report completion without verification evidence.

Do not silently introduce unrelated refactors.

Critical boundaries should be machine-verifiable when practical.

Untrusted external input must be treated as untrusted.

Complexity must be justified by a current requirement.
```

**[Core]** Foundation MUST NOT contain stack-specific commands or project-specific values.

## 5.2 Stack Profile

A Stack Profile contains **ecosystem-specific bindings and conventions**.

It answers:

> How can this ecosystem satisfy the universal engineering intent?

A Stack Profile may define:

- package/environment conventions;
- formatter, lint, type-check, test and build bindings;
- architecture validation capability;
- contract-generation capability;
- file and path conventions;
- default numeric thresholds for engineering signals (§50);
- provider-scoped rule mappings for that ecosystem.

A Stack Profile is reusable across every project using the same stack.

**[Core]** It MUST NOT own project-specific module graphs, domain terms, or product rules.

## 5.3 Project Profile

A Project Profile contains **parameters and project-specific engineering policy**.

It owns:

- project purpose;
- project architecture;
- module and domain boundaries;
- project glossary;
- project invariants;
- repository-specific commands;
- selected Stack Profiles and declared conformance level;
- enabled capabilities;
- quality thresholds that override stack defaults;
- risk classification;
- public contracts;
- project-specific waivers;
- project-specific scoped rules.

The Project Profile is the narrowest and most specific knowledge layer.

---

# 6. Provider adapters are orthogonal

Provider adapters do not specialize the Project Profile.

They translate the **effective configuration** into a tool-specific representation.

```text
Foundation
    +
Stack Profile(s)
    +
Project Profile
    ↓
COMPOSITION
    ↓
Effective Configuration
    ↓
Provider Projection
    ├── Generic agent instructions
    ├── Provider-specific instruction files
    ├── Provider-specific scoped rules
    ├── Provider-specific skills
    └── Provider-specific hooks/settings
```

**[Core]** Rules:

1. Provider files MUST NOT redefine universal engineering policy.
2. Provider files MUST NOT contain project knowledge absent from the composed source.
3. Provider-specific exceptions belong in the adapter only when they describe **provider** behavior, not project behavior.
4. An adapter MAY document known tool pitfalls and loading semantics — and SHOULD, when they can silently mislead an agent.
5. The project MUST remain buildable and governable if any one provider is removed.

---

# 7. Allocation test

**[Core]** Every new instruction, rule, convention, or governance artifact MUST pass this test before being added.

```text
1. Would this still be true in another programming language?
   YES → Foundation
   NO  → continue

2. Would this still be true in another project using the same stack?
   YES → Stack Profile
   NO  → Project Profile
```

Then apply the decomposition test:

```text
Does the candidate combine intent, binding, and parameters?

If YES → split it across the appropriate layers (§8).
```

This allocation test is normative.

> **A rule that cannot be allocated clearly is not ready to be added.**

---

# 8. Intent / Binding / Parameters

Many important engineering rules naturally span all three layers. AIEF models them as three parts.

## 8.1 Intent — Foundation

Defines what must remain true. Provider-neutral and stack-neutral.

```text
Declared architectural boundaries should be machine-verifiable when practical.
```

## 8.2 Binding — Stack Profile

Defines how the ecosystem verifies or enforces the intent. Reusable across projects on that stack.

```yaml
architecture_check:
  supported: true
  command: <stack-specific command>
```

## 8.3 Parameters — Project Profile

Defines the project-specific values.

```yaml
architecture:
  modules:
    module_a:
      may_import:
        - module_b
```

## 8.4 Composition rule

```text
Intent + Binding + Parameters = Executable Project Policy
```

**[Core]** If a binding is unavailable:

- the intent remains valid;
- the Project Profile records that enforcement is advisory;
- the absence of enforcement is visible in the Effective Configuration;
- the project MAY define a promotion trigger for when a binding becomes available.

An intent without a binding is not a failure. An intent without a binding **that is presented as enforced** is (§12).

## 8.5 Default mode of a tool-bound intent

The Foundation authors intents. It does not know which Stack Profile a project will select, and therefore cannot know whether any given binding will exist.

**[Core]** A Foundation rule whose enforcement depends on a stack tool MUST declare `default_mode: advisory`. Only a layer that supplies the binding may raise it.

```text
Foundation   tool-bound intent      ->  advisory     it cannot see the binding
Stack        binds the capability   ->  enforced     it owns the command
Project      may raise it, or lower it with a waiver
```

The alternative fails in a specific and damaging way. A Foundation that guesses which bindings exist is encoding stack knowledge in the universal layer — the contamination §55 exists to prevent — and every project on a stack lacking that capability begins life with an orphan rule (§12.1) it did not author. A bootstrap that hands over a failing gate on the first commit teaches the reader that the gates are noise (§43).

This is not a weakening. The intent still applies, still appears in the Effective Configuration, and still reaches review. What disappears is the false claim that something is checking it.

---

# 9. Effective Configuration

**[Full]** An implementation MUST produce an inspectable **Effective Configuration**: the resolved composition of

```text
Foundation
+ selected Stack Profile(s)
+ Project Profile
+ active Waivers
```

It MUST make visible:

- which rules apply;
- where each rule originated;
- what scope it applies to;
- whether it is advisory or enforced;
- what binding enforces it;
- what parameters it uses;
- whether a waiver is active, and when it expires;
- which provider artifacts were generated or mapped from it.

Provider adapters consume Effective Configuration. They never become the source of truth.

**[Core]** Implementations at Core level SHOULD be able to answer, for any active rule, where it came from — even without a machine-readable composition.

---

# 10. Rule identity and traceability

Stable identity is required whenever another governance artifact must address a rule unambiguously.

**[Core]** A rule MUST have a stable ID when it is:

- enforced deterministically;
- waived;
- referenced by another governance artifact;
- used as the target of a baseline, policy exception, or explicit dependency.

**[Full]** Every governing rule MUST have a stable ID, including advisory rules.

Recommended namespaces:

```text
AIEF-CORE-001
AIEF-SEC-001
AIEF-TEST-001
STACK-<slug>-001
PROJECT-<slug>-001
```

Rule metadata:

```yaml
id: AIEF-CORE-001
status: active            # active | candidate | demoted | retired
scope: global
mode: advisory            # advisory | enforced
owner: foundation
intent: "Completion requires verification evidence."
```

When enforced:

```yaml
mode: enforced
binding: verification.required
```

Stable identity is what makes waivers, orphan detection, audits and health checks addressable. Without it, every governance mechanism degrades to ambiguous text matching.

---

# 11. Rule conflicts and precedence

A narrower rule **specializes** a broader one (§14). Specialization is expected. **Contradiction is not.**

## 11.1 Sanctioned deviation

The only sanctioned way for a lower layer to contradict a higher one is a **waiver** (§31), which references a specific rule ID, is scoped, justified and reviewable.

## 11.2 Unsanctioned contradiction

**[Full]** A detected contradiction with no active waiver MUST fail the governance check. It MUST NOT be reported as a warning.

The reasoning is structural: if contradictions merely warn, every rule is advisory by default, and the layer model describes an aspiration rather than a system.

**[Core]** At Core level, an unwaived contradiction MUST be resolved or waived before the affected work is considered done.

## 11.3 Precedence when resolving

```text
1. Active waiver for a specific rule ID and scope
2. Project Profile
3. Stack Profile
4. Foundation
```

Precedence determines which rule **applies**. It never silently deletes the overridden rule — the override is recorded, and at AIEF-Full it appears in the Effective Configuration.

---

# 12. Orphan detection

**[Full]** An implementation MUST detect two classes of configuration drift.

## 12.1 Orphan rule

```text
Rule declares mode = enforced
but the binding does not exist, or is disabled.
```

Result: **ORPHAN RULE** — a governance defect. The rule claims protection it does not provide.

## 12.2 Orphan enforcement

```text
A binding, hook or gate exists
but no active rule references it.
```

Result: **ORPHAN ENFORCEMENT** — dead or undocumented enforcement. Either a rule is missing, or the gate should be removed.

## 12.3 Reported by the health check

Orphan detection is part of §48.

---

# 13. Context Budget Principle

Context is a finite engineering resource. Always-loaded instructions compete with source code, logs, tests, the current task, architecture context, and the user's own instructions.

```text
Small > exhaustive.
Specific > generic.
Scoped > global.
On-demand > always loaded.
Executable > advisory when enforcement is possible.
```

Do not permanently load information that can be:

```text
derived from code
loaded by scope
invoked as a skill
resolved from a profile
validated by tooling
```

High-value permanent context:

- non-obvious project invariants;
- known traps;
- commands that differ from obvious defaults;
- intentional decisions an agent may incorrectly "fix";
- rules repeatedly violated by agents.

Low-value permanent context:

- directory descriptions visible from the repository;
- dependency lists;
- obvious language or framework facts;
- generic documentation already present elsewhere.

---

# 14. Progressive disclosure

```text
Foundation core
    ↓
Applicable Stack Profile rules
    ↓
Project rules
    ↓
Path/module-scoped rules
    ↓
On-demand skills
```

A narrower rule SHOULD specialize a broader rule, not duplicate it.

Repeated text across layers is configuration debt and is reported by the health check.

---

# 15. Instruction primitives

| Primitive | Purpose | Typical loading | Misuse failure |
|---|---|---|---|
| Core instruction | Small standing context | Always | Context bloat |
| Scoped rule | Standing convention for a subset of work | When scope matches | Noise if made global |
| Skill | Procedure or deep reference knowledge | On demand | Repeated manual prompting |
| Role | Delegated responsibility or perspective | When delegated | Responsibility mixing |
| Enforcement | Deterministic invariant | Event / CI / tool execution | Rule stays violable if only prose |
| Provider adapter | Projection into provider format | Provider-dependent | Drift, duplicate truth |

---

# 16. Instruction placement decision tree

```text
Must this be guaranteed deterministically?
        YES → ENFORCEMENT
        NO  ↓
Should it be known in almost every session?
        YES → CORE INSTRUCTION
        NO  ↓
Does it apply only to a path/module/language/area?
        YES → SCOPED RULE
        NO  ↓
Is it procedural or multi-step?
        YES → SKILL
        NO  ↓
Is it a delegated responsibility or perspective?
        YES → ROLE
        NO  ↓
Is it a personal preference rather than a project requirement?
        YES → PERSONAL CONFIGURATION (§18)
        NO  → it is not an instruction. Discard it.
```

The terminating **discard** branch is required. Without it, every passing thought becomes an instruction and the context budget dies by accumulation.

Provider-specific formatting is applied later, by the adapter.

---

# 17. Scoped rules

Scoped rules are first-class AIEF concepts. A scoped rule declares **where it applies**, independent of provider syntax.

```yaml
id: PROJECT-EXAMPLE-010
scope:
  type: paths
  include:
    - "<pattern>"
  exclude:
    - "<pattern>"
```

Alternative scope types:

```text
module · component · directory · language · file type · repository area
```

**[Core]** Semantics:

1. A scoped rule SHOULD NOT consume context outside its scope.
2. Provider adapters map AIEF scope semantics onto the provider's mechanism.
3. If a provider cannot implement the scope natively, the adapter MUST document the fallback.
4. Scoped rules MUST NOT duplicate global rules.
5. Scope definitions belong to the Stack or Project layer, per the allocation test.

---

# 18. Personal vs project configuration

## 18.1 Project configuration

Required by anyone — human or agent — working on the repository.

```text
committed · shared · reviewed · reproducible
```

## 18.2 Personal global configuration

Developer preference applying across repositories.

```text
not required by the project · not committed to the project
```

## 18.3 Project-local personal configuration

Developer preference for one repository.

```text
local · gitignored · non-load-bearing
```

## 18.4 Hard invariant

**[Core]**

> **A repository MUST be buildable, testable, verifiable, and governable without any developer's personal AI configuration.**

If a gate passes only on one machine, that gate does not exist.

---

# 19. Change Level

Change Level measures the **structural consequence** of a change:

- blast radius;
- number of affected boundaries;
- structural impact;
- reversibility;
- coordination cost beyond the repository.

Risk is a separate dimension (§21). Review finding severity is a third (§23).

## L0 — Trivial

```text
typo · copy-only change · formatting · non-behavioral documentation
```

Workflow: `IMPLEMENT → VERIFY`

## L1 — Localized

```text
small bug fix · localized validation · isolated behavior change
```

Workflow: `UNDERSTAND → IMPLEMENT → TEST → VERIFY`

## L2 — Feature

```text
meaningful new behavior · multiple components · new internal contract · cross-module feature
```

Workflow: `SPEC → PLAN → TASKS → IMPLEMENT → VERIFY → REVIEW`

## L3 — Architectural

Structural change that remains reversible within the repository.

```text
new major dependency · new system boundary · major internal contract change
storage strategy change · large migration · repository-wide structural change
```

Workflow: `SPEC → ARCHITECTURAL ANALYSIS → ADR → PLAN → TASKS → IMPLEMENT → VERIFY → REVIEW`

## L4 — Irreversible or externally coordinated

The distinguishing property is not size. It is that **the change cannot be undone by reverting the repository.**

```text
no viable rollback path
deploy that must be coordinated across repositories, services or teams
breaking change to a contract already consumed by an external party
one-way data transformation
```

A governance change is **not automatically L4**. Governance configuration has a floor of L2 (§20.3) and becomes L4 only when it is itself irreversible or requires external coordination.

Workflow:

```text
SPEC
→ ARCHITECTURAL ANALYSIS
→ ADR (with explicit rollback analysis)
→ PLAN
→ REHEARSAL or dry run where practical
→ EXPLICIT HUMAN AUTHORIZATION
→ IMPLEMENT
→ VERIFY
→ INDEPENDENT REVIEW
```

**[Core]** An AI agent MUST NOT authorize an L4 change on its own. L4 authorization is a human act.

L4 exists so that reversibility and coordination cost — both listed as dimensions of Change Level — actually differentiate a level rather than being unused adjectives.

---

# 20. Change classification governance

A classification model that anyone can self-assign downward is decorative. Three rules make it load-bearing.

**[Core]**

## 20.1 Declared before, visible during

The Change Level and any Risk Flags MUST be declared before implementation begins, and MUST be visible in the work artifact (spec, task, pull request, or session record).

## 20.2 The ratchet only rises for the agent

If, during the work, evidence shows the change is larger or riskier than declared, the agent MUST stop, reclassify upward, and satisfy the additional requirements of the new level.

An AI agent MUST NOT lower a Change Level mid-work.

A human MAY lower it, but the lowering MUST be explicit, justified, and recorded in the visible work artifact. Artifacts already produced under the higher level are not discarded merely to reduce ceremony.

## 20.3 Floors by category

Certain categories have a minimum level regardless of diff size:

```text
public or external contract           ≥ L2
governance configuration (§38)        ≥ L2
any active Risk Flag                  ≥ L1
irreversible or cross-repo effect     = L4
```

A one-line change to an authorization check is not automatically architectural — but it is never L0.

## 20.4 Who classifies

The agent proposes the classification. The human, or a reviewer role, may raise it. Only a human may lower it, and lowering MUST be recorded.

---

# 21. Risk flags

Risk is orthogonal to Change Level. A change may carry zero or more Risk Flags.

Foundation-defined categories MAY include:

```text
authentication · authorization · privilege-boundary
sensitive-data · privacy · payments · cryptography
tenant-isolation · destructive-data · external-contract
supply-chain · file-processing · network-boundary
```

Projects MAY add project-specific flags in the Project Profile.

Examples of combinations:

```text
L1 + sensitive-data
L1 + authorization
L2 + external-contract
L3 + tenant-isolation + privacy
```

Because any active Risk Flag has a minimum classification of L1 (§20.3), `L0 + <risk flag>` is invalid.

The level determines the base workflow. Risk flags add required checks.

---

# 22. Risk escalation

```text
Base workflow = Change Level workflow

for each active Risk Flag:
    add the required analysis, review or check
```

Possible additional controls:

```text
security review · threat analysis · privacy review · independent review
rollback verification · migration rehearsal · contract compatibility review
```

> A trivial change does not become architecturally large merely because it touches a sensitive area. It receives only the additional checks appropriate to the actual risk.

---

# 23. Review finding severity

A third, independent axis: how serious a **discovered issue** is.

```text
BLOCKER · HIGH · MEDIUM · LOW · NIT
```

Do not confuse the three axes:

```text
Change Level      = structural consequence of the requested change
Risk Flags        = sensitive areas touched
Finding Severity  = seriousness of a review finding
```

**[Core]** AI review output is advisory unless backed by deterministic enforcement. A BLOCKER raised by an agent is a strong signal, not a gate.

---

# 24. Development workflow

```text
REQUEST
   ↓
UNDERSTAND
   ↓
CLASSIFY ── Change Level + Risk Flags (§20)
   ↓
SPEC
   ↓
PLAN
   ↓
TASKS
   ↓
IMPLEMENT
   ↓
VERIFY
   ↓
REVIEW
   ↓
COMPLETE
```

The workflow is scaled by Change Level. Risk Flags add checks; they do not replace the level.

**[Core]** `VERIFY` produces evidence (§33). `REVIEW` is performed by someone or something other than the implementer.

---

# 25. Specification workflow

## 25.1 `spec.md` — what and why

```text
problem · purpose · scope · out of scope · behavior
acceptance criteria · constraints · risks · applicable Risk Flags
declared Change Level
```

## 25.2 `plan.md` — how

```text
implementation approach · impacted areas · architecture effects
contracts affected · migration needs · verification strategy
rollout and rollback concerns · ADR needs
```

## 25.3 `tasks.md` — verifiable units

Each task should have:

```text
clear outcome · limited scope · verification path · dependency visibility
```

Avoid tasks such as `Implement the entire feature`.

---

# 26. ADR policy

An ADR is required when a decision materially constrains future implementation choices.

```text
Status
Context
Decision
Consequences
Alternatives Considered
Trigger to Revisit
```

`Trigger to Revisit` is mandatory when the decision is intentionally temporary, deferred, or scale-dependent.

```text
revisit when metric X exceeds threshold Y
revisit when a second consumer appears
revisit when operational cost crosses threshold
revisit when the current binding no longer satisfies the intent
```

It is what stops a deferred decision from becoming a forgotten one.

---

# 27. Complexity budget

Complexity must be earned. Before introducing a meaningful new abstraction, dependency, runtime component, or governance mechanism:

```text
What current problem does this solve?
Why is the existing approach insufficient?
What cognitive cost does it add?
What operational cost does it add?
What is the simplest viable alternative?
What is the exit strategy?
What measurable evidence justifies it now?
```

> **Do not solve hypothetical future scale with present-day complexity.**

Projects MAY declare a numeric complexity budget in the Project Profile. The Foundation provides the mechanism, never the number.

---

# 28. Anti-Vibe-Debt

AI-generated code can be locally plausible and globally harmful.

## 28.1 Search before creating

Before creating a new

```text
service · helper · utility · repository · type · component · hook
abstraction · configuration concept
```

search for an existing equivalent.

## 28.2 No speculative abstraction

```text
interface with one implementation and no boundary justification
factory for a single object type
plugin system without plugins
generic helper used once
configurability with no current consumer
```

## 28.3 No duplicate concepts

```text
ServiceV2 · NewService · Helper2 · FinalService · UpdatedHandler · NewRepository
```

These names appear when an existing abstraction is inconvenient. The correct response is deliberate repair or replacement.

## 28.4 No drive-by refactoring

> **Minimal coherent diff.**

Unrelated improvements may be reported separately. They must not be implemented silently.

## 28.5 Preserve local style

Existing repository conventions outrank generic preferences unless they violate an explicit active rule.

## 28.6 Comments explain why

Comments preserve business intent, non-obvious constraints, platform limitations, workarounds and surprising decisions. They do not narrate obvious code.

---

# 29. No empty scaffolding

Do not create unused directories, rules, skills, agents, abstractions or config files "for later".

> **Define structure before behavior needs it. Create structure when behavior needs it.**

A specification MAY define a future convention. The repository SHOULD NOT contain empty physical scaffolding unless the scaffolding is itself executable and currently useful.

This principle governs **what is created**, not whether the specification documents where artifacts belong when they exist (§42).

---

# 30. Rule lifecycle

Rules do not only move upward toward enforcement.

```text
OBSERVE
   ↓
CANDIDATE
   ↓
PROMOTE
   ↓
ACTIVE
   ↓
MEASURE
   ├── KEEP
   ├── DEMOTE
   ├── MODIFY
   └── RETIRE
```

## 30.1 Candidate

A recurring issue has been observed but is not yet policy.

## 30.2 Promotion heuristic

```text
first occurrence   → fix the problem
second occurrence  → notice the pattern
third occurrence   → improve the system
```

Frequency is evidence, not an absolute threshold. A single serious incident MAY justify immediate enforcement.

**[Core]** A rule MUST have evidence or an explicit rationale. Valid sources include:

- observed recurring friction;
- a documented security, privacy, reliability, or operational risk;
- an architectural invariant;
- a contractual or regulatory requirement;
- an external engineering constraint;
- a serious single incident whose impact justifies immediate promotion.

Promotion MUST name its evidence or rationale.

> **No speculative rule does not mean no proactive rule.** Rules may be proactive when grounded in a known requirement or risk; they must not be invented merely because they sound like generic best practice.

## 30.3 Promote

A candidate becomes a core instruction, scoped rule, skill, enforcement, stack binding or project parameter — decided by the placement (§16) and allocation (§7) tests.

## 30.4 Measure

Periodically evaluate continued relevance, repeated violations, duplication, context cost, and whether deterministic enforcement has become available.

## 30.5 Demote

```text
global → scoped
core instruction → skill
blocking enforcement → advisory
```

## 30.6 Retire

Retire when the underlying problem no longer exists, the architecture changed, enforcement moved elsewhere, the rule became redundant, or it causes more friction than value.

Retired rules MUST NOT remain in active context.

---

# 31. Waiver mechanism

**[Core]** Deviations MUST be visible.

```yaml
rule_id: AIEF-CORE-001
scope: "<limited scope>"
reason: "<why the exception is required>"
owner: "<responsible owner>"
created_at: "<date>"
expires_at: "<date or null>"
tracking_ref: "<optional reference>"
risk: "<optional note>"
```

1. A waiver MUST reference a rule ID.
2. A waiver MUST be scoped.
3. A waiver MUST contain a reason.
4. A temporary waiver SHOULD have an expiry.
5. An expired waiver is a governance failure, not a grace period.
6. Provider-local hidden exceptions are forbidden.
7. A waiver changes enforcement for a scope. It never rewrites the Foundation.

---

# 32. Deterministic enforcement

If a machine can check a rule reliably, the preferred end-state is machine enforcement.

```text
formatting · lint · types · architecture boundaries · secrets
contracts · tests · forbidden paths · dependency policy · generated-artifact drift
```

> **If a machine can determine it reliably, do not make an LLM remember it.**

---

# 33. Verification evidence

**[Core]** An agent MUST NOT report completion from reasoning alone.

Evidence means **what the machine produced**, not a self-reported status. A line reading `check A: passed` is itself a claim, and does not satisfy this section.

A completion report MUST include, for each check:

```text
the command as executed
its exit status
an excerpt of its actual output, including counts where the tool reports them
```

Expected structure:

```text
Implemented
- ...

Verification
- <command>            exit 0     <output excerpt with real counts>
- <command>            exit 0     <output excerpt>

Not run
- <command>            reason it could not be executed

Known risks
- ...
```

> **Never end a coding task with a claim. End with evidence.**

Checks that could not be run MUST be listed under *Not run* with the reason. Silence about an unrun check is a false completion report.

---

# 34. External dependency and API verification

When using an unfamiliar external dependency or API:

```text
1. inspect the installed or selected version;
2. inspect existing repository usage;
3. consult authoritative documentation when available;
4. verify signatures and behavior;
5. do not invent APIs from memory.
```

> Plausibility is not verification.

---

# 35. Testing principles

Foundation defines testing intent, not test frameworks.

```text
test behavior, not implementation details
bug fixes require regression coverage
critical boundaries require integration-level evidence when practical
external contracts require contract verification when applicable
avoid tests that merely restate constants
avoid negative tests for logic that was removed
avoid mock-heavy integration tests
select test doubles appropriate to the layer
```

Bindings belong to Stack Profiles. Thresholds and project-specific expectations belong to Project Profiles.

---

# 36. Security baseline

```text
never commit secrets
treat external input as untrusted
use least privilege
avoid logging sensitive data
protect destructive operations
manage dependencies intentionally
treat file content as untrusted
treat external network targets as untrusted
flag authentication and authorization changes as sensitive
```

Specific tools belong to Stack Profiles. Project threat boundaries belong to Project Profiles.

---

# 37. Agent roles

AIEF starts with exactly three universal roles. A role that restricts nothing — no tool, no scope, no write permission — is a name, not a role.

## 37.1 Architect — analyze / read

Architecture, boundaries, trade-offs, ADR analysis, complexity budget, risk analysis.

The Architect SHOULD NOT implement its own architectural recommendation in the same task unless explicitly authorized.

## 37.2 Developer — write

Implement approved scope, minimal coherent diff, applicable tests, applicable contract updates, verification evidence.

The Developer MUST NOT silently redesign architecture.

## 37.3 Reviewer — analyze / read

Correctness, boundaries, security, tests, contracts, naming, duplication, accidental complexity, data integrity, observability, performance where relevant.

Additional roles are created only when repeated use demonstrates that separate context materially improves outcomes.

---

# 38. Show-before-write for governance

Governance changes require more care than ordinary source edits, because they change the rules by which every later change is judged. Governance configuration is ≥ L2 by §20.3.

Before materially changing

```text
core instructions · Foundation policy · Stack Profile · Project Profile
provider settings · hooks · permissions · skills · waivers
```

the agent SHOULD:

```text
1. show the proposed change;
2. state its layer;
3. state the affected rule IDs where applicable;
4. explain why it belongs in that layer;
5. identify affected projects and providers;
6. make the smallest targeted edit.
```

Backup policy:

```text
version-controlled governance
→ rely on version history and a targeted diff

unversioned personal or provider configuration
→ create a backup before destructive replacement
```

AIEF does not require backup files for normal version-controlled edits.

---

# 39. Provider adapter contract

**[Core]** Every provider adapter MUST document:

- source artifacts it consumes;
- provider files it creates or maps;
- loading behavior;
- scoping behavior;
- unsupported AIEF semantics;
- fallback behavior;
- known scope and loading pitfalls;
- verification method.

Provider-specific traps belong here, not in the Foundation. A common class worth documenting: mechanisms that grant a tool **access** to a directory without **loading** that directory's instructions — access and instruction loading are distinct, and confusing them yields an agent reading code without its rules.

---

# 40. Stack Profile contract

A Stack Profile is not a single Markdown file.

```text
stacks/<stack-slug>/
├── profile.yaml
├── rules.md
└── bindings/
```

Create only the files that profile actually needs.

## 40.1 `profile.yaml`

```yaml
name: "<stack>"
version: "<version>"

capabilities:
  format:             { supported: true }
  lint:               { supported: true }
  typecheck:          { supported: false }
  test:               { supported: true }
  architecture_check: { supported: false }
  contract_check:     { supported: false }

signals:
  large_file_loc: <number>
  large_diff_loc: <number>
```

**[Core]** A capability that the ecosystem cannot verify MUST be declared `supported: false`. A declared gap is information; a silent gap becomes an orphan rule (§12.1).

## 40.2 `rules.md`

Stack-specific standing conventions valid across every project using the stack.

## 40.3 `bindings/`

Executable or declarative bindings for Foundation intents:

```text
capability · command · required files · expected output
failure semantics · provider integration hints
```

The exact binding format is implementation-specific.

---

# 41. Project Profile contract

```yaml
project:
  id: "<project>"
  name: "<name>"

foundation:
  version: "0.3.1"
  conformance: core          # core | full

stacks:
  - "<selected profile>"

risk_flags:
  enabled:
    - "<flag>"
  project_specific:
    - "<flag>"

quality:
  capabilities:
    format: required
    test: required
    lint: required
  signals:                   # overrides stack defaults
    large_file_loc: <number>

governance:
  waivers: "<location>"
  baseline: "<location>"
```

Project architecture, glossary and rule parameters MAY live in separate files referenced by the profile.

There is no default Change Level. Every change is classified (§20).

---

# 42. Repository structure

**[Core]** AIEF does not prescribe a tree to materialize. It prescribes **where an artifact belongs once it exists**. Combined with §29, the rule is: create nothing speculatively, but when an artifact does exist, it has exactly one correct location.

Conditional structure — each entry appears only when the project actually has it:

```text
<repository>/
│
├── <agent entry point>                  when any agent is used
│                                        small, derived provider-neutral projection
│                                        not an independent policy source
│
├── <provider files>                     one per provider actually in use
│                                        projections only, never policy
│
├── .ai/                                 when governance artifacts exist
│   ├── project.yaml                     Project Profile — always, once adopted
│   ├── architecture.md                  when the project has declared boundaries
│   ├── glossary.md                      when the domain has established terms
│   ├── rules/                           when project-specific rules exist
│   ├── waivers/                         when at least one waiver exists
│   ├── baseline/                        when adopting into an existing repo
│   └── effective-config.<ext>           AIEF-Full: generated, never hand-edited
│
├── docs/
│   ├── adr/                             when at least one ADR exists
│   └── specs/<change-id>/               when a change requires spec/plan/tasks
│
└── <stack-native layout>                owned by the Stack Profile, not by AIEF
```

Two boundaries in this tree are load-bearing:

1. **Authored versus generated.** Anything generated from the composed source (Effective Configuration, provider projections) MUST be distinguishable from hand-authored content, so that "never overwrite authored content" is structural rather than a policy someone has to remember.
2. **AIEF versus stack.** AIEF owns governance artifacts. It does not own source layout, build output, or dependency directories — those belong to the Stack Profile and the project.

The Foundation itself does not appear in this tree. See §57.

---

# 43. Bootstrap — new project

```text
1. initialize the repository;
2. select an AIEF Foundation version and conformance level;
3. select only currently needed Stack Profile(s);
4. create a minimal Project Profile;
5. resolve the applicable composition of Foundation + Stack Profile(s) + Project Profile + active Waivers;
   - at **AIEF-Core**, the applicable configuration must be resolvable and traceable;
   - at **AIEF-Full**, it MUST be materialized as the inspectable Effective Configuration defined in §9;
6. create minimal agent instructions;
7. create provider adapters only for providers actually used;
8. establish the deterministic gates currently justified;
9. create spec/plan/tasks/ADR templates only when the workflow requires them;
10. create one walking skeleton;
11. verify that the repository passes its own gates;
12. observe real friction before adding more governance.
```

**[Core]** Step 11 is not optional. A bootstrap that leaves the repository failing the gates it just installed destroys its own credibility, and the gates are disabled before anyone understands them. If a gate cannot pass on day one, it starts advisory, not blocking.

Do not pre-create unused roles, unused skills, unused stack profiles, empty rule directories, or empty provider directories.

---

# 44. Walking skeleton

Before substantial implementation, create one minimal end-to-end path proving the applicable project mechanics:

```text
repository layout · build · tests · quality gates
provider instructions · contracts · runtime boot
```

The exact functionality is project-specific.

> **A working example is more valuable to an agent than extensive prose describing an untested pattern.**

---

# 45. Adoption — existing project

A living repository already has conventions; they are simply unwritten. Adoption that imposes its own conventions over existing code is fought and abandoned. Adoption that **extracts** what is already there, records it, and only then adds what is missing, succeeds.

```text
DISCOVER
   ↓
INVENTORY
   ↓
EXTRACT EXISTING CONVENTIONS      ← written into the Project Profile as-is
   ↓
MEASURE EXISTING DEBT
   ↓
CREATE BASELINE
   ↓
ENABLE QUALITY RATCHET
   ↓
NO NEW VIOLATIONS
   ↓
REDUCE BASELINE OVER TIME
```

**[Core]** Order of activation, least friction first:

```text
glossary and principles
   → agent instructions describing the repository's ACTUAL conventions
   → roles
   → templates and Definition of Done
   → advisory checks with baseline
   → blocking gates
```

One exception: categories with no possible legacy violation — committed secrets, destructive commands — start blocking on day one.

Existing agent instructions MUST be read and merged, never overwritten. They were written by someone with context the tooling does not have.

> Do not apply an idealized architecture to an existing project unless the project explicitly chooses to refactor. **The Foundation governs change; it does not rewrite history.**

---

# 46. Quality ratchet

> **Existing debt may be temporarily baselined. New debt must not make the baseline worse.**

A ratchet tracks:

```text
current baseline · new violations · resolved violations · remaining debt
```

**[Full]** Monotonicity MUST be enforced mechanically by violation identity whenever the underlying tool can provide stable identities.

Let:

```text
BaselineViolations = violations explicitly accepted in the current baseline
CurrentViolations  = violations detected by the current run
NewViolations      = CurrentViolations - BaselineViolations
ResolvedViolations = BaselineViolations - CurrentViolations
```

Then:

```text
if NewViolations is not empty:
    FAIL
else:
    PASS
```

A simple count comparison is insufficient: removing one old violation while adding one new violation must still fail.

Additional rules:

1. The baseline file is reviewable governance configuration; changes to it MUST appear in review (§38).
2. Adding a new violation to the baseline — including regenerating the baseline upward — MUST require a waiver (§31).
3. Removing resolved violations from the baseline is always permitted and encouraged.
4. The health check MUST report remaining debt, new violations, and resolved violations on every run.
5. If a tool cannot expose stable violation identities, the Stack Profile MUST declare the fallback comparison strategy and its limitations; count-only fallback is advisory unless the project explicitly accepts it.

**[Core]** At Core level, the same no-new-debt invariant applies by review discipline rather than mandatory tooling — but a baseline that anyone may silently regenerate is not a ratchet.

---

# 47. Configuration audit

**[Full]** A periodic audit turns recurring friction into configuration changes.

Evidence sources:

```text
AI sessions · PR comments · review findings · bugs · failed CI
human corrections · repeated prompts · rule violations · waiver history
```

Audit output:

```text
Pattern · Evidence · Frequency · Current protection
Recommended layer · Rule ID if existing · Potential enforcement
Lifecycle recommendation
```

Lifecycle recommendations: `promote · demote · scope · merge · retire · enforce · waive`

---

# 48. Configuration health

**[Full]** A health check MUST detect:

- duplicate instructions;
- contradictory rules without an active waiver (§11.2);
- oversized always-loaded context;
- stale rules;
- expired waivers;
- orphan rules (§12.1);
- orphan enforcement (§12.2);
- unused roles and skills;
- provider projection drift;
- Stack Profile binding drift;
- Project Profile references to unsupported capabilities;
- conformance claims not satisfied by the implementation (§4.3).

> Configuration is technical debt if unmanaged.

---

# 49. Definition of Done

A task is complete only when all applicable conditions are satisfied.

```text
implementation complete
acceptance criteria satisfied
applicable tests executed and passing
applicable formatter, lint and type checks passing
applicable architecture checks passing
applicable security checks passing
public contracts updated where needed
documentation updated where needed
no unrelated changes
verification evidence reported per §33
unverified areas explicitly disclosed
declared Change Level and Risk Flags satisfied
```

DoD is resolved from:

```text
Foundation intent + Stack bindings + Project parameters + Change Level + Risk Flags
```

**[Core]** An agent MUST NOT conceal tests not executed, commands unavailable, partial failures, environment limitations, or uncertainty.

---

# 50. Engineering signals and thresholds

The Foundation names the **signals**. It does not set universal numbers.

```text
large file
large non-mechanical diff
high number of touched modules
broad public API surface
high number of unrelated changes
```

**[Core]** Every signal used by a project MUST have a numeric threshold defined somewhere:

```text
Stack Profile   provides the default        (profile.yaml → signals)
Project Profile overrides it when justified (project.yaml → quality.signals)
```

A signal with no threshold anywhere is not computable and MUST NOT be referenced by a rule.

Signals produce warnings and review attention, not hard blocks — generated files, migrations, fixtures and schemas legitimately exceed any threshold, and a blocking counter teaches agents to split files arbitrarily to satisfy it.

The underlying principle is not a number:

> **One clear reason to change per file.**

Metrics are heuristics, not goals to game.

---

# 51. Universal engineering principles

1. **Understand before modifying.** Read enough to know why the current system exists in its present form.
2. **Complexity must be earned.** No architecture for hypothetical requirements.
3. **Prefer explicit contracts.** Important boundaries declared and, where practical, machine-verifiable.
4. **Preserve established language.** No synonyms for established project concepts.
5. **Minimal coherent change.** Solve the requested problem without unrelated modifications.
6. **Test behavior.** Verification should survive implementation refactoring where practical.
7. **Secure boundaries.** Untrusted data is treated as untrusted where it enters.
8. **Evidence over confidence.** Completion requires verification.
9. **Progressive disclosure.** Load knowledge only when useful.
10. **Configuration evolves from evidence.** Repeated friction improves the system.
11. **Prefer deletion over accidental abstraction.**
12. **Humans own architectural authority.** AI may recommend; authority remains explicit.
13. **Personal configuration is never load-bearing.**
14. **Exceptions must be visible.**
15. **Existing debt does not justify new debt.**
16. **A rule without deterministic enforcement is advisory; label it honestly.**

---

# 52. Minimum implementation artifacts

```text
Foundation reference (version + conformance level)
Project Profile
selected Stack Profile(s)
minimal agent instruction entry point
provider adapter(s) actually in use
spec/plan/tasks templates if the workflow requires them
ADR template if any ADR exists
waiver registry if any waiver exists
baseline if adopting into an existing repository
```

Physical files are created only when currently useful (§29), in the locations defined by §42.

---

# 53. Explicitly avoided

```text
provider-specific policy becoming the source of truth
empty scaffolding
dozens of pre-created roles
dozens of unused skills
giant always-loaded instruction files
stack examples leaking into normative Foundation policy
project values leaking into Stack Profiles
generic "best practice" abstractions
architecture selected without project requirements
new technology without evidence
rules that only ever accumulate
hidden exceptions
personal configuration required for the project to work
historic debt causing instant full-repository gate failure
AI review treated as deterministic enforcement
invented external APIs or method signatures
mandatory heavy process for trivial changes
self-assigned change levels with no floor or ratchet
completion reports asserting success without machine output
conformance claimed without satisfying its requirements
```

---

# 54. Validation criteria

AIEF v1 is not stable until it has been applied to at least three materially different projects, including at least one existing repository with accumulated debt.

Success condition:

```text
0 edits are required inside the normative Foundation
when applying it to each validation project.
```

Allowed differences:

```text
Stack Profiles · Project Profiles · provider adapters
provider projections · project-specific rules · project-specific waivers
```

> If a project requires editing Foundation policy to accommodate ordinary stack or project differences, the layer boundary is wrong.

---

# 55. Layer-boundary tests

**[Full]** Implementations MUST provide checks for:

## 55.1 Foundation contamination

Foundation must not contain project names, project-specific domain concepts, stack-specific commands, stack-specific libraries, or provider-specific operational commands.

## 55.2 Stack contamination

A Stack Profile must not contain a specific project's module graph, domain terms, endpoints, or architecture parameters.

## 55.3 Project leakage upward

A Project Profile must not require Foundation edits.

## 55.4 Provider truth drift

Provider projections must be reproducible from the composed source, or explicitly linked back to it.

---

# 56. Versioning

```text
Foundation        0.x experimental · 1.x stable
Stack Profiles    version independently
Project Profiles  owned by each project
Provider adapters version independently when tool behavior changes
                  without changing engineering policy
```

Breaking changes to Foundation semantics require a major version after v1.

---

# 57. Distribution: referenced, not copied

**[Core]** The Foundation is **referenced by version**, never vendored into a project repository.

```yaml
foundation:
  version: "0.3.1"
  conformance: core
```

A project repository contains its Project Profile, its selected Stack Profile references, its waivers, its baseline and its provider projections. It does not contain a copy of this document.

The reasoning is §13: a multi-thousand-line normative specification inside every repository is precisely the always-loaded context the Foundation exists to prevent.

What an agent consumes during normal project work is the **small derived entry point plus the composed rules that actually apply**, not the full Foundation specification.

The normative source of truth remains:

```text
referenced Foundation version
+ selected Stack Profile(s)
+ Project Profile
+ active Waivers
```

Implementations MAY cache or vendor the Foundation for offline or reproducible builds, provided the cached copy is marked generated, is never hand-edited, and is not injected wholesale into normal agent context.

---

# 58. Normative vs non-normative content

The Foundation document is **normative and technology-neutral**.

**[Core]** Technology-specific examples MUST live outside the normative Foundation.

```text
foundation/     normative content only
examples/       non-normative examples
stacks/         real Stack Profiles
providers/      real provider adapters
appendices/     non-normative background and attribution
```

> Examples must never silently become Foundation policy.

---

# 59. Implementation scope for v0.3.1

## Foundation

```text
normative specification · conformance levels · allocation test
intent/binding/parameters model · Change Level model (L0–L4)
classification governance · Risk Flag model · rule lifecycle
conflict precedence · waiver contract · context-budget rules
anti-vibe-debt rules · verification evidence contract · role semantics
provider adapter contract · Stack Profile contract · Project Profile contract
repository structure · baseline/ratchet migration model
```

## Initial reusable capabilities

Create only Stack Profiles, provider adapters and skills that have an **immediate consumer**.

Do not create artifacts solely because they may be useful later.

---

# 60. Relationship with project-specific specifications

A project using AIEF declares:

```text
Foundation version · conformance level
selected Stack Profile(s) · Project Profile · active provider adapter(s)
```

Its architecture specification then covers only project-specific concerns, and MUST NOT repeat:

```text
generic agent governance · generic verification philosophy
generic anti-vibe-debt · generic rule placement · generic configuration lifecycle
```

Those are inherited.

---

# 61. Appendix A — Reference influences (non-normative)

This appendix is explicitly non-normative and exists for traceability: a borrowed idea should be checkable against its source.

| Source | Ideas drawn on |
|---|---|
| **Langfuse** | A repo-owned, tool-neutral directory as the source of agent behavior; a first-class architecture-principles document; progressive disclosure with delegation to specific files; generating per-tool configuration from one neutral source |
| **Trigger.dev** | A small number of focused agent roles rather than many; minimal-diff discipline; preferring real dependencies over mocks in integration tests; fast type-level verification as a distinct signal from build |
| **OpenAI Codex repository** | Measurable engineering limits; explicit verification evidence; keeping public surfaces small and modules private by default; concrete test anti-patterns such as not testing statically defined values |
| **TechRemoteHub/Claude-Setup** | The instruction-placement decision tree; context-budget thinking; path-scoped rules; personal-versus-project configuration; show-before-write; recurring-friction-driven configuration evolution; avoiding empty scaffolding; the distinction between hard requirements and polite requests |

These influence the design. They are not dependencies and do not define AIEF semantics.

---

# 62. Changelog — v0.2 → v0.3

Every change closes a specific review finding.

| Finding | Change | Sections |
|---|---|---|
| **N1** Repository structure removed entirely — over-correction | Restored as a **conditional** structure: where an artifact belongs *once it exists*, not a tree to materialize. Adds the authored-versus-generated and AIEF-versus-stack boundaries | **§42 new**; §29 clarified; §52 references it |
| **N2** L0–L4 requested, L0–L3 delivered; reversibility and coordination listed as level dimensions but never differentiating a level | **L4 restored** on the correct axis: irreversible or externally coordinated — the change that reverting the repository cannot undo. Human authorization required | **§19 extended**; §20.3 floor |
| **N3** Central mechanisms all SHOULD; conformance unfalsifiable | **Conformance levels** AIEF-Core and AIEF-Full, with explicit MUST lists, RFC 2119 keywords, and per-statement [Core]/[Full] tags. Declared in the Project Profile; unmet claims are a health-check failure | **§4 new**; §2 goal 11; §41; §48 |
| **N4** Change Level self-assignable and gameable | **Classification governance**: declared before work and visible, ratchet only rises, category floors, and only a human may lower a level | **§20 new** |
| **N5** §31 permitted exactly what it forbade — `check A: passed` is a claim, not evidence | Evidence redefined as command, exit status and real output excerpt. Unrun checks must be listed with reasons | **§33 rewritten** |
| **N6** Ratchet had counters but no mechanism | Monotonicity enforced: baseline growth fails the check; baseline is reviewable configuration; upward regeneration requires a waiver; remaining debt reported every run | **§46 rewritten** |
| **N7** Contradictions detected but with no consequence | Precedence order defined; unwaived contradiction fails rather than warns; overrides recorded rather than silently deleted | **§11 new**; §48 |
| **N8a** Named references genericized, losing traceability | Named attribution restored in a **non-normative appendix**, using the home §58 already created. The prohibited architectural-pattern reference stays out | **§61 new**; §58 |
| **N8b** §47 signals had no thresholds anywhere, so nothing was computable | Ownership assigned: Stack Profile provides defaults, Project Profile overrides. A signal with no threshold may not be referenced by a rule | **§50 rewritten**; §40.1; §41 |
| **N8c** `change_policy.default_level` invited skipping classification | Removed. Every change is classified | **§41** |
| **N8d** DoD said tests "executed", not passing — read as a loophole | Changed to executed **and passing**; disclosure obligations made normative | **§49** |
| **N8e** §28 duplicated §27's promotion trigger | Folded into the lifecycle as §30.2, with the requirement that promotion name its evidence | **§30.2** |
| **N8f** Unclear whether the Foundation is copied into projects or referenced | Referenced by version, never vendored — with the context-budget reasoning made explicit | **§57 new** |
| — | Placement tree lacked a terminating discard branch, letting anything become an instruction | §16 |
| — | Roles could be decorative | §37 opening: a role that restricts nothing is a name |
| — | Stack capability gaps could become silent orphan rules | §40.1: unverifiable capabilities must be declared unsupported |
| — | Adoption skipped extracting existing conventions before imposing new ones | §45: extraction step, activation order, merge-never-overwrite |
| — | Bootstrap could leave a red repository | §43 step 11 made normative |
| — | Provider pitfalls had a home but no illustration of the class | §39: access-without-instruction-loading named as a class to document |
| — | Test anti-patterns incomplete | §35: negative tests for removed logic |
| — | Principle set had no statement about unenforced rules | §51.16 |

**Unchanged and carried forward:** the three-layer model, orthogonal provider projection, allocation test, intent/binding/parameters, Effective Configuration, orphan detection, context budget, progressive disclosure, instruction primitives, scoped rules, personal-versus-project configuration, risk flags and escalation, review severity, workflow, spec/plan/tasks, ADR policy, complexity budget, anti-vibe-debt, no empty scaffolding, waivers, deterministic enforcement, external-API verification, security baseline, roles, show-before-write, contracts for stack and project, walking skeleton, audit, health, validation criteria, layer-boundary tests, versioning, normative separation.

---

# 63. Changelog — v0.3 → v0.3.1

v0.3.1 is a **consistency and implementation-readiness patch**. It does not redesign the three-layer architecture.

| Finding | Change | Sections |
|---|---|---|
| Core waivers required `rule_id`, while stable IDs were mandatory only at Full | Core now requires stable IDs for rules that are enforced, waived, referenced, or baselined; Full still requires IDs for all governing rules | **§10** |
| Quality Ratchet could pass when one old violation was exchanged for one new violation | Ratchet now compares violation identity (`Current - Baseline`) where supported; any new identity fails. Count-only fallback must be declared and is advisory by default | **§46** |
| Rule promotion was restricted to observed incidents, preventing proactive rules grounded in known risk or obligation | Promotion now accepts observed friction, documented risk, architectural invariant, contractual/regulatory requirement, external constraint, or serious incident. Speculative rules remain prohibited | **§30.2** |
| Mid-work level lowering was both prohibited and allowed | AI may only reclassify upward. A human may lower with explicit recorded justification | **§20.2** |
| Risk example showed `L0 + sensitive-data` despite the L1 floor | Example corrected; any active Risk Flag makes L0 invalid | **§21** |
| Core conformance said only non-trivial changes are classified, while the rest of the spec classifies every change | Core now requires classification of **every** change, including L0 | **§4.1 C6** |
| Bootstrap required a materialized Effective Configuration even though that is Full-only | Core resolves and traces applicable composition; Full materializes the inspectable Effective Configuration | **§43** |
| Repository tree called the agent entry point canonical, risking a second source of truth | Entry point is explicitly a **derived provider-neutral projection**; policy source remains Foundation + Stack + Project + Waivers | **§42, §57** |
| Governance changes could be read as automatically L4 | Governance remains ≥L2; it reaches L4 only when irreversible or externally coordinated | **§19** |
| Principle implied every unenforced rule is merely a preference | Reworded: an unenforced rule is **advisory** and must be labeled honestly | **§51.16** |

**Implementation decision:** v0.3.1 is the baseline for **AIEF-001 — Init & Composition Engine**. Further changes to AIEF-000 should be driven primarily by implementation or dogfooding evidence rather than additional speculative expansion.

