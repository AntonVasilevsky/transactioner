---
id: T-0013
title: "Единые подписи полей проверки привязки: Nick, Room ID, Email"
status: proposed
owner: agent
model: "L1 — low: подпись поля в форме, без изменения подстановки"
executed_by: ""
depends_on: [T-0012]
aliases: [link verification form field labels same for all rooms Nick Room ID Email]
scope: [link-verification]
links: [src/utils/linkVerificationFormatting.ts, src/components/LinkVerificationView.tsx, src/components/LinkVerificationView.test.ts]
sessions: []
commits: []
revision: 1
created: 2026-10-03
updated: 2026-10-03
---
## Goal

Требование владельца (2026-10-03): подписи полей формы проверки привязки одинаковы для всех румов: «Nick», «Room ID», «Email» (образец — форма Nexa). Раньше первое поле меняло подпись по руму (Login, User ID, gir1_, Nick, Username); вариант PartyPoker «User ID» владелец назвал неверным. Подстановка в шаблоны не меняется: шаблоны по-прежнему пишут «Login», «User ID» и т.п. так, как нужно руму.

## Acceptance

- Первое поле формы подписано «Nick» для любого рума и шаблона; «Room ID» и «Email» без изменений.
- Функция порумных подписей удалена; текст запроса и TSV не меняются.
- `npm run lint`, `npm test`, `npm run build` — ok; `pdk check` — 0 errors.

## Checkpoint

## Next step

## Blockers

## Log

- 2026-10-03 created
