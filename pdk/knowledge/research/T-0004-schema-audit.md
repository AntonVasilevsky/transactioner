---
title: T-0004 — Аудит схемы локальной SQLite-БД
type: research
status: current
scope: [database, data-model, architecture]
updated: 2026-10-02
---
# Аудит схемы локальной SQLite-БД

Снимок фактического состояния на коммите `45631a5`. Источник — [`electron/database.ts`](../../../electron/database.ts) (схема `initialize()`, миграции `migrate()`), [`electron/main.ts`](../../../electron/main.ts) (порядок backup → открытие БД), тесты [`electron/database.test.ts`](../../../electron/database.test.ts). Пункты с пометкой **[проверено]** подтверждены прогоном на временной БД в `/tmp` 2026-10-02 (пробный тест удалён, рабочая БД не затрагивалась).

## ER-карта

Обозначения: **FK** — связь проверяет SQLite; **код** — связь держится только кодом; **текст** — совпадение текстовых полей без ограничения.

```
players 1─* player_contacts      FK player_id → players.id (без ON DELETE; удаление — кодом в deletePlayer)
players 1─* accounts             FK player_id → players.id (то же)
accounts.room_name ~ room_profiles.display_name|room_key   текст, нормализованное сравнение в renderer

room_profiles (room_key UNIQUE)
  1─* room_deals                 текст room_key
  1─* room_payment_methods       текст room_key
  1─* room_wallets               текст room_key
  1─* room_country_availability  текст room_key
  1─* link_verification_response_templates   текст room_key + TRIGGER на INSERT/UPDATE шаблона (NOCASE)

room_wallets ~ room_payment_methods (Deposit)   текст (room_key, deal_type, currency, network)

link_verification_templates.room_name           текст, не связан с room_profiles
link_verification_deal_defaults.scope_key       текст, производный от названия рума/группы
app_settings (key PK)                           флаги одноразовых миграций
```

| Таблица | Ключи и ограничения |
|---|---|
| players | PK id; UNIQUE(contact_method, messenger_username); idx_players_contact |
| player_contacts | PK id; FK player_id; UNIQUE(contact_method, contact_value); NOCASE-уникальные индексы на (method, value) и на value |
| accounts | PK id; FK player_id; без уникальности |
| room_profiles | PK id; UNIQUE room_key (BINARY); код приводит ключ к `[a-z0-9-]` в нижнем регистре |
| room_deals | UNIQUE(room_key, deal_type, language) |
| room_payment_methods | UNIQUE(room_key, deal_type, operation_type, method_name, currency, network) |
| room_wallets | UNIQUE(room_key, deal_type, currency, network, wallet_address) |
| room_country_availability | UNIQUE(room_key, country_code, status, deal_type, language) |
| link_verification_templates | UNIQUE(room_name, template_key), NOCASE |
| link_verification_deal_defaults | PK scope_key NOCASE |
| link_verification_response_templates | UNIQUE(room_key, deal_type, language) NOCASE + индекс; 2 триггера «рум существует» |

- `PRAGMA foreign_keys` = 1 (умолчание better-sqlite3) **[проверено]**: вставка аккаунта несуществующему игроку отклоняется.
- `PRAGMA user_version` = 0 **[проверено]**: версий схемы нет; все миграции — идемпотентные эвристики, которые выполняются при каждом запуске (`migrate()`), не в одной транзакции.

## Зоны риска

1. **Изменение `room_key` отрывает данные рума.** `saveRoomProfile` позволяет обновить `room_key` существующего профиля; дочерние таблицы не обновляются. **[проверено]** `nexa` → `nexa-new`: новый ключ пуст, 2 сделки / 10 методов / 1 кошелёк остались на `nexa`, а после перезапуска seed заново создал профиль `nexa`. Для рума, созданного вручную, данные станут недоступны из UI. Хуже: в форме рума ([`RoomAdminView.tsx`](../../../src/components/RoomAdminView.tsx), поле «Название рума») ключ автоматически пересчитывается из названия, если совпадал со slug названия, — то есть переименование названия существующего рума молча меняет ключ (по коду; в UI не воспроизводилось).
2. **Удалённые записи возвращаются после перезапуска.**
   - Seed (`seedRoomKnowledge`) при каждом старте вставляет стартовые записи с `ON CONFLICT DO NOTHING` — удалённый стартовый платёжный метод восстанавливается **[проверено]**; изменённый так, что поменялся уникальный ключ (имя/монета/сеть), — появится повторно рядом с изменённым (следует из кода).
   - `migrateWalletsToPaymentMethods` при каждом старте создаёт Deposit-метод для каждой пары монета+сеть из `room_wallets`; удалённый метод возвращается **[проверено]**.
   - `cleanupLegacyCombinedPaymentMethods` при каждом старте удаляет 5 конкретных комбинированных методов, даже если пользователь создал такой же вручную (следует из кода).
   - Это противоречит REQ-ROM-009 («без перезаписи локальных ручных изменений»).
3. **Кошельки ↔ методы.** Связь — только текстовое совпадение (room_key, deal_type, currency, network): `RoomInfoView.findWalletDepositMethod` берёт из метода название и комиссию для отображения кошелька. FK невозможен без выбора одного метода на пару монета+сеть; при нескольких методах с одной парой выбор неоднозначен.
4. **Удаление связанных данных.** `deletePlayer` удаляет контакты и аккаунты кодом, без транзакции (три отдельных DELETE). Удаления рума нет (только `is_active`); кошельки и методы удаляются физически (расхождение с `docs/room_knowledge_plan.md` — открытый вопрос №2 в requirements). `savePlayer` удаляет и заново вставляет все аккаунты и контакты — `accounts.id` нестабилен; сейчас на него никто не ссылается.
5. **Шаблоны привязки.** Три независимые таблицы с разными ключами: запрос — `room_name` (текст), значения сделки — `scope_key`, ответ — `room_key` с триггером. Триггер защищает только вставку/изменение шаблона; переименование `room_key` в профиле его обходит.
6. **`players.default_wallet/default_wallet_network`** используются и выводом ([`FormView.tsx`](../../../src/components/FormView.tsx)), и рейкбеком ([`RakebackView.tsx`](../../../src/components/RakebackView.tsx)); это прямо записано в REQ-RBK-006 и не является ошибкой схемы. Разделять их — продуктовый вопрос, не повод менять схему сейчас.
7. **Аккаунт → рум.** `accounts.room_name` — свободный текст; сопоставление с профилем — нормализованное сравнение с `display_name` или `room_key` (`resolveRoomPaymentWarning`), а правила шаблонов в `FormView` сравнивают с жёстко заданными названиями (`'RedStar'`, `'Nexa'`, `'Champion Poker'`). Переименование `display_name` ломает сопоставление предупреждений; работает, пока названия стабильны.
8. **Backup перед миграцией.** `runDailyBackup()` выполняется до открытия БД, но только один раз в день: если обновлённая версия запускается второй раз за день, миграции идут без свежей копии. Snapshot перед правкой справочника есть (`runRoomEditBackup`).

## Сверка с draft requirements

- REQ-ROM-009 — нарушается пунктом 2 (seed и миграция восстанавливают удалённое). Кошельки seed не возвращает — соблюдается (`does not seed default wallets`, `keeps manually created wallets`).
- REQ-LNK-010 — соблюдается для операций с шаблоном; обходится переименованием ключа (пункт 1/5).
- REQ-QLT-006 — соблюдается: ошибка миграции останавливает запуск (`main.ts`).
- REQ-RBK-006 — соответствует коду.
- Hard delete кошельков и методов — по-прежнему открытый вопрос владельца (requirements, расхождение №2); аудит его не решает.

## Ответ: откуда брать «доступные кошельки»

Определение: **доступные кошельки рума** — активные строки `room_wallets` с `room_key` выбранного рума и выбранным типом сделки. Они уже принадлежат руму напрямую; платёжный метод — необязательное описание (название, комиссия, лимиты), найденное по монете+сети. Seed и платёжные методы источником кошельков не являются. Предложение — сохранить эту модель (draft ADR-0003); T-0003 — задача UI поверх неё. Замечено для T-0003: `RoomInfoView` показывает кошельки только типа `Agent`, если у рума есть хоть какие-то данные `Agent` (`activeWalletDealType`), — кошельки `General` такого рума не видны.

## Варианты

| | A. Оставить схему, закрыть инварианты кодом | B. Нормализовать: `room_id` INTEGER FK во всех дочерних таблицах, кошелёк → `payment_method_id` |
|---|---|---|
| Миграция | нет перестройки таблиц; одноразовые флаги/`user_version` | перестройка 6–7 таблиц (SQLite не умеет ADD CONSTRAINT), перенос данных, неоднозначное сопоставление кошелёк→метод |
| Риск потери данных | минимальный | средний: ошибки сопоставления, частично применённая перестройка |
| Backup/update | нужен snapshot при смене версии схемы | то же + план отката на копию |
| IPC/renderer | без изменений | все контракты на `room_key` нужно переписать или оборачивать |
| Польза сейчас | устраняет все подтверждённые дефекты (п. 1, 2, 8) | те же дефекты + защита от будущих ошибок кода; выигрыш сверх A мал для одного локального пользователя |

Рекомендация — **A**: пункты 1, 2, 8 закрываются без перестройки таблиц (ADR-0001, ADR-0002), модель кошельков сохраняется (ADR-0003). Вариант B уместно вернуть при переходе к общей многопользовательской версии, где схема будет проектироваться заново.
