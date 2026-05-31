# Технический план: быстрый справочник по румам

## Цель
Добавить в Transactioner быстрый локальный справочник для двух самых частых вопросов:

1. Какие у нас депозитные кошельки/платежные методы в руме?
2. Какая у нас сделка в руме?

Первый релиз справочника должен решать эти сценарии без подключения к Google Docs, Google Sheets или ИИ. Источник знаний остается внешним, но приложение хранит локальную нормализованную копию данных.

## Что Уже Есть
* `TransactionerDatabase` уже владеет SQLite-схемой, миграциями и синхронными методами чтения/записи.
* `electron/main.ts` уже прокидывает IPC-хендлеры из renderer в main.
* `electron/preload.ts` уже является единственным публичным мостом API для React.
* `src/App.tsx` уже содержит простую навигацию по экранам через `ViewState`.
* Тесты Vitest уже проверяют SQLite-логику и отдельные main-process сервисы.

## Решение
Использовать SQLite как источник данных для справочника, плюс локальный seed JSON/TS-файл с начальными данными.

Почему не только JSON:
* поиск, фильтрация по руму/языку/типу сделки/сети проще и стабильнее через БД;
* будущая проверка по стране не потребует переписывать хранение;
* данные попадут в ежедневный backup вместе с основной БД;
* можно постепенно добавить редактирование в UI.

Почему не подключать Google Docs/ИИ сейчас:
* это расширяет blast radius: сеть, авторизация, кеш, ошибки синка;
* для MVP нужны небольшие локальные данные;
* кошельки чувствительные, лучше явно контролировать, что именно попало в приложение.

## MVP Scope
В первый релиз входит:
* новый раздел в sidebar: `Инфо по румам`;
* режим `Кошельки`: рум -> список методов/кошельков -> копировать все или одну строку;
* режим `Сделка`: рум -> язык RU/EN -> короткое описание и полный шаблон -> копировать короткое или полное;
* дата актуальности/проверки для кошельков;
* предупреждение, если кошелек неактивен или помечен как устаревший.

## NOT In Scope
* Прямое подключение к Google Docs/Sheets: откладываем до появления стабильного процесса синка.
* ИИ внутри приложения: откладываем, чтобы не зависеть от внешнего сервиса в ежедневной работе.
* Редактирование справочника в UI: можно добавить позже, первый релиз может использовать seed.
* Проверка страны при выборе сделки: следующий этап после MVP.
* Автоматический импорт всех румов: первый релиз заполняем только нужные Champion, Nexa, RedStar.

## Data Flow
```text
Seed data file
    |
    v
TransactionerDatabase.migrate()
    |
    v
SQLite room_* tables
    |
    v
IPC handlers in electron/main.ts
    |
    v
window.electronAPI in preload.ts
    |
    v
RoomInfoView.tsx
    |
    +--> copy all wallets
    +--> copy one wallet row
    +--> copy short deal
    +--> copy full deal
```

## Proposed Tables
Keep the first schema boring and explicit.

```sql
CREATE TABLE room_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  network_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT
);

CREATE TABLE room_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_key TEXT NOT NULL,
  deal_type TEXT NOT NULL DEFAULT 'General',
  language TEXT NOT NULL,
  short_text TEXT NOT NULL,
  full_text TEXT NOT NULL,
  registration_url TEXT,
  promo_code TEXT,
  registration_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT,
  UNIQUE(room_key, deal_type, language)
);

CREATE TABLE room_payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_key TEXT NOT NULL,
  deal_type TEXT NOT NULL DEFAULT 'General',
  operation_type TEXT NOT NULL,
  method_name TEXT NOT NULL,
  currency TEXT,
  network TEXT,
  fee_text TEXT,
  limits_text TEXT,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE room_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_key TEXT NOT NULL,
  deal_type TEXT NOT NULL DEFAULT 'General',
  currency TEXT NOT NULL,
  network TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  memo_tag TEXT,
  fee_text TEXT,
  note TEXT,
  verified_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

Future tables, not needed for MVP:

```sql
room_country_availability(room_key, country_code, country_name, status, deal_type, language, note, source_date)
room_faq_items(room_key, language, question, short_answer, full_answer, sort_order)
```

## Future UX: Country Before Deal
Possible next step for deal lookup: before selecting a room deal, let the operator optionally choose the player's country.

Flow idea:
* If country is selected first, the app filters/annotates available deals for that country.
* If the room is unavailable in the selected country, show that clearly instead of a deal template.
* If only the agent deal is available in that country, show only the agent deal.
* If direct and agent deals are both available, show direct by default and add a reminder that the agent deal is also available.
* If no country is selected, keep the current fast flow: search/select room -> show deal; if there are two deal types, ask the operator to choose.
* Add a simple "back" step so the operator can recover after choosing the wrong country or wrong deal type.
* Current implementation status: schema/API/UI foundation exists, but seed data for real countries is intentionally empty until availability is verified.

## IPC API
Add read-only methods first:

```ts
getRoomKnowledgeIndex(): Promise<RoomKnowledgeIndex>
getRoomWallets(roomKey: string, dealType?: string): Promise<RoomWalletInfo[]>
getRoomDeals(roomKey: string, language: 'RU' | 'EN', dealType?: string): Promise<RoomDealInfo[]>
```

Do not add write APIs in the first version unless the seed workflow becomes painful.

## UI Plan
Add `roomInfo` to `ViewState` and a sidebar item with a compact info icon.

`RoomInfoView.tsx`:
* segmented control: `Кошельки` / `Сделка`;
* room selector;
* for wallets: optional deal-type selector only when the room has more than one type;
* wallet table with columns `Монета`, `Сеть`, `Адрес`, `Комиссия`, `Актуально`;
* copy buttons: all rows, selected row;
* for deals: language selector RU/EN, deal type selector when needed, short/full blocks;
* copy buttons: short, full.

## Copy Formatting
Wallet row:

```text
USDT ERC20
0xb9dea314d4d7670c983a81810046cd84642e4ab1
Комиссия: без комиссии
```

Wallet list:

```text
RedStar Poker — депозитные кошельки
USDT ERC20: 0xb9dea314d4d7670c983a81810046cd84642e4ab1
Актуально: 2026-02-16
```

Deal copy:
* short: only `short_text`;
* full: `full_text`, then registration URL and promo code if present.

## Test Diagram
```text
CODE PATHS                                             USER FLOWS
[+] electron/database.ts
  ├── [GAP] migrate creates room tables                 [+] Open room info
  ├── [GAP] seed inserts initial room profiles            ├── [GAP] empty DB shows friendly empty state
  ├── [GAP] seed is idempotent                            └── [GAP] seeded DB shows Champion/RedStar/Nexa
  ├── [GAP] getRoomWallets filters room/deal/is_active
  └── [GAP] getRoomDeals filters room/language/deal

[+] electron/main.ts / preload.ts                      [+] Wallets mode
  ├── [GAP] get-room-knowledge-index IPC                 ├── [GAP] choose room, copy all wallets
  ├── [GAP] get-room-wallets IPC                         ├── [GAP] choose row, copy one wallet
  └── [GAP] get-room-deals IPC                           └── [GAP] stale/inactive wallet warning visible

[+] src/components/RoomInfoView.tsx                    [+] Deals mode
  ├── [GAP] mode switch wallets/deal                     ├── [GAP] choose room + RU, copy short
  ├── [GAP] room selector                                ├── [GAP] switch EN, text changes
  ├── [GAP] deal type selector when needed               └── [GAP] copy full template with link/promo
  ├── [GAP] language selector
  └── [GAP] copy success/error state
```

Coverage target before merging:
* database unit tests for schema, idempotent seed, wallet/deal queries;
* IPC/preload type coverage through TypeScript build;
* component behavior tests if React test setup is added, otherwise manual QA with dev app;
* QA pass for macOS UI: copy all wallets, copy row, copy short deal, copy full deal.

## Failure Modes
* Seed runs twice and duplicates wallets: prevent with unique indexes or delete/replace by stable key.
* Wallet is stale but still copied silently: show `verified_at` and warning for inactive/stale rows.
* Room has both Direct and Agent and UI picks wrong one: show selector only when multiple deal types exist.
* Missing EN text causes blank copy: disable EN copy for missing language and show clear empty state.
* Long wallet/comment text breaks layout: wallet cells must truncate/wrap inside fixed table width.
* Backup misses room data: store in the same SQLite file so existing daily backup covers it.

## Implementation Tasks
- [x] **T1 (P1, human: ~2h / CC: ~20min)** — Database — Add room knowledge tables and idempotent seed loading.
  - Files: `electron/database.ts`, new seed file, `electron/database.test.ts`
  - Verify: `npx vitest run electron/database.test.ts`, `npm run build`, `npm run test`
- [x] **T2 (P1, human: ~1h / CC: ~15min)** — IPC — Expose read-only room knowledge APIs.
  - Files: `electron/main.ts`, `electron/preload.ts`, `src/vite-env.d.ts`
  - Verify: `npm run build`
- [x] **T3 (P1, human: ~3h / CC: ~35min)** — UI — Add `RoomInfoView` with wallets/deals modes and copy flows.
  - Files: `src/App.tsx`, `src/components/RoomInfoView.tsx`, maybe `src/index.css`
  - Verify: manual QA in dev app
- [x] **T4 (P2, human: ~1h / CC: ~15min)** — Data — Fill first seed data for Champion, Nexa, RedStar.
  - Files: seed file, `docs/room_knowledge_plan.md`
  - Verify: seed includes Champion/RedStar/Nexa deals, payment methods, and wallets; database tests cover Nexa deal/wallet presence
- [ ] **T5 (P2, human: ~30min / CC: ~10min)** — Docs — Rename `docs/ deal-examples.txt` to remove leading space and document source format.
  - Files: `docs/deal-examples.txt`, `docs/project_specification.md`
  - Verify: `rg --files docs`
- [x] **T6 (P2, human: ~1h / CC: ~20min)** — Country foundation — Add `room_country_availability`, read-only API, optional deal country filter, and tests.
  - Files: `electron/database.ts`, `electron/roomKnowledgeSeed.ts`, `electron/main.ts`, `electron/preload.ts`, `src/vite-env.d.ts`, `src/components/RoomInfoView.tsx`, `electron/database.test.ts`
  - Verify: `npm run lint`, `npm run build`, `npm run test`

## Parallelization
Sequential implementation is better for the first pass. Database schema and seed shape drive IPC and UI. After T1 lands, T2 and T3 can be split, but the total feature is small enough that one worktree is safer.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Status | Findings |
|--------|---------|-----|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests | DONE_WITH_CONCERNS | Interactive AskUserQuestion unavailable in Codex Default mode; review completed as best-effort text/artifact |

**VERDICT:** Ready to implement after confirming seed data format and first room records.
