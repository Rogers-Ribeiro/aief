---
name: create-plan
description: Turn an approved specification into an implementation plan and a task breakdown. Use after a spec is agreed and before writing code, when the change is large enough that the order of work matters.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Plan an approved specification

A plan answers **how**. It exists so that the sequence, the boundaries touched and the
verification strategy are agreed before anyone is emotionally invested in a particular
implementation.

## Before writing

Read the approved spec. If the spec's acceptance criteria are not falsifiable, fix that first —
planning against vague criteria produces tasks nobody can call done.

## Structure

```text
1  Approach            the shape of the implementation, and the one alternative you rejected
2  Boundaries touched  which modules, contracts and public surfaces change
3  Migration           data, config or consumers that need moving, and the rollback
4  Verification        how each acceptance criterion gets evidence
5  Decisions needing an ADR
```

## Tasks

Break the work into units that can each be verified on their own. A task is the right size when
you can say what command proves it worked.

```text
too big     "implement the resolver"
right       "an enforced rule with no binding fails composition, with a test"
too small   "add an import"
```

Order them so the repository is green between tasks wherever that is possible. Where it is not,
say so explicitly rather than discovering it halfway through.

## Naming the ADRs early

A decision that constrains future implementation choices needs its own record, and the plan is
where you notice it. A dependency added, a boundary moved, a format published, a guarantee
weakened — each of those is an ADR, not a paragraph in the plan.

## Where it goes

`docs/specs/<id>-<slug>/plan.md` and `tasks.md`, alongside the spec.
