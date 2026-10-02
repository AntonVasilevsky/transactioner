---
id: T-0005
title: Добавить email в шаблон проверки привязки CoinPoker
status: active
owner: agent
model: L1 — точечное правило рума в шаблоне запроса
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [CoinPoker link verification with email]
scope: [link-verification]
links: [docs/link_verification_mvp_notes.md, src/utils/linkVerificationRules.ts, src/components/LinkVerificationView.tsx, src/components/LinkVerificationView.test.ts]
sessions: []
commits: []
revision: 4
created: 2026-10-02
updated: 2026-10-02
---
## Goal

В сценарии проверки привязки для рума CoinPoker в сформированный текст запроса должно попадать поле Email. Сейчас CoinPoker идёт через общий шаблон `default` (`DEFAULT_ID_ROOMS`), где `<player_data>` — только Room ID, и Email не выводится. Пример текущего результата:

```
Проверка привязки CoinPoker
Crack4
WA: +591 71160533
@kapitonov
```

Остальные румы на `default` должны работать как раньше.

## Acceptance

- Для CoinPoker текст запроса содержит Email в одной строке с ID (формат согласован с владельцем 2026-10-02):
  ```
  Проверка привязки CoinPoker
  Crack4 / mail@example.com
  WA: +591 71160533
  @kapitonov
  ```
- Email входит в обязательные поля CoinPoker и показывается в подсказке «Данные для запроса».
- Шаблоны и обязательные поля остальных румов не меняются.
- Есть тест на CoinPoker с заполненным Email в `src/components/LinkVerificationView.test.ts` или рядом с правилами.
- Проходят `npm run lint`, `npm run build`, `npm test`; `pdk check` — 0 errors.

## Checkpoint

Works: для CoinPoker текст запроса проверки привязки содержит `<id> / <email>` в одной строке (явное правило CoinPoker в ROOM_RULES, requiredFields roomId, email, messengerUsername; шаблон default; sheet2RoomUsernameField roomId; сделка из dealRuleIndex).
Verified: npm run lint — ok; npm test — 18 файлов, 174/174; npm run build — ok; новый тест 'puts CoinPoker id and email on one request line'.
Not done: коммит (ждёт подтверждения владельца); ручная проверка в UI не делалась.
Changed: src/utils/linkVerificationRules.ts, src/components/LinkVerificationView.test.ts.
Pending decisions: нет.

## Next step

Получить у владельца ок на коммит src/utils/linkVerificationRules.ts, src/components/LinkVerificationView.test.ts и pdk/tasks/T-0005-*.md, закоммитить и закрыть задачу с --status done --commit <sha>.

## Blockers

Нет.

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-02 checkpoint: Works: для CoinPoker текст запроса проверки привязки содержит `<id> / <email>` в одной строке (явное правило CoinPoke...
