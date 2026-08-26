---
name: config-audit
description: Turn recurring engineering friction into governance changes, at the right layer. Use every few weeks, or when the same correction keeps coming up in sessions and reviews. Produces evidence-backed proposals, never speculative rules.
disable-model-invocation: true
argument-hint: [last N sessions | since <date> | this project]
allowed-tools: Read, Glob, Grep, Bash(aief compose*), Bash(aief health*), Bash(git log*)
---

# Configuration audit

Find the things that had to be said more than once, and decide whether each one belongs in
configuration — and if so, in which layer.

The output is proposals with evidence attached. Nothing here writes a rule.

## Gather evidence first

```text
session corrections     the same instruction repeated to an agent
review comments         the same note left on more than one pull request
defects                 bugs whose cause was a convention nobody enforced
failed CI               the check that keeps catching the same class of mistake
waiver history          waivers renewed rather than resolved
```

A pattern needs a count. "This comes up a lot" is not evidence; three linked pull-request
comments are.

## The promotion thresholds

```text
2 occurrences   candidate for a convention
3 occurrences   candidate for a skill, or for deterministic enforcement
```

Below the threshold, record it and wait. A rule written from one incident is a rule written
from an anecdote.

## Deciding the layer

For each pattern, ask which layer the statement is true in:

```text
true for any project, any stack    Foundation intent
true for this ecosystem            Stack Profile binding
true for this repository only      Project Profile parameter
true only for one provider         a projection, and probably not a rule at all
```

Getting this wrong is expensive in one direction specifically: a project-specific truth placed
in the Foundation contaminates every project that ever adopts it.

## Then ask whether it should be a rule at all

```text
enforceable by a tool     bind it — an enforced rule needs something that enforces it
a repeated procedure      a skill, not a rule
a one-time correction     neither; fix the instance
already covered           strengthen the existing rule, do not add a second one
```

Run `aief compose --verbose` and `aief health` before proposing anything. The rule you are
about to add may already exist, may already be advisory for a reason, or may be an orphan
whose binding disappeared.

## What each proposal must carry

```text
evidence         links, not impressions
frequency        the count
current state    what protects against this today, if anything
proposed layer   and why that layer and not the one above
existing rule    the ID, if this strengthens rather than adds
enforcement      the command that would check it, or "none, advisory"
lifecycle        promote | demote | rescope | merge | retire | enforce | waive
```

A proposal with no evidence is a preference. Say so and drop it rather than dressing it up.
