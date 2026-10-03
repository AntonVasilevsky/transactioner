---
id: T-0013
title: "Единые подписи полей проверки привязки: Nick, Room ID, Email"
status: done
owner: agent
model: "L1 — low: подпись поля в форме, без изменения подстановки"
executed_by: ""
depends_on: [T-0012]
aliases: [link verification form field labels same for all rooms Nick Room ID Email]
scope: [link-verification]
links: [src/utils/linkVerificationFormatting.ts, src/components/LinkVerificationView.tsx, src/components/LinkVerificationView.test.ts]
sessions: []
commits: [78f7c7e]
revision: 2
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

Works: первое поле формы проверки привязки подписано «Nick» для всех румов; порумная функция подписей удалена; подстановка в шаблоны и TSV не изменились.
Verified: npm run lint — ok; npm test — 202/202; npm run build — ok; pdk check — 0 errors. Владелец подтвердил вариант подписи по скриншоту формы Nexa 2026-10-03.
Changed: коммит 78f7c7e.

## Next step

Нет — закрыто. Остальные находки ревью — T-0014 (реестр румов) и T-0015 (подсказки, мессенджеры).

## Blockers

## Log

- 2026-10-03 created
- 2026-10-03 checkpoint: Works: первое поле формы проверки привязки подписано «Nick» для всех румов; порумная функция подписей удалена; подста...
- 2026-10-03 update: status proposed -> done
