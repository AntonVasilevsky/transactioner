# Discovery interview guide

Ask in the human's language, 2–4 questions at a time, starting with the group
where the answers are thinnest. Skip any question the vault or the code already
answers — quote the answer and ask only whether it is still true.

Stop when two consecutive answers do not change the requirements draft. Do not
aim to fill every group; aim for a draft that could be accepted.

## Problem

- What happens today without this? What is painful, slow, costly or risky?
- What triggers the need now?
- What would the human do if this never got built?

## Users

- Who uses it first? Who else is affected (admins, customers, other systems)?
- What do they already use, and what must keep working for them?
- How many users or how much data, roughly, in the first year?

## Success

- What is the smallest v1 that would be worth using?
- How will we know it works: which observable result, which number?
- What would make the human call v1 a failure?

## Constraints

- Deadline, budget, team, hosting or platform limits that are fixed.
- Legal, privacy, security or data-residency requirements.
- Existing systems, data or APIs it must integrate with or must not touch.
- Technology that is already fixed by someone else (record, don't propose).

## Non-goals

- What looks related but is explicitly not part of v1?
- What will be done by hand or by another tool instead?

## Risks

- What is most likely to be wrong in our assumptions?
- Which unknown would change the design the most? (→ research or a spike task)
- What cannot be undone once built (data formats, public APIs, contracts)?

## After each batch

- Put answers into `project.md` or `requirements.md` immediately.
- Turn each unresolved point into one line under Open questions.
- Turn each "I don't know, it depends on X" into a research topic only if the
  answer changes a requirement.
