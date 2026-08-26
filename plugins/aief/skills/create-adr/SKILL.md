---
name: create-adr
description: Record an architecture decision that constrains future choices. Use when adding a dependency, moving a boundary, publishing a format, weakening a guarantee, or choosing between approaches where the rejected one was reasonable.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Record an architecture decision

An ADR exists for the person who arrives later and wants to change this. It has done its job
when that person can tell whether their new information actually invalidates the reasoning, or
whether they are about to relitigate a settled question.

## When one is warranted

```text
yes   a dependency is added
yes   a module boundary moves, or a new one appears
yes   a format or contract becomes public
yes   a guarantee is weakened, narrowed or traded away
yes   two reasonable approaches existed and one was chosen
no    local implementation detail with no downstream constraint
no    a decision the code already states unambiguously
```

If nothing would have to change when the decision is reversed, it is not an ADR.

## Structure

```text
Status, Date, Change Level, Risk Flags
Context               what forced a decision, including the pressure against it
Decision              what was decided, in the present tense
Consequences          positive and negative, both stated plainly
Alternatives Considered   a table: each option, and why it lost
Trigger to Revisit    what new fact would reopen this
```

## The two sections people skip, and why they matter most

**Alternatives Considered** is the difference between a decision and an assertion. Each rejected
option needs the reason it lost, not a dismissal. If an alternative has no real argument against
it, the decision may be wrong.

**Trigger to Revisit** is what stops an ADR from calcifying. State the fact that would change
your mind. If you cannot name one, you have written a preference and called it a decision.

## Negative consequences are not a weakness

An ADR listing only benefits is a sales pitch. Every real decision costs something; naming the
cost is what lets the next person weigh it against a cost they are facing now.

## Where it goes

`docs/adr/NNNN-<slug>.md`, numbered sequentially. Check the directory for the next number
rather than assuming.
