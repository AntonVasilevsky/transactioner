---
id: T-0014
title: Единый реестр румов для проверки привязки
status: proposed
owner: agent
model: "L3 — high: правила для всех румов, риск изменить текст запросов; поведение фиксируют тесты сравнения до/после"
executed_by: ""
depends_on: [T-0013]
aliases: [single room registry link verification aliases required fields placeholders DEFAULT_ID_ROOMS]
scope: [link-verification]
links: [src/utils/linkVerificationRules.ts, src/utils/linkVerificationFormatting.ts, src/utils/roomUsageSort.ts, src/utils/roomSearch.ts, src/components/LinkVerificationView.tsx, src/components/LinkVerificationView.test.ts, docs/link_verification_mvp_notes.md]
sessions: []
commits: []
revision: 1
created: 2026-10-03
updated: 2026-10-03
---
## Goal

Ревью 2026-10-03 (принято владельцем): правила проверки привязки должны быть одним контрактом для всех румов, а сейчас разложены по отдельным спискам и исключениям.

1. Один рум получает разные правила по написанию: `DEFAULT_ID_ROOMS` (`linkVerificationRules.ts:213`) задан одним написанием, а подсказки предлагают другие: «RPTBET» и «Vbet Latam» — по Username, «RPTBET Poker» и «VBet Poker» — по Room ID (документация: оба — ID-румы). Сохранённые шаблоны привязаны к набранному названию.
2. Личность рума описана в семи местах: псевдонимы в `ROOM_RULES`, `dealByRoomAlias`, `DEFAULT_ID_ROOMS`, `dealDefaultScopes`, `LINK_VERIFICATION_ROOM_SUGGESTIONS`, «основные» румы (`persistPlayerInMainDb`, `CORE_ROOMS`, `CORE_ROOM_NAMES` в `roomUsageSort.ts`), таблица в `roomSearch.ts:81`. Режим «Ответ» использует `room_key` из БД, «Запрос» — свободный текст.
3. Ключи `requiredFields` не совпадают с полями формы: шесть ключей на три поля; `messengerUsername` скрытно управляет копированием Room ID в Username при смене рума (`linkVerificationFormatting.ts:145`). Это причина ошибки T-0005.
4. `sheet2RoomUsernameField` дублирует `requiredFields` (во всех 10 правилах = «roomId, если обязателен, иначе username»).
5. Девять имён подстановок на четыре значения (`<username>/<nick>/<login>/<user_id>`, `<id>/<room_id>`, опечатка `<messenger_usermane>`). Сохранённых шаблонов в БД владельца нет (проверено 2026-10-03).

## Acceptance

- Один реестр румов: каноническое имя, псевдонимы, показываемые поля, шаблоны, сделка, признак «основной»; `DEFAULT_ID_ROOMS`, `CORE_ROOMS`, подсказки и список сделок выводятся из него или удалены.
- Любое написание рума из выпадающего списка даёт одно и то же правило и те же сохранённые шаблоны; «RPTBET»/«RPTBET Poker» и «VBet»/«VBet Poker»/«Vbet Latam» — ID-румы (по документации; спорные случаи согласовать с владельцем).
- Поля правила = поля формы (`username`, `roomId`, `email`); копирование Room ID ↔ Username при смене рума — явный флаг; `sheet2RoomUsernameField` выводится.
- Один канонический набор подстановок, синонимы в одной таблице с пометкой «устарело»; опечатка удалена.
- Текст запроса, TSV Sheet 1/2 и поведение при смене рума для всех румов не меняются, кроме исправленных написаний из п. 1 — тест сравнения старой и новой версии по всем румам из списка.
- `docs/link_verification_mvp_notes.md` обновлён; `npm run lint`, `npm test`, `npm run build` — ok; `pdk check` — 0 errors; независимый pdk-review до релиза.

## Checkpoint

## Next step

## Blockers

## Log

- 2026-10-03 created
