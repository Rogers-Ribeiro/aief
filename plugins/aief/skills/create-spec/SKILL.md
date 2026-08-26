---
name: create-spec
description: Write a specification for a change that needs one. Use when the declared Change Level calls for a spec (typically L2 and above), before any implementation. Produces problem, scope, behaviour and falsifiable acceptance criteria — not a design document.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Create a specification

A spec answers **what** and **why**. The moment it starts answering **how**, it has become a plan
and stopped being reviewable as a statement of intent.

## Before writing

Read `.ai/project.yaml` and run `aief compose` to see what actually applies here. Do not restate
any rule the composition already carries — the spec cites them, the Foundation owns them.

Confirm the declared Change Level and Risk Flags first. They were declared before the work
started; a spec that quietly assumes a lower level than what was declared is the classification
ratchet being walked backwards.

## Structure

```text
Status, Date, Change Level, Risk Flags, ADR references
1  Problem            what is wrong now, concretely, with evidence
2  Purpose            the smallest thing that fixes it
3  Scope              what this work item touches
4  Out of scope       what it deliberately does not, and which work item owns that
5  Behaviour          observable effects, from the outside
6  Acceptance criteria  falsifiable, numbered
7  Verification       how each criterion will be shown to hold
```

## What makes the criteria worth writing

An acceptance criterion must be capable of failing. "The engine is robust" cannot fail.
"An expired waiver fails composition, naming the waiver and its rule" can, and a test can be
pointed at it.

Write the criteria before the implementation exists. Written afterwards, they describe what was
built rather than what was needed, and they always pass.

## Out of scope is not filler

The section that says what this work item will not do, and names the work item that will, is
what stops scope from drifting silently. An empty out-of-scope section usually means the
boundary has not been thought about yet.

## Where it goes

`docs/specs/<id>-<slug>/spec.md`, or wherever the resolved configuration places specs.
Check before assuming.
