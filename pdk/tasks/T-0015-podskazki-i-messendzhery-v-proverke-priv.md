---
id: T-0015
title: Подсказки и мессенджеры в проверке привязки из одного правила
status: done
owner: agent
model: "L1 — low: подсказки под формой и таблица мессенджеров"
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [link verification hints from rule messenger table persistPlayerInMainDb dead flag]
scope: [link-verification]
links: [src/components/LinkVerificationView.tsx, src/utils/linkVerificationFormatting.ts, src/utils/messengers.ts, electron/database.ts, src/utils/linkVerificationRules.ts]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: [f83c23b]
revision: 7
created: 2026-10-03
updated: 2026-10-04
---
## Goal

Ревью 2026-10-03 (принято владельцем), мелкие нарушения «одного правила» на экране проверки привязки:

1. Подсказки под формой не зависят от правила (`LinkVerificationView.tsx:581`): «Данные для запроса: Nick, Room ID, Email» одинакова для всех румов; «Автосохранение игрока: нет» зашита, флаг `persistPlayerInMainDb` нигде не читается.
2. Мессенджеры заданы тремя независимыми способами: `messengerOptions` в компоненте, `normalizeMessengerLabel`, `toDirectusMessenger`; мессенджер копируется в «Источник».

## Acceptance

Решение владельца 2026-10-04: подсказку «Данные для запроса» оставить как есть; мессенджеры свести в одно место; вместо строки-заглушки сделать автосохранение игрока.

- Мессенджеры заданы в одном месте (`src/utils/messengers.ts`): варианты в проверке привязки, префикс Directus, тип контакта карточки игрока (`CONTACT_METHOD_OPTIONS`). Текст запроса и TSV не меняются — тест сравнения со старым кодом.
- Кнопка «Копировать» у шаблона запроса для Nexa, RedStar, Champion Poker (агентская и прямая) и WPTG копирует и сохраняет игрока; Shift + клик — только копирует. Игрок ищется по контакту (без учёта @ и регистра, телефон по цифрам); найден — добавляется аккаунт рума или заполняются только пустые Room ID / Email; не найден — создаётся. Остальные аккаунты, контакты и кошельки не меняются.
- Под шаблоном видно, что произошло (создан / добавлен аккаунт / дополнен / уже есть / не сохранён и почему); строка «Автосохранение игрока» отражает правило рума.
- Тесты на сохранение и план сохранения; `npm run lint`, `npm test`, `npm run build` — ok; `pdk check` — 0 errors; ручная проверка владельца.

## Checkpoint

Works: мессенджеры в одном месте (src/utils/messengers.ts). Кнопка у шаблона запроса для Nexa/RedStar/Champion/WPTG называется «Копировать и сохранить», при зажатом Shift — «Копировать» (только копия). Поиск игрока — по правилу T-0018 (общий matchPlayersByContact). Сообщения под шаблоном начинаются со «Скопировано.»; рядом кнопка «Отмена» на 15 секунд: откатывает ровно то, что сделало автосохранение (удаляет созданного игрока — только если в карточку больше ничего не добавили; удаляет добавленный аккаунт; возвращает прежние поля). IPC undo-link-verification-player-save.
Verified: npm run lint — exit 0; npm test — 25 файлов, 223/223 (тесты на откат трёх видов и на отказ отката выросшей карточки); npm run build — ok; pdk check — 0 errors. Владелец 2026-10-04: сценарии 1–4 (новый, существующий, похожий, Shift) работают — до добавления отмены и подписей.
Done: ручная проверка владельца 2026-10-04 — всё ок (новый, существующий, похожий, Shift, подпись кнопки, Отмена). Changed: коммит f83c23b.

## Next step

Нет — закрыто. В релиз — со следующей сборкой на мак.

## Blockers

## Log

- 2026-10-03 created
- 2026-10-04 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active, links +src/utils/messengers.ts +electron/database.ts +src/utils/linkVerificationRules.ts
- 2026-10-04 checkpoint: Works: мессенджеры в одном месте (src/utils/messengers.ts): варианты проверки привязки, префикс Directus, тип контакт...
- 2026-10-04 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-04 checkpoint: Works: мессенджеры в одном месте (src/utils/messengers.ts): варианты проверки привязки, префикс Directus, тип контакт...
- 2026-10-04 checkpoint: Works: мессенджеры в одном месте (src/utils/messengers.ts). Кнопка у шаблона запроса для Nexa/RedStar/Champion/WPTG н...
- 2026-10-04 checkpoint: Works: мессенджеры в одном месте (src/utils/messengers.ts). Кнопка у шаблона запроса для Nexa/RedStar/Champion/WPTG н...
- 2026-10-04 update: status active -> done
