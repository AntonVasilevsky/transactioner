---
id: T-0022
title: "Кошельки отправки рейкбека хранить в базе, общие для всех копий приложения"
status: done
owner: agent
model: "L2 — medium: перенос настройки из localStorage в SQLite с одноразовым импортом; риск потерять список кошельков"
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [rakeback sender affiliate wallets localStorage to database shared backup]
scope: [rakeback, database]
links: [src/utils/rakebackSettings.ts, src/components/RakebackView.tsx, electron/database.ts, electron/main.ts]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: [97cc5ed]
revision: 6
created: 2026-10-08
updated: 2026-10-08
---
## Goal

Сообщение владельца (2026-10-08): в «Рейкбек» приложение просит «Добавьте кошелек, с которого отправляется рейкбек», хотя кошельки уже сохранены и одинаковы для всех игроков. Причина: список хранился в localStorage окна — у установленного приложения (file://) и у npm run dev (http://localhost:5173) разные хранилища (в установленном был полный список из 12 адресов, в dev — 2 ERC20), в резервные копии БД он не попадал и терялся бы при переустановке.

## Acceptance

- Список кошельков отправки рейкбека хранится в SQLite (`app_settings.rakeback_sender_wallets`), один для всех копий приложения, попадает в резервные копии.
- Старый список из localStorage импортируется один раз на копию приложения без потерь и дублей адресов (пустая БД берёт его целиком, иначе дописываются только строки с новыми адресами).
- Поиск рейкбека и импорт находят адреса по одному правилу (`rakebackSenderWalletAddresses`).
- Предупреждение «Добавьте кошелек…» показывается только когда список в БД действительно пуст (и не во время загрузки).
- Рабочая БД владельца получила полный список установленной копии; тесты; `npm run lint`, тесты, `npm run build` — ok; `pdk check` 0 errors; ручная проверка владельца.

## Checkpoint

Works: кошельки отправки рейкбека в SQLite (app_settings.rakeback_sender_wallets, IPC get/save-rakeback-sender-wallets); RakebackView читает из БД, сохраняет при правке и по кнопке; одноразовый импорт старого localStorage на копию (флаг transactioner.rakebackExplorerSettings.movedToDatabase, mergeLegacyRakebackWallets); общее правило адресов rakebackSenderWalletAddresses для поиска и импорта; предупреждение только после загрузки и при пустом списке. Запись в localStorage удалена.
Data: в рабочую БД владельца записан полный список установленной копии (10 адресов; список dev — подмножество), snapshot transactioner-before-rakeback-wallets-2026-10-08-114139.db; после перезапуска dev список в БД не изменился.
Verified: tsc ok; lint exit 0; тесты (Node-сборка better-sqlite3, рабочий модуль не тронут) 27 файлов, 243/243; build ok.
Done: ручная проверка владельца 2026-10-08 — работает. Changed: коммит 97cc5ed.
Owner 2026-10-08: сверка с эталонным списком — добавлены недостающие крипто-кошельки Champion (TRdiZ5… TRC20, 0x5637… ERC20); Skrill и Luxon не нужны. Итого 12 адресов. Snapshot transactioner-before-rakeback-wallets-champion-2026-10-08-114749.db.

## Next step

Нет — закрыто. В релиз со следующей сборкой.

## Blockers

## Log

- 2026-10-08 created
- 2026-10-08 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-08 checkpoint: Works: кошельки отправки рейкбека в SQLite (app_settings.rakeback_sender_wallets, IPC get/save-rakeback-sender-wallet...
- 2026-10-08 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-08 checkpoint: Works: кошельки отправки рейкбека в SQLite (app_settings.rakeback_sender_wallets, IPC get/save-rakeback-sender-wallet...
- 2026-10-08 checkpoint: Works: кошельки отправки рейкбека в SQLite (app_settings.rakeback_sender_wallets, IPC get/save-rakeback-sender-wallet...
- 2026-10-08 update: status active -> done
