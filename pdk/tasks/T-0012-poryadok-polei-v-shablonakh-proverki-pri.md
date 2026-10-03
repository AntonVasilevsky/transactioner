---
id: T-0012
title: Порядок полей в шаблонах проверки привязки как в форме
status: done
owner: agent
model: "L2 — medium: порядок полей в шаблонах, без изменения состава полей"
executed_by: claude-code/claude-opus-5-5
depends_on: [T-0005]
aliases: [link verification template field order matches form order]
scope: [link-verification]
links: [src/utils/linkVerificationRules.ts, src/utils/linkVerificationFormatting.ts, src/components/LinkVerificationView.test.ts]
sessions: []
commits: [750bfd5]
revision: 5
created: 2026-10-03
updated: 2026-10-03
---
## Goal

Требование владельца (2026-10-03): поля в шаблоне проверки привязки идут в том же порядке, что и поля формы — Username/Nick/Login/User ID → Room ID → Email → мессенджер-контакт. Правило одно для всех румов; рум может не показывать часть полей, но порядок сохраняется. Username — текст (например, Crack4), Room ID — цифры. Подстановка значений сейчас верна, меняется только порядок. TON Poker — по предложению агента (владельцу не важно). Причина нарушения: `<player_data>` собирался в порядке `requiredFields` правила рума; в T-0005 для CoinPoker задан `roomId, email, messengerUsername`.

## Acceptance

- `<player_data>` всегда в порядке формы, независимо от порядка `requiredFields` в правиле рума.
- Встроенные шаблоны WPTG, TON, PartyPoker, bwin переставлены в порядок формы; состав полей и текст не меняются.
- Для всех румов набор подставляемых значений тот же, что до изменения (сравнение старой и новой версии), меняется только порядок.
- Тесты: порядок для всех правил румов и всех встроенных шаблонов; CoinPoker `Crack4 / 7712345 / email`.
- `npm run lint`, `npm test`, `npm run build` — ok; `pdk check` — 0 errors.

## Checkpoint

Works: поля в шаблоне проверки привязки идут в порядке формы (Username → Room ID → Email → контакт) для всех румов: <player_data> сортируется по порядку формы (FORM_FIELD_ORDER), шаблоны WPTG/TON/PartyPoker/bwin переставлены.
Verified: сравнение старой и новой версии по всем румам — набор значений тот же, меняется только порядок; npm run lint — ok; npm test — 202/202; npm run build — ok; pdk check — 0 errors. Ручная проверка владельца 2026-10-03 — норм. Вошло в сборку 0.1.25.
Not done: переименование messengerUsername → username не сделано (меняет автозаполнение при смене рума) — перенесено в T-0014.
Changed: коммит 750bfd5.

## Next step

Нет — закрыто.

## Blockers

## Log

- 2026-10-03 created
- 2026-10-03 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-03 checkpoint: Works: поля в шаблоне проверки привязки идут в порядке формы (Username → Room ID → Email → контакт) для всех румов: <...
- 2026-10-03 checkpoint: Works: поля в шаблоне проверки привязки идут в порядке формы (Username → Room ID → Email → контакт) для всех румов: <...
- 2026-10-03 checkpoint: Works: поля в шаблоне проверки привязки идут в порядке формы (Username → Room ID → Email → контакт) для всех румов: <...
- 2026-10-03 update: status active -> done
