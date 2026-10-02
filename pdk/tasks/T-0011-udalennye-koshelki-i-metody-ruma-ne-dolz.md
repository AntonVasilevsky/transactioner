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
links: [pdk/knowledge/decisions/ADR-0002-versioned-one-time-migrations.md, pdk/knowledge/decisions/ADR-0003-room-wallets-owned-by-room.md, pdk/knowledge/notes/T-0004-schema-audit.md, electron/database.ts, electron/database.test.ts, src/components/RoomAdminView.tsx]
sessions: []
commits: []
revision: 2
created: 2026-10-02
updated: 2026-10-02
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

Задача создана из требования владельца в T-0004. Причина воспроизведена на временной БД (см. Goal). Код не менялся.

## Next step

Получить от владельца принятие ADR-0002 и активацию задачи; затем pdk-deliver.

## Blockers

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-fable-5-1, status proposed -> active
