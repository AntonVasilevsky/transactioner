---
id: T-0017
title: Настройки шаблонов ответа на привязку не должны сбрасываться при запуске
status: proposed
owner: agent
model: "L2 — medium: перенос повторяющегося шага в одноразовую миграцию по ADR-0002, есть готовый механизм и snapshot"
executed_by: ""
depends_on: [T-0011]
aliases: [link verification response templates reset on every start migrateLinkVerificationResponseTemplates is_active label notes one-time migration]
scope: [link-verification, database]
links: [pdk/knowledge/decisions/ADR-0002-versioned-one-time-migrations.md, electron/database.ts, electron/database.test.ts, electron/migrations.ts]
sessions: []
commits: []
revision: 1
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

## Next step

## Blockers

## Log

- 2026-10-03 created
