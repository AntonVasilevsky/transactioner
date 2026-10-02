# ADR structure (fallback when the toolkit template is unavailable)

File: `pdk/knowledge/decisions/ADR-NNNN-<slug>.md` — NNNN is the highest
existing number + 1, four digits; slug is a few lowercase words with hyphens.

```markdown
---
title: "ADR-NNNN: <decision in a few words>"
type: canonical
status: draft
scope: [<areas this decision governs>]
updated: <YYYY-MM-DD>
supersedes: []
---
# ADR-NNNN: <decision in a few words>

## Context
Problem, requirement ids and constraints it must satisfy (linked), unknowns.

## Decision
What we will do, stated so that code and later decisions can be checked against it.

## Alternatives considered
- **<option A>** — how it meets the constraints; why chosen / not chosen.
- **<option B>** — same.

## Consequences
What gets easier, what gets harder, follow-up tasks, risks, and the signal
that would make us revisit this decision.

## Status log
- <date> draft — proposed by <agent/human> in task <T-NNNN>.
```

Quote the title: it contains `: `, which the PDK frontmatter parser rejects unquoted.

## Lifecycle

| event | frontmatter change | Status log line |
|---|---|---|
| proposed | `status: draft` | `draft — proposed by …` |
| accepted (explicit yes) | `status: current`, `updated:` today | `accepted by <human>` |
| rejected | `type: historical`, `status: archived` | `rejected: <reason>` |
| replaced by a newer accepted ADR | `type: historical`, `status: superseded`, `superseded_by: ADR-000M-<slug>.md` | `superseded by ADR-000M` |

Decisions are never moved or deleted: they stay in `decisions/` so the "why"
remains findable. The replacing ADR lists the old one in `supersedes`.
Paths in `supersedes` / `superseded_by` are relative to the ADR file itself.

## What makes an ADR useful

- The Decision section can be checked: "all money amounts are integers in
  minor units", not "we use a good money model".
- Alternatives are real options with trade-offs against this project's
  constraints, not straw men.
- Consequences name the follow-up tasks and the risk someone must watch.
