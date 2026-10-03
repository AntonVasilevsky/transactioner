---
id: T-0011
title: Удалённые кошельки и методы рума не должны возвращаться после перезапуска
status: active
owner: agent
model: "L3 — high: миграции и seed при старте, риск потери локальных данных; поведение определяют тесты на перезапуск"
executed_by: claude-code/claude-fable-5-1
depends_on: [T-0004]
aliases: [deleted room wallets payment methods reappear after restart seed migration]
scope: [database, rooms, wallets]
links: [pdk/knowledge/decisions/ADR-0002-versioned-one-time-migrations.md, pdk/knowledge/decisions/ADR-0003-room-wallets-owned-by-room.md, pdk/knowledge/research/T-0004-schema-audit.md, electron/database.ts, electron/database.test.ts, src/components/RoomAdminView.tsx, electron/migrations.ts, electron/migrations.test.ts, electron/main.ts]
sessions: []
commits: [7c11b60]
revision: 5
created: 2026-10-02
updated: 2026-10-03
---
## Goal

Требование владельца (2026-10-02): кошельки рума, если их удалили, не должны появляться заново. Проверка на временной БД показала: сам адрес из `room_wallets` не возвращается никогда; возвращается **депозитный платёжный метод** на ту же монету и сеть, а в редакторе румов список кошельков строится по депозитным методам (`walletFromMethod`), поэтому удалённый кошелёк снова виден как пустой слот. Метод возвращается в двух случаях: (1) он есть в стартовом seed — `seedRoomKnowledge` вставляет его при каждом запуске; (2) он был создан из кошелька — `migrateWalletsToPaymentMethods` при каждом запуске создаёт Deposit-метод для каждой пары монета+сеть. Реализует ADR-0002 (одноразовые миграции и seed только для новой БД) с сохранением модели ADR-0003. REQ-ROM-009.

## Acceptance

- После удаления кошелька и его депозитного метода перезапуск приложения не возвращает ни кошелёк, ни метод — ни для стартовых (seed) пар, ни для созданных пользователем.
- После удаления только кошелька депозитный метод не воссоздаётся повторно; удалённый пользователем стартовый метод любого типа не возвращается.
- Стартовый seed применяется только к новой БД (или один раз к существующей); повторяющиеся шаги `migrateWalletsToPaymentMethods`, `cleanupLegacyCombinedPaymentMethods`, `cleanupCombinedDepositMethodsBackedByWallets` становятся одноразовыми через `PRAGMA user_version` (или эквивалентный флаг в `app_settings`).
- Перед первым применением ожидающих шагов создаётся snapshot БД `before-migration`; шаги выполняются в транзакции, ошибка откатывает изменения и останавливает запуск (REQ-QLT-006).
- Существующая БД с `user_version = 0` переходит на версионирование без потери данных: кошельки, методы, сделки, шаблоны и игроки сохраняются.
- Схема таблиц и IPC-контракты не меняются; кошельки остаются в `room_wallets` по `room_key` + `deal_type` (ADR-0003).
- Уровень L3 достаточен: логика миграций покрывается тестами на перезапуск; после реализации — независимый pdk-review (L3/L4) до релиза.
- **Verification:** тесты в `electron/database.test.ts`: удаление кошелька+метода и повторное открытие БД (seed-пара и пользовательская пара); удаление только кошелька; переход БД с `user_version = 0`; откат при ошибке шага. `npm run lint`, `npm test`, `npm run build` — ok; `pdk check` — 0 errors; ручная проверка владельца: удалить кошелёк в настройках, перезапустить приложение.

## Checkpoint

Works: стартовые данные румов и старые миграции выполняются один раз (PRAGMA user_version, electron/migrations.ts); удалённые кошельки и методы после перезапуска не возвращаются; перед миграцией существующей БД — snapshot before-migration, провал snapshot останавливает запуск. Примеры в полях формы кошелька/метода полупрозрачные.
Verified: npm run lint — ok; npm test — 24 файла, 200/200; npm run build — ok; pdk check — 0 errors. Ручная проверка владельца 2026-10-03: рабочая БД мигрирована (snapshot transactioner-before-migration-2026-10-03-083511.db создан), удалённые кошельки после перезапуска не подтягиваются.
Not done: независимый pdk-review (L3/L4) до релиза — по Acceptance.
Known: вне scope — migrateLinkVerificationResponseTemplates при каждом старте включает обратно выключенные шаблоны ответа на привязку (кандидат в отдельную задачу).
Changed: коммит 7c11b60.

## Next step

Независимый pdk-review коммита 7c11b60 (другая сессия/модель уровня L3/L4); при отсутствии замечаний — --status done. Релиз — только по команде владельца по AGENTS.md.

## Found in manual check

- 2026-10-03 (1) Добавление кошелька/метода: примеры в полях (USDT, TRC20, min 200 EUR, без комиссии) сделать полупрозрачными — исправлено: placeholder-slate-600/60, как в рейкбеке.

## Blockers

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-fable-5-1, status proposed -> active
- 2026-10-02 update: links +electron/migrations.ts +electron/migrations.test.ts +electron/main.ts
- 2026-10-02 checkpoint: Works: стартовые данные румов и старые миграции (создание Deposit-метода из кошелька, чистка комбинированных методов)...
- 2026-10-03 checkpoint: Works: стартовые данные румов и старые миграции выполняются один раз (PRAGMA user_version, electron/migrations.ts); у...
