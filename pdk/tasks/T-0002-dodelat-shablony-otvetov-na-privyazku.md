---
id: T-0002
title: Доделать шаблоны ответов на привязку
status: done
owner: agent
model: L2 — локальный UI/SQLite flow; L3 только если меняются бизнес-правила шаблонов
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [Finish link verification response templates]
scope: [link-verification]
links: [pdk/knowledge/requirements.md, pdk/knowledge/architecture.md, docs/link_verification_mvp_notes.md, src/components/LinkVerificationView.tsx, src/components/RoomAdminView.tsx, electron/database.ts, electron/main.ts, electron/preload.ts, src/vite-env.d.ts, docs/binding-confirmation-template.txt, electron/linkVerificationResponseTemplates.ts, pdk/knowledge/decisions/ADR-0002-versioned-one-time-migrations.md]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: [8eebe85]
revision: 5
created: 2026-10-02
updated: 2026-10-03
---
## Goal

Завершить локальный сценарий шаблонов ответов на привязку: сотрудник должен надёжно настроить и получить правильный полный текст подтверждения для выбранной комбинации рум / тип сделки / язык и скопировать его игроку. Перед реализацией уточнить, какую именно часть текущего сценария владелец считает недоделанной; не расширять задачу до серверной синхронизации или истории проверок.

Уточнение владельца (2026-10-03): недостающее — сами тексты. Владелец положил `docs/binding-confirmation-template.txt` (25 румов, RU/EN). Нужно сопоставить с румами справочника и сделать так, чтобы они открывались в `Привязки → Ответ`, с учётом RU/EN, добавить ES и разделить агентскую и прямую кассу.

## Acceptance

- Тексты из `docs/binding-confirmation-template.txt` доступны в `Привязки → Ответ` для каждого рума справочника из документа на RU, EN и ES; Champion — отдельно агентская и прямая касса, NEXA — агентская.
- Тексты поставляются одноразовым шагом миграции (ADR-0002) со snapshot; уже отредактированные оператором шаблоны не перезаписываются.
- Владелец описал конкретное недостающее поведение или дефект текущего режима `Привязки → Ответ`; объём записан в задаче до изменения кода.
- Шаблон ответа остаётся отдельным от шаблона запроса и хранится полным готовым текстом без автоматической сборки из полей сделки.
- Ответ выбирается только для существующего рума справочника и явной комбинации `room_key + deal_type + language`; при отсутствии шаблона интерфейс показывает понятное пустое состояние и не подставляет похожий вариант молча.
- Редактор сохраняет один шаблон подтверждения на комбинацию рум / тип сделки / язык и не требует от оператора редактировать служебные поля `template_key`, `outcome`, `sort_order` и `is_active`.
- Локально сохранённый шаблон переживает перезапуск и обновление приложения и доступен для копирования из режима `Ответ`.
- Добавлены или обновлены проверки затронутой SQLite-логики и UI; проходят `npm run lint`, `npm run build` и `npm test`.
- Если подтверждённое поведение меняет требования или фактическую архитектуру, соответствующие документы PDK обновлены и `pdk check` завершается с 0 errors.
- В задачу не входят Notion/Supabase, Google API, Telegram, история проверок и автоматическая обработка результата привязки.

## Checkpoint

Works: 60 шаблонов подтверждения привязки из docs/binding-confirmation-template.txt (20 рум/касса × RU/EN/ES) открываются в Привязки → Ответ. Данные — electron/linkVerificationResponseTemplates.ts; шаг миграции 2 добавляет текст только для рума из справочника и только если шаблона нет. Champion Agent/Direct и NEXA Agent — явно; остальные — по типам сделок рума. Номера аккаунтов — заглушки, заметки для оператора из текста убраны.
Verified: npm run lint — exit 0; npm test — 210/210; npm run build — ok; pdk check — 0 errors. Рабочая БД владельца на версии 2 (snapshot before-migration 18:30). Владелец 2026-10-03 принял тексты, переводы ES/ACR/BCP/BetFair, заглушки и правки.
Decisions: Juicy Stakes/Everygame и VangPoker не добавлять (владелец). Старый shenpoker General EN удалён из рабочей БД владельца (snapshot transactioner-before-response-cleanup-2026-10-03-183835.db).
Changed: коммит 8eebe85 (также исправлена ошибка lint в electron/main.ts из 7aa5625).
Known: T-0017 — название/заметки шаблонов ответа сбрасываются при каждом старте (тексты не затрагивает).

## Next step

Нет — закрыто. В релиз — со следующей сборкой на мак.

## Blockers


## Log

- 2026-10-02 created
- 2026-10-03 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-03 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active, links +docs/binding-confirmation-template.txt +electron/linkVerificationResponseTemplates.ts +pdk/knowledge/decisions/ADR-0002-versioned-one-time-migrations.md
- 2026-10-03 checkpoint: Works: 60 шаблонов подтверждения привязки из docs/binding-confirmation-template.txt (20 рум/касса × RU/EN/ES) открыва...
- 2026-10-03 checkpoint: Works: 60 шаблонов подтверждения привязки из docs/binding-confirmation-template.txt (20 рум/касса × RU/EN/ES) открыва...
- 2026-10-03 update: status active -> done
