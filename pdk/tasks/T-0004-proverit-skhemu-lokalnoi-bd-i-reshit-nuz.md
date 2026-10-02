---
id: T-0004
title: "Проверить схему локальной БД и решить, нужны ли улучшения"
status: active
owner: agent
model: L4 — кросс-доменный аудит модели данных и миграционных рисков
executed_by: ""
depends_on: []
aliases: [Review local database schema and decide improvements]
scope: [database, architecture, data-model]
links: [pdk/knowledge/requirements.md, pdk/knowledge/architecture.md, docs/project_specification.md, docs/room_knowledge_plan.md, docs/link_verification_mvp_notes.md, electron/database.ts, electron/database.test.ts, electron/roomKnowledgeSeed.ts, pdk/knowledge/notes/T-0004-schema-audit.md, pdk/knowledge/decisions/ADR-0001-room-key-immutable.md, pdk/knowledge/decisions/ADR-0002-versioned-one-time-migrations.md, pdk/knowledge/decisions/ADR-0003-room-wallets-owned-by-room.md]
sessions: []
commits: []
revision: 6
created: 2026-10-02
updated: 2026-10-02
---
## Goal

Провести самостоятельный аудит фактической локальной SQLite-схемы и решить, достаточно ли она понятна и надёжна для текущего приложения или её следует улучшить. Особое внимание уделить владению данными рума: `room_profiles`, сделкам, платёжным методам, доступным кошелькам, шаблонам привязки и тому, как эти сущности связываются. Задача принимает решение и планирует безопасный следующий шаг, но не меняет production-схему.

## Acceptance

- Составлена актуальная ER-карта всех таблиц, ключей, уникальных ограничений, индексов, triggers и фактических связей; отдельно отмечено, какие связи обеспечиваются SQLite, а какие только кодом или совпадением текстовых полей.
- Проверены минимум следующие зоны риска: текстовый `room_key` без явного FK, сопоставление `room_payment_methods` и `room_wallets`, удаление связанных данных, независимые таблицы шаблонов привязки, использование `players.default_wallet/default_wallet_network` одновременно в выводах и рейкбеке, миграции и non-destructive seed.
- Требования из draft-документов сверены с фактическим кодом и тестами; расхождения не разрешены догадкой.
- Сравнены как минимум два реальных варианта: оставить текущую схему и улучшить только UI/инварианты либо нормализовать выбранные связи и добавить явные идентификаторы/FK; для каждого указаны стоимость миграции, риск потери локальных данных, влияние на backup/update и польза для текущего локального этапа.
- Отдельно дан ответ, должны ли доступные кошельки принадлежать сущности рума напрямую, связываться через платёжный метод или оставаться в текущей модели; термин «браться из сущности рум» определён однозначно.
- Если улучшение не оправдано, записано решение оставить схему без изменения и перечислены достаточные точечные меры. Если изменение оправдано, подготовлен draft ADR и отдельные небольшие implementation/migration tasks; никакой ADR не получает `current` без явного принятия владельцем.
- Любая рекомендуемая миграция сохраняет существующие пользовательские данные, имеет проверяемый rollback/backup plan и не возвращает seed-кошельки как источник истины.
- **Verification:** выводы подтверждены ссылками на `electron/database.ts`, миграционные и database tests; `pdk check` — 0 errors; production-код и БД в рамках этой задачи не изменены.

## Checkpoint

ADR-0003 принят владельцем 2026-10-02 (кошельки принадлежат руму и типу сделки, метод — только описание) → current, привязан к T-0003. ADR-0001 отклонён/отложен до перехода на Notion; «оставить как есть» относилось только к переименованию румов. ADR-0002 (одноразовые миграции: удалённые методы возвращаются после перезапуска) — draft, ждёт явного да/нет владельца. Аудит: notes/T-0004-schema-audit.md. Production-код и БД не менялись.

## Next step

Получить решение владельца по ADR-0002; при «да» создать задачу реализации (L3) и закрыть T-0004; при «нет» архивировать ADR-0002 и закрыть T-0004. Далее — T-0003.

## Blockers

Архитектурных blockers нет. Итоговое решение и любой ADR требуют явного принятия владельцем.

## Log

- 2026-10-02 created
- 2026-10-02 update: status proposed -> active
- 2026-10-02 update: links +pdk/knowledge/notes/T-0004-schema-audit.md +pdk/knowledge/decisions/ADR-0001-room-key-immutable.md +pdk/knowledge/decisions/ADR-0002-versioned-one-time-migrations.md +pdk/knowledge/decisions/ADR-0003-room-wallets-owned-by-room.md
- 2026-10-02 checkpoint: Аудит схемы готов: pdk/knowledge/notes/T-0004-schema-audit.md (ER-карта, 8 зон риска, сверка с requirements; риски 1 ...
- 2026-10-02 checkpoint: Решение владельца 2026-10-02: схему оставляем как есть, глобальная переделка модели данных — при переходе источника и...
- 2026-10-02 checkpoint: ADR-0003 принят владельцем 2026-10-02 (кошельки принадлежат руму и типу сделки, метод — только описание) → current, п...
