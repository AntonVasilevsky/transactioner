---
id: T-0017
title: Настройки шаблонов ответа на привязку не должны сбрасываться при запуске
status: dropped
owner: agent
model: "L2 — medium: перенос повторяющегося шага в одноразовую миграцию по ADR-0002, есть готовый механизм и snapshot"
executed_by: ""
depends_on: [T-0011]
aliases: [link verification response templates reset on every start migrateLinkVerificationResponseTemplates is_active label notes one-time migration]
scope: [link-verification, database]
links: [pdk/knowledge/decisions/ADR-0002-versioned-one-time-migrations.md, electron/database.ts, electron/database.test.ts, electron/migrations.ts]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: []
revision: 3
created: 2026-10-03
updated: 2026-10-03
---
## Goal

Найдено при закрытии T-0011 (2026-10-03). `migrateLinkVerificationResponseTemplates` (`electron/database.ts`, вызывается из `migrate()` при каждом запуске) для всех шаблонов ответа на привязку с непустым текстом заново выставляет `is_active = 1`, `label = 'Подтверждение привязки'`, `outcome = 'ok'`, `notes = NULL`, `sort_order = 0`, `template_key = deal_type`, а также каждый раз удаляет «дубли» по (рум, тип сделки, язык). Поэтому выключенный шаблон снова включается после перезапуска, а изменённые название, заметки и порядок сбрасываются. Это тот же класс ошибки, что в T-0011; по ADR-0002 нормализация должна выполниться один раз. Сохранение (`saveLinkVerificationResponseTemplate`) принимает и хранит эти поля — сначала уточнить, какие из них оператор реально меняет в интерфейсе.

## Acceptance

- Нормализация шаблонов ответа (UPDATE полей и удаление дублей) выполняется один раз — отдельным пронумерованным шагом в `migrationSteps()` (версия 2) с snapshot `before-migration` и транзакцией (ADR-0002); добавление колонки `deal_type` и уникальный индекс остаются в базовой части запуска.
- После выключения шаблона, смены названия или заметок и перезапуска приложения значения сохраняются.
- База, уже прошедшая шаг 1 (`user_version = 1`, как у владельца), один раз проходит шаг 2 без потери текстов шаблонов; новая база получает шаблоны из seed без вызова snapshot.
- Тесты в `electron/database.test.ts`: выключенный шаблон и изменённое название переживают перезапуск; переход с `user_version = 1` на 2 сохраняет тексты шаблонов. `npm run lint`, `npm test`, `npm run build` — ok; `pdk check` — 0 errors; ручная проверка владельца: выключить шаблон ответа, перезапустить приложение.

## Checkpoint

Dropped by owner 2026-10-03 (вариант А). Проверка кода: название, заметки, is_active и порядок шаблона ответа нигде в UI не показываются и не редактируются — редактор (RoomAdminView.tsx:1607) сам всегда сохраняет label «Подтверждение привязки», пустые notes, is_active=1; «Ответ» строит заголовок из имени рума. Поэтому сброс этих полей при запуске (migrateLinkVerificationResponseTemplates) сейчас ни на что не влияет; тексты не затрагиваются.
Reopen when: понадобятся заметки для оператора рядом с текстом (не копируются игроку) или выключение шаблона без удаления — тогда сделать нормализацию одноразовым шагом миграции (ADR-0002).

## Next step

Нет — отменено; вернуться при запросе заметок/выключения шаблонов ответа.

## Blockers

## Log

- 2026-10-03 created
- 2026-10-03 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-03 checkpoint: Dropped by owner 2026-10-03 (вариант А). Проверка кода: название, заметки, is_active и порядок шаблона ответа нигде в...
- 2026-10-03 update: status proposed -> dropped
