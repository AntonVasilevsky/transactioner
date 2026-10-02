---
title: Фактическая архитектура текущего локального Transactioner
type: canonical
status: draft
scope: [project, local-app, electron, renderer, ipc, sqlite, integrations, backup, release]
updated: 2026-10-02
---
# Фактическая архитектура текущего локального Transactioner

## Статус и назначение

Документ описывает фактическое устройство существующего приложения. Это не предложение новой архитектуры и не план перехода на Supabase/Notion. Статус остаётся `draft` до проверки владельцем.

## Контекст системы

Transactioner — однопользовательское desktop-приложение. Каждая установка имеет собственную SQLite-БД, настройки renderer и backup-каталог. Между установками нет общего backend, авторизации, очереди синхронизации или разрешения конфликтов.

```text
Сотрудник
   │
   ▼
Electron desktop application
   ├── локальная SQLite-БД
   ├── системный clipboard
   ├── локальные настройки и app-state
   ├── backup-файлы в Documents
   └── исходящие HTTPS-запросы
        ├── blockchain explorers
        ├── Frankfurter USD/EUR
        └── GitHub Releases
```

## Технологический состав

- Electron 32: main process, окно приложения, IPC, доступ к файловой системе и внешним API.
- React 19 + TypeScript: renderer и пользовательские экраны.
- Vite: development server и production bundle.
- Tailwind CSS 4: стили интерфейса.
- `better-sqlite3`: синхронное локальное хранение в main process.
- Vitest: unit/component tests.
- Electron Builder: DMG для macOS и NSIS installer для Windows x64.

Точные версии зависимостей определяются `package.json` и `package-lock.json`; этот документ фиксирует роли компонентов, а не заменяет lock-файл.

## Границы процессов

```text
┌───────────────────────────────────────────────────────────────┐
│ Renderer: React                                               │
│ App.tsx + components + pure utils                             │
│                                                               │
│ - состояние экранов и форм                                    │
│ - форматирование текстов и TSV                                │
│ - clipboard                                                   │
│ - renderer localStorage                                       │
└──────────────────────────┬────────────────────────────────────┘
                           │ window.electronAPI
                           │ contextBridge / ipcRenderer.invoke
┌──────────────────────────▼────────────────────────────────────┐
│ Preload: electron/preload.ts                                  │
│                                                               │
│ Явный список разрешённых команд IPC и их аргументов            │
└──────────────────────────┬────────────────────────────────────┘
                           │ ipcMain.handle
┌──────────────────────────▼────────────────────────────────────┐
│ Main process: electron/main.ts                                │
│                                                               │
│ - жизненный цикл Electron и BrowserWindow                     │
│ - пути данных и release notes                                 │
│ - IPC orchestration                                           │
│ - backup before/after mutations                               │
│ - внешние сервисы                                             │
└───────────────┬──────────────────────┬────────────────────────┘
                │                      │
       ┌────────▼─────────┐   ┌────────▼────────────────────────┐
       │ database.ts      │   │ Main-process services           │
       │ better-sqlite3   │   │ transactionResolver             │
       │ migrations/seed │   │ rakebackTransactionSearch       │
       └──────────────────┘   │ currency / updates / backup     │
                              └─────────────────────────────────┘
```

Renderer не открывает SQLite и не читает приватные файлы напрямую. Операции с БД и сетью, которым нужны ключи или Node API, выполняются в main process.

## Renderer

### Корневая навигация

`src/App.tsx` хранит текущий экран и выбранного игрока в React state. Отдельного router нет. Основные экраны:

- `SearchPlayerView` — интерактивный поиск и переход к созданию;
- `PlayerListView` — список, фильтр, открытие и редактирование;
- `AddPlayerView` / `EditPlayerView` — карточка игрока, контакты, аккаунты, реквизиты;
- `FormView` — депозит/вывод и проверка транзакции;
- `RakebackView` — статистические и криптовалютные сценарии рейкбека;
- `RoomInfoView` — просмотр сделок и кошельков;
- `RoomAdminView` — локальное редактирование справочника;
- `LinkVerificationView` — запрос/TSV и готовые ответы на привязку.

Порядок пунктов sidebar, частота выбора румов, имя менеджера в привязках и настройки адресов отправителей рейкбека хранятся в renderer `localStorage`. Потеря этих значений не удаляет основную SQLite-БД, но сбрасывает соответствующие UI defaults.

### Логика представления

Часть бизнес-форматирования находится в `src/utils/` и остаётся доступной renderer:

- нормализация контактов и поиск румов;
- генерация текстов транзакций;
- правила и TSV проверки привязки;
- форматирование кошельков справочника;
- построение рейкбек-шаблонов;
- валидация адреса кошелька;
- порядок sidebar и клиентские settings.

Поля выбора собраны в `src/components/fields/`: `ComboboxField` (список с поиском), `SelectField` (замена системного `<select>`) и `DateField` (свой календарь вместо системного). Правила открытия, закрытия, прокрутки к списку и игнорирования возврата фокуса в окно живут в одном хуке `useDropdownField`; новые поля выбора должны использовать эти компоненты. Порядок всех списков румов задаёт `src/utils/roomUsageSort.ts` по числу аккаунтов из `getRoomRegistrationStats` (хук `src/hooks/useRoomUsageStats.ts`).

Это означает, что текущая граница не является «вся бизнес-логика только в main»: форматирование и UI-правила выполняются в renderer, а хранение и чувствительные интеграции — в main.

## Preload и IPC

`electron/preload.ts` публикует единственный объект `window.electronAPI`. API сгруппирован по назначению:

- игроки: поиск, список, получение, сохранение, удаление, обновление реквизитов;
- справочник: индексы, сделки, кошельки, страны, шаблоны привязки и mutations админки;
- операции: разрешение blockchain-транзакции и конвертация USD/EUR;
- рейкбек: поиск исходящих выплат;
- приложение: версия, пути хранения, release notes и update check;
- внешний переход: открытие только разрешённой release-ссылки.

Main process регистрирует соответствующие `ipcMain.handle`. IPC-вызовы возвращают сериализуемые объекты с `success/error` либо данные для чтения; отдельного HTTP API внутри приложения нет.

## Main process

`electron/main.ts` выполняет bootstrap в следующем порядке:

1. Определяет `userData`, путь `transactioner.db`, backup-каталог, `app-state.json` и packaged `USER_RELEASE_NOTES.txt`.
2. Пытается создать ежедневный backup уже существующей непустой БД.
3. Открывает `TransactionerDatabase`, создаёт схему, выполняет миграции и seed.
4. Регистрирует IPC handlers.
5. После `app.whenReady()` создаёт `BrowserWindow` и загружает Vite dev server либо production `dist/index.html`.

Если миграция БД завершилась ошибкой, окно приложения не создаётся: Electron показывает error box с путём БД и завершает процесс. Это предотвращает продолжение работы поверх несовместимой схемы, но автоматического rollback/repair нет.

Main также создаёт нативное контекстное меню для редактируемых полей и выделенного текста.

## Локальное хранение

### Основная БД

Путь по умолчанию:

```text
<electron app.getPath('userData')>/transactioner.db
```

Для тестов и специальных запусков путь каталога можно переопределить `TRANSACTIONER_USER_DATA_DIR`.

Основные таблицы:

| Область | Таблицы | Назначение |
|---|---|---|
| Игроки | `players`, `player_contacts`, `accounts` | карточка, контакты, аккаунты румов, default wallet/network, last-used |
| Румы | `room_profiles` | локальный список и активность румов |
| Сделки | `room_deals` | тип сделки, язык, короткий/полный текст, регистрационные поля |
| Платежи | `room_payment_methods`, `room_wallets` | методы/лимиты и отдельно адреса депозитных кошельков |
| Страны | `room_country_availability` | доступность и ограничения по руму/типу сделки/языку |
| Привязки | `link_verification_templates` | локальные overrides запросов |
| Привязки | `link_verification_deal_defaults` | defaults сделки по стабильному scope, включая общие scope сети |
| Привязки | `link_verification_response_templates` | полный ответ по room/deal/language |
| Служебное | `app_settings` | одноразовые локальные migration flags |

`savePlayer` использует транзакцию SQLite: проверяет контакты, обновляет/создаёт игрока, затем полностью заменяет его строки контактов и аккаунтов. Уникальность контактов дополнительно обеспечивается case-insensitive индексами.

Foreign keys описаны в таблицах, однако код не выполняет явный `PRAGMA foreign_keys = ON`; связанные строки игрока поэтому удаляются вручную до удаления `players`.

### Миграции и seed

`TransactionerDatabase.initialize()` создаёт отсутствующие таблицы, затем `migrate()`:

- добавляет отсутствующие legacy-колонки;
- переносит старые primary contacts;
- нормализует структуру шаблонов ответа и deal defaults;
- выполняет идемпотентный seed справочника;
- очищает старые объединённые payment methods;
- выполняет одноразовый reset старых поставленных кошельков;
- переносит/согласует методы и кошельки.

Seed сделок, методов и шаблонов добавляет отсутствующие данные, но не должен перезаписывать ручные значения. Текущий `roomKnowledgeSeed.wallets` не является источником пользовательских адресов: кошельки настраиваются локально.

### Другие локальные данные

- `app-state.json` рядом с БД хранит последнюю версию просмотренных release notes.
- Renderer `localStorage` хранит только UI defaults/settings, перечисленные выше.
- `USER_RELEASE_NOTES.txt` поставляется внутри приложения как read-only ресурс.
- История сформированных заявок, проверок и найденных транзакций не хранится.

## Backup

Каталог по умолчанию:

```text
<electron app.getPath('documents')>/Transactioner Backups
```

Его можно переопределить `TRANSACTIONER_BACKUP_DIR`.

Механизмы:

1. `createDailyDatabaseBackup` до открытия БД создаёт `transactioner-YYYY-MM-DD.db`, если сегодняшнего файла ещё нет, и заменяет `transactioner-latest.db`.
2. `createDatabaseSnapshotBackup` перед mutations справочника создаёт `transactioner-before-room-edit-YYYY-MM-DD-HHMMSS.db` и обновляет latest.
3. После успешных mutations main повторно вызывает daily backup, но существующий файл дня не перезаписывается.

Backup реализован копированием файла через временный файл и rename. Ошибка журналируется и не блокирует изменение. В коде нет автоматического retention, восстановления из UI или проверки целостности backup после записи.

## Основные runtime-потоки

### Поиск и карточка игрока

```text
React form
  → electronAPI.searchPlayer/savePlayer
  → IPC
  → TransactionerDatabase
  → SQLite
  → payload player + contacts + accounts
  → React workspace
```

Поиск загружает агрегированные значения игрока, контактов и аккаунтов, затем ранжирует точные и fuzzy-совпадения. Найденным игрокам обновляется `last_used_at`.

### Депозит/вывод

```text
Игрок + аккаунт + операция
  → FormView формирует поля и preview
  → resolveTransaction (для полного hash)
      → main-process explorer clients
      → проверка known active room wallets
      → сумма/сеть/время/warnings
  → проверка локальных payment methods/limits
  → clipboard
  → optional updateDefaultWalletDetails
```

Формат готового текста строится в renderer. Проверка blockchain-транзакции и чтение API keys выполняются в main. Активные кошельки всех румов передаются resolver как known wallets, чтобы обнаруживать попадание на кошелёк другого рума и неоднозначные batch transfers.

### Привязки

```text
Встроенные room rules + SQLite overrides/defaults
  → renderer формирует request text
  → renderer формирует TSV #1 и TSV #2
  → clipboard plain/rich text
```

Никакая запись проверки или статуса не создаётся. Сохранение defaults сделки выполняется отдельным IPC после debounce. Шаблоны ответа читаются из SQLite по существующему `room_key`, типу сделки и языку.

### Рейкбек

```text
Игрок + accounts + wallet/network + period
  → renderer local settings с affiliate wallets
  → IPC search-rakeback-transaction
  → explorer API
  → список candidates
  → renderer selection + template
  → clipboard
```

Поиск не записывает историю. При подтверждении реквизиты сохраняются в существующие поля игрока `default_wallet/default_wallet_network`.

## Внешние интеграции

| Сервис | Назначение | Поведение при ошибке |
|---|---|---|
| Etherscan API v2 | Ethereum/BSC transaction lookup и часть поиска рейкбека | явная ошибка/not configured; rate-limit requests сериализуются и повторяются ограниченно |
| Tronscan API | TRON transaction lookup и transfer history | явная ошибка; опциональный API key |
| Binplorer | BSC transaction/address fallback paths | явная ошибка либо отсутствие результата |
| Blockstream | Bitcoin transaction lookup | explorer-ссылка; сумма используется только при однозначно определённом известном выходе, иначе ручная проверка |
| Frankfurter | дневной курс USD→EUR | форма показывает ошибку конвертации; локального кеша курса нет |
| GitHub Releases API | проверка latest release | best effort, не блокирует запуск |

Прямых запросов к Notion, Google Docs, Google Sheets, Supabase или Telegram нет.

## API keys и trust boundaries

`transactionResolver` ищет файл ключей в следующем порядке:

1. `TRANSACTIONER_API_KEYS_PATH`;
2. packaged resource `private/api-keys.env`;
3. локальный developer fallback вне репозитория.

`scripts/prepare-api-keys.mjs` копирует исходный файл в `build/private/api-keys.env` перед соответствующей сборкой. `build/private/` и `docs/supabase/creds.txt` запрещено коммитить.

Важно: packaged desktop resource доступен на устройстве пользователя и не равен серверному секрет-хранилищу. Текущая модель подходит только для ключей с приемлемым риском распространения в клиентском приложении; server-level secrets помещать туда нельзя.

Main process разрешает открывать внешнюю update-ссылку только при `https`, host `github.com` и path prefix `/AntonVasilevsky/transactioner/releases/`.

## Обновления и release notes

При запуске renderer параллельно и неблокирующе:

- запрашивает версию приложения;
- вызывает проверку latest GitHub Release;
- читает packaged release notes и локальную отметку просмотра.

Update checker сравнивает числовые части версии и показывает ссылку, только если latest release новее и его URL проходит allowlist. Автоматической загрузки или установки обновления нет: пользователь переходит на GitHub Release.

Release workflow определяется `AGENTS.md`:

```text
version:bump ровно один раз
  → проверить package.json/package-lock.json
  → prepend USER_RELEASE_NOTES.txt
  → full tests
  → production build/distributable
  → commit/push
  → GitHub Release v<version> + installers для in-app prompt
```

Текущий `package.json` также содержит отдельные build/dist scripts; наличие команды не отменяет порядок и проверки из `AGENTS.md`.

## Сборка и распространение

- Renderer output: `dist/`.
- Electron main/preload output: `dist-electron/`.
- Packaged resources: production bundles, `package.json`, `USER_RELEASE_NOTES.txt`, подготовленный приватный resource.
- macOS target: DMG.
- Windows target: NSIS x64; `deleteAppDataOnUninstall: false`, поэтому installer не должен удалять user data при обычном uninstall flow.
- Output Electron Builder: `release/`.

SQLite native module требует пересборки под Electron; scripts используют `electron-rebuild` и `electron-builder install-app-deps`.

## Проверки

Фактические тестовые слои:

- `electron/database.test.ts` — схема, миграции, seed, запросы и mutations SQLite;
- `electron/transactionResolver.test.ts` — parsing, explorer responses, known wallets и warnings;
- `electron/rakebackTransactionSearch.test.ts` — поиск выплат;
- `electron/backup.test.ts`, `currency.test.ts`, `updates.test.ts` — main services;
- `src/components/*.test.ts` и `src/utils/*.test.ts` — правила renderer, formatting, search, validation и отдельное component behaviour.

Основные команды: `npm test`, `npm run lint`, `npm run build`. Release workflow требует полный тестовый прогон и production build перед commit/push distributable release.

## Фактические ограничения и gaps

1. **Нет общей базы.** Каждая установка имеет собственные данные и локальные edits.
2. **Нет authentication/authorization.** Любой пользователь устройства, запустивший приложение, получает доступ к локальным функциям и режиму редактирования.
3. **Привязка не сохраняет core players.** В room rules есть `persistPlayerInMainDb`, но `LinkVerificationView` не вызывает `savePlayer`.
4. **Hard delete расходится с планом.** Код удаляет кошельки и методы, хотя исторический room plan предлагал только inactive.
5. **Backup best effort.** Ошибка snapshot не останавливает mutation; нет retention и restore UI.
6. **Разные локальные хранилища.** Основные данные находятся в SQLite, но UI defaults и affiliate wallet settings — в `localStorage`, а release-note state — в JSON.
7. **Один wallet slot у игрока.** Вывод и рейкбек используют одни поля `players.default_wallet/default_wallet_network`; отдельной сущности/истории кошельков нет.
8. **Нет operation history/audit.** Депозиты, выводы, проверки, поиски рейкбека и автор изменений не сохраняются.
9. **Страны неполны.** Схема и UI существуют, но реальные данные намеренно не seed-ятся без проверки.
10. **README устарел.** Корневой `README.md` остаётся шаблоном Vite и не описывает эту архитектуру.

## Отложенная будущая версия

Supabase, Notion, Google, server auth, роли, совместная очередь, audit, sync, Telegram worker и conflict resolution не являются частью этой архитектуры. Старые схемы будущей серверной версии в `docs/project_specification.md` рассматриваются как план/исследование, а не описание текущей системы. Выбор источника истины по категориям данных отложен владельцем на отдельный этап.

## Источники

- [`../../package.json`](../../package.json) и lock/config files — стек, scripts и packaging.
- [`../../electron/main.ts`](../../electron/main.ts), [`../../electron/preload.ts`](../../electron/preload.ts), [`../../electron/database.ts`](../../electron/database.ts) — process boundaries, IPC и SQLite.
- [`../../electron/backup.ts`](../../electron/backup.ts), [`../../electron/transactionResolver.ts`](../../electron/transactionResolver.ts), [`../../electron/rakebackTransactionSearch.ts`](../../electron/rakebackTransactionSearch.ts), [`../../electron/currency.ts`](../../electron/currency.ts), [`../../electron/updates.ts`](../../electron/updates.ts) — main services.
- [`../../src/App.tsx`](../../src/App.tsx), [`../../src/components/`](../../src/components/) и [`../../src/utils/`](../../src/utils/) — renderer flow и formatting rules.
- [`../../docs/project_specification.md`](../../docs/project_specification.md), [`../../docs/link_verification_mvp_notes.md`](../../docs/link_verification_mvp_notes.md), [`../../docs/room_knowledge_plan.md`](../../docs/room_knowledge_plan.md) — смешанные исторические требования и планы.
- [`notes/T-0001-source-map.md`](notes/T-0001-source-map.md) — инвентаризация и классификация источников.

## Status log

- 2026-10-01 — создано фактическое описание текущей локальной архитектуры; ожидает проверки владельцем.
- 2026-10-02 — добавлены общие компоненты полей выбора и единая сортировка румов (T-0009).
