---
name: pdk-design
description: Use when what to build is known but how is not — choosing architecture or stack, making or replacing a significant technical decision (ADR), or splitting accepted requirements into tasks with a recommended model level. Compares at least two alternatives against the project's constraints, drafts ADRs and pdk/knowledge/architecture.md for the human to accept, and creates tasks with pdk task new. Not for clarifying requirements (pdk-discover) or implementing a task (pdk-deliver).
---
# pdk-design — architecture, decisions, plan

Purpose: make the significant technical choices explicit, get them accepted,
and turn them into tasks that a cheaper or stronger model can execute and verify.

## When to use / not

- Use: "which stack / architecture?", "plan the work", a task needs a decision
  nobody has made, an accepted ADR no longer fits and must be replaced.
- Not: the problem or scope is unclear (pdk-discover first); the decision is
  already accepted and only needs implementing (pdk-deliver).

Talk to the human in their language. Task titles follow the human's language;
if that is not English, also add an English alias (`pdk find` is lexical).

## Inputs

Mandatory docs; `requirements*.md` (prefer `current`; if only `draft`, say that
the design rests on unaccepted requirements and ask whether to proceed);
`project.md` Constraints; `decisions/*.md`; `architecture.md` if present;
research in scope (background, not rules); for an existing project, the code.
Until `pdk resolve` exists, route by hand: mandatory → canonical/current docs
whose `scope` matches → the task's `links`.
Paths here are PDK defaults; if `pdk.json` `paths` differ, use those.

## Steps

1. **Anchor to a task** (`pdk task show <id>` or `pdk task new "Design: <area>"`
   with Goal/Acceptance written into the file); set it active with
   `pdk task update <id> --revision <N> --status active`.
2. **List the decisions to make.** Significant = hard to reverse, shapes many
   tasks, or fixes stack, data model, interfaces or deployment. Small reversible
   choices are made in code, not in ADRs.
3. **Compare alternatives** — at least two real options per decision (include
   the simplest one that could work). For each: how it meets the requirement ids
   and constraints, cost, risk, what it rules out, what is fact vs assumption.
   Ask about stack preferences only when the constraints do not decide.
4. **Draft an ADR per decision**: `pdk/knowledge/decisions/ADR-NNNN-<slug>.md`,
   NNNN = highest existing number + 1, four digits. Copy `templates/ADR.md`
   from the toolkit package (`$(npm root -g)/project-development-kit/templates/ADR.md`);
   if unavailable, use `.agents/skills/pdk-design/references/adr.md`. Replace `{{date}}`, fill `scope`.
   It stays `status: draft` until accepted.
5. **Draft `pdk/knowledge/architecture.md`** (`type: canonical`, `status: draft`,
   `scope: [project, architecture]`): Overview, Components and responsibilities,
   Data and interfaces, Key decisions (links to ADRs), How quality requirements
   are met (by requirement id), Risks and open questions. Pending decisions are
   marked `pending ADR-NNNN`, never stated as settled. Keep it short; detail
   belongs in ADRs and code.
6. **Present and get acceptance.** Summarise each decision in two lines with
   the trade-off. Only an explicit yes accepts: then set that ADR (and
   architecture.md, when all its decisions are accepted) to `status: current`,
   add a Status log line `- <date> accepted by <human>`. Rejected: set
   `type: historical`, `status: archived`, log the reason; it stays in place.
   Offer to add `architecture.md` to `mandatory` in `pdk.json`; add it only on yes.
7. **Replacing a decision** (only after the new ADR is accepted): new ADR gets
   `supersedes: [ADR-000K-<slug>.md]`; the old one stays in `decisions/` with
   `type: historical`, `status: superseded`, `superseded_by: ADR-000M-<slug>.md`
   and a Status log line. Paths are relative to the file. Update links in
   architecture.md.
8. **Break down into tasks.** One task = one verifiable outcome, a few sessions
   at most. For each:
   `pdk task new "<title>" --scope <areas> --alias "<words>" --model "<level> —
   <reasoning>" --depends T-000x --link pdk/knowledge/decisions/ADR-NNNN-<slug>.md`.
   `pdk task new` only creates the skeleton: then edit the file and write
   `## Goal` (what and why, requirement ids) and `## Acceptance` (checkable
   items, plus a `Verification:` line saying how the result will be checked).
9. **Validate.** `pdk check` 0 errors (broken `links`/`depends_on` show up here).
10. **Checkpoint** the design task (pattern: pdk-deliver, "Checkpoint"):
    accepted vs draft decisions, tasks created; `--next` = first task to deliver
    or the decision still waiting for the human.

## Model levels for `--model`

| level | work | model class, reasoning |
|---|---|---|
| L1 | narrow edits to an exact spec (config, rename, copy, docs) | small/fast, low |
| L2 | implementation to a spec, with tests that define done | mid-tier, medium |
| L3 | logic with many edge cases, concurrency, migrations, security | strongest general, high |
| L4 | architecture, audit, acceptance, cross-cutting review | strongest available, high |

Write it as `"L2 — medium: spec in ADR-0003 is exact, tests decide done"`.
In Acceptance, say why that level is enough and when stronger verification is
needed: a cheaper level is never assumed to be as good — below L3 on anything
risky, add "independent pdk-review at L3/L4" or tests that assert the behaviour.

## Approval points

| mode | ask before |
|---|---|
| assisted | accepting any ADR, stack or architecture; creating the task plan (show the list first) |
| auto | accepting ADRs/stack/architecture; drafts and task creation proceed and are reported |
| manual | each step; propose, write when asked |

## Done criteria

- Each significant decision has an ADR with ≥ 2 alternatives and consequences.
- Nothing is `current` without an explicit human yes; drafts are reported as drafts.
- Every task has Goal, Acceptance with a Verification line, `--model` with a
  reason, aliases, scope, and links to the decisions it implements.
- `pdk check` 0 errors; checkpoint written with `--next`.
