# Defect checklist

Apply to changed code and to the callers you expanded to. Each "no" or
"unsure" is a candidate finding; confirm it before reporting.

## Correctness

- Does the code do what the Acceptance and the cited requirement ids say,
  for the normal case and the documented variants?
- Are all branches of a changed condition still reachable and correct?
- Did a refactor change behaviour (order, defaults, rounding, time zones,
  encoding, case sensitivity)?
- Do callers still pass what the new signature or contract expects?

## Boundary conditions

- Empty, single, very large inputs; zero, negative, maximum values.
- Missing optional fields, `null`/`undefined`/`None`, empty strings.
- Off-by-one in ranges, pagination, slicing, loop bounds.
- Unicode, whitespace, path separators, locale and date formats.

## Error handling

- Are errors from I/O, network, parsing and external calls handled or
  deliberately propagated? Nothing swallowed silently?
- Is partial work cleaned up or made safe (no half-written files/records)?
- Do error messages say what failed and with which input, without leaking secrets?
- Are retries bounded and idempotent?

## Concurrency and state

- Shared mutable state, caches, globals: can two callers interleave badly?
- Read-modify-write without a lock, version or transaction?
- Async code: missing `await`, unhandled rejection, ordering assumptions?
- Resources (files, connections, timers) always released?

## Security basics

- Untrusted input reaching a shell, SQL, file path, template, eval or URL?
- Authentication/authorization checks present on every new entry point?
- Secrets hard-coded, logged, or committed?
- New dependencies justified and **pinned** (`"latest"`, `*` or a bare range in a
  fresh manifest is a major finding: the build is not reproducible)?
- Build/test tooling in `devDependencies`, runtime libraries in `dependencies`?
- Paths and symlinks: can input escape the intended directory?

## Tests that actually assert

- Would each new test fail if the change were reverted?
- Does it assert the behaviour (values, errors, side effects), not just
  "no exception"?
- Are edge cases from the sections above covered where they matter?
- Were existing tests weakened, skipped or deleted? Why?

## Docs drift

- Does any canonical doc or ADR in scope now describe different behaviour
  than the code? (Report it; the requirement is not automatically wrong.)
- New config keys, commands, env vars or public interfaces documented?
- Task links and ADR references still point to existing files?

## Delivery hygiene

- `git status`: is the reviewed work committed? A task marked `done` with
  uncommitted changes or an empty `commits` field is a major finding.
- Does the task's Checkpoint match the diff (files listed = files changed)?
- Generated output (`dist/`, `build/`, `node_modules/`) ignored, not committed?

## OCR rule categories

`pdk review-ocr` group rules (OpenCodeReview) also ask for: typos in names and
messages, dead code, duplication, hardcoded business values/URLs, `var`,
loose equality (`==`/`!=`). Treat them as minor/nit unless they cause a bug.
