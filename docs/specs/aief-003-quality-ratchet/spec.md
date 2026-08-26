# AIEF-003 — Quality ratchet

- **Status:** Draft
- **Date:** 2026-08-26
- **Foundation:** AIEF-000 v0.3.1
- **Change Level:** **L3** — the engine gains the ability to execute commands
- **Risk Flags:** `command-execution`, `file-processing`
- **ADR:** ADR-0006 (the engine may execute Stack Profile commands, under one verb only)

> Classification note per §20.1: declared before implementation. L3 because ADR-0006 changes what the engine is permitted to do, not merely what it computes.

## 1. Problem

```text
F7  enforce baseline monotonicity mechanically (§46)
```

§46 is unusually specific about why the obvious implementation is wrong:

> A simple count comparison is insufficient: removing one old violation while adding one new violation must still fail.

and about what a baseline without enforcement amounts to:

> a baseline that anyone may silently regenerate is not a ratchet.

Both failure modes are the same one. A ratchet that cannot name the individual violation it is
tracking will accept any change that keeps the total flat, which is precisely the trade a
hurried change makes.

## 2. Purpose

Deliver `aief baseline`: record the violations a repository currently accepts, and fail when
new ones appear — compared by identity, never by count.

## 3. Scope

```text
aief baseline              measure, compare against the recorded baseline, report
aief baseline --write      record the current violations as the accepted baseline
```

Supporting deliverables:

- `identities` declaration in the Stack Profile contract (§40), so a capability can say how its
  tool reports violations
- `.ai/baseline.json`: reviewable governance configuration (§46.1)
- the §46.4 report — remaining debt, new violations, resolved violations — surfaced by
  `aief health`

## 4. Out of scope

```text
AIEF-004   `aief adopt`: repository inventory and convention extraction (§45)
```

**The split matters.** §45 adoption is two jobs wearing one name. The ratchet is mechanical,
falsifiable and finishable. Inventory and convention extraction are heuristic: they guess a
repository's conventions from its contents, and a wrong guess writes a rule nobody agreed to.
Shipping them together would let the heuristic half borrow the mechanical half's credibility.

C10 — "use baseline + ratchet when adopting into an existing repository" — is satisfied by this
work item. What remains in AIEF-004 is the convenience of not writing the Project Profile by
hand.

## 5. Behaviour

### 5.1 Violation identity

A violation's identity is the triple the tool can report stably:

```text
capability :: file :: rule :: message
```

Line numbers are deliberately absent. A violation that moves down eleven lines because someone
added an import is the same violation; including the line would make every unrelated edit look
like new debt, and a ratchet that cries wolf gets regenerated away.

The cost is real and is accepted: two identical violations in one file collapse to one identity.
The ratchet therefore under-counts duplicates rather than misreporting movement.

### 5.2 The `identities` declaration

```yaml
capabilities:
  lint:
    supported: true
    binding:
      command: npm run lint
    identities:
      argv: [npx, eslint, --format, json, src, test, scripts]
      format: eslint-json
```

`argv`, never a command string: ADR-0006 constraint 4. `format` names a parser the engine
implements. A capability with no `identities` block is reported as unmeasurable — a declared
gap, not a silent zero.

### 5.3 Comparison

```text
New      = Current − Baseline      non-empty ⇒ FAIL
Resolved = Baseline − Current      always reported, always welcome
Remaining= Current ∩ Baseline
```

`--write` refuses to record a baseline that is larger than the current one by identity unless
every added identity is covered by a waiver (§46.2). Removing resolved entries is always
permitted (§46.3).

### 5.4 What the engine will not do

Per ADR-0006, `compose`, `health`, `render` and `init` execute nothing. `aief health` reports
the ratchet from `.ai/baseline.json` and the last recorded measurement; it never re-measures.

## 6. Acceptance criteria

```text
AC1   swapping one baselined violation for one new violation fails
AC2   resolving a violation without introducing one passes, and is reported as resolved
AC3   an identity is stable when a violation moves to a different line in the same file
AC4   a capability without an `identities` block is reported as unmeasurable, not as zero
AC5   `--write` refuses to grow the baseline without a waiver naming each added identity
AC6   `--write` shrinks the baseline freely when violations are resolved
AC7   commands are spawned as argv; no shell metacharacter is ever interpreted
AC8   `compose`, `health`, `render` and `init` spawn no process — asserted, not assumed
AC9   `aief health` reports remaining, new and resolved counts (§46.4)
AC10  `.ai/baseline.json` is deterministic: same violations, byte-identical file
```

## 7. Verification

Synthetic tool output for every comparison path, plus one real measurement against this
repository. AC7 and AC8 are the ones that matter most, because they are the constraints
ADR-0006 traded safety for — a constraint nothing tests is a promise, not a property.
