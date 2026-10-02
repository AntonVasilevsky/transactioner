---
id: T-0001
title: Картировать существующие знания в pdk/
status: active
owner: agent
model: L2 — inventory and requirements mapping; L3 if contradictions require domain decisions
executed_by: gpt-5.6-sol
depends_on: []
aliases: [Map existing knowledge into pdk/]
scope: [project]
links: [docs/project_specification.md, docs/link_verification_mvp_notes.md, docs/room_knowledge_plan.md, README.md, AGENTS.md, pdk/knowledge/notes/T-0001-source-map.md, pdk/knowledge/requirements.md, pdk/knowledge/architecture.md]
sessions: [01a0fa2c-a66c-739d-8f8f-c39eaa0d1b8c]
commits: []
revision: 18
created: 2026-10-01
updated: 2026-10-02
---
## Goal

Перенести подтверждённые знания существующего Transactioner из документации и реализации в небольшие актуальные документы PDK, явно разделив текущее поведение, требования, архитектурные решения, планы и устаревшие материалы.

## Acceptance

- Проведена инвентаризация `docs/`, `README.md`, `AGENTS.md`, основных package/build-файлов и фактических модулей в `src/` и `electron/`.
- Для каждого существующего источника определены назначение, актуальность и отношения с другими источниками; противоречия и неизвестные границы вынесены владельцу, а не разрешены догадкой.
- Подтверждённые текущие требования оформлены как canonical/current knowledge; планы, исследования и история не выданы за нормативные правила.
- Текущее устройство Electron renderer/main/preload, SQLite, внешних API, backup и release-процесса отражено без перепроектирования продукта.
- Устаревший шаблонный `README.md` и старые процессные инструкции помечены как источники, требующие отдельного решения, но не изменены в рамках картирования.
- Секреты и защищённые пути не прочитаны и не добавлены в PDK; существующие product docs не перемещены и не удалены.
- `pdk check` завершается с 0 errors, а открытые вопросы и следующий продуктовый шаг видны в PDK.

## Checkpoint

Карта знаний, requirements и architecture готовы как drafts и ожидают принятия владельцем; code graph fresh. Дополнительно по запросу владельца созданы proposed-задачи: T-0002 для шаблонов ответов на привязку, T-0003 для читаемого UX доступных кошельков румов и T-0004 для отдельного аудита/решения по SQLite-схеме. T-0003 зависит от T-0004, чтобы не менять источник кошельков по догадке. Проверено: pdk check — 0 errors, 0 warnings.

## Next step

Получить явное принятие или правки requirements/architecture; после принятия перевести их в current и отдельно спросить про mandatory. Новые proposed-задачи уточнять и активировать отдельно, начиная с T-0004 перед T-0003.

## Blockers

## Log

- 2026-10-01 created
- 2026-10-01 update: links +docs/project_specification.md +docs/link_verification_mvp_notes.md +docs/room_knowledge_plan.md +README.md +AGENTS.md
- 2026-10-01 checkpoint: PDK подключён к существующему проекту в assisted mode; прочитаны README, AGENTS.md, вся документация и основные produ...
- 2026-10-01 checkpoint: Bootstrap завершён. Дополнительно разобран размер PDK backup без чтения каталога резервных копий: корень проекта зани...
- 2026-10-01 update: executed_by "" -> gpt-5.6-sol, status proposed -> active
- 2026-10-01 update: links +pdk/knowledge/notes/T-0001-source-map.md
- 2026-10-01 checkpoint: Works: составлена временная карта источников с классификацией current/mixed/planned/raw/stale, снимком текущего прило...
- 2026-10-01 checkpoint: Works: владелец подтвердил карту и разделение продукта на текущую локальную версию и отдельную будущую общую многопол...
- 2026-10-01 update: sessions +01a0fa2c-a66c-739d-8f8f-c39eaa0d1b8c
- 2026-10-01 checkpoint: Discovery возобновлён: для шаблонов сделок сопоставлены два конкурирующих направления — прежний Supabase-master и нов...
- 2026-10-01 checkpoint: Владелец решил отложить выбор места редактирования и источника истины для шаблонов сделок будущей общей версии; это з...
- 2026-10-01 checkpoint: Владелец уточнил термин: шаблон сделки — это общие тексты и условия сделки по руму; назначение сделки конкретному акк...
- 2026-10-01 checkpoint: Владелец отложил весь блок выбора источников истины и интеграции Notion/Supabase для будущей общей версии. До отдельн...
- 2026-10-01 update: links +pdk/knowledge/requirements.md +pdk/knowledge/architecture.md
- 2026-10-01 checkpoint: Созданы два связанных canonical/draft документа: pdk/knowledge/requirements.md с 68 нумерованными требованиями текуще...
- 2026-10-01 checkpoint: Созданы два связанных canonical/draft документа: pdk/knowledge/requirements.md с 70 нумерованными требованиями текуще...
- 2026-10-02 checkpoint: Созданы canonical/draft requirements и architecture текущего локального приложения; они ожидают принятия владельцем. ...
- 2026-10-02 checkpoint: Карта знаний, requirements и architecture готовы как drafts и ожидают принятия владельцем; code graph fresh. Дополнит...
