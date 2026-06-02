# Link Verification MVP Notes

Last updated: 2026-06-01
Owner: transactioner team

## Goal

Add a new in-app flow for "link verification" that generates:

1. Request message text (sent to room-specific recipient).
2. TSV row for Google Sheet #1.
3. TSV row for Google Sheet #2.

No Google API integration. Clipboard only.

## Locked Decisions

- The app generates only initial request + 2 TSV rows.
- Initial status is always `Check`.
- Operator updates status manually in Google Sheets (`Ok` / `Denied` / `Retag`) after response.
- No in-app verification history storage.
- No "re-generate after response" requirement in MVP.
- No Google Sheets API.

## Player Persistence Policy

- Auto-save/update player card only for core rooms:
  - `Nexa`
  - `Champion Poker`
  - `RedStar`
- For all non-core rooms:
  - generate request + both TSV rows
  - do NOT auto-save player in main players DB.

## Data Entry Rules (MVP)

- Date is auto-filled with current date but remains editable.
- Manager name has a default value but remains editable.
- `Передано игроку` is manual (`Да/Нет`).
- `Передали в update chat` is manual checkbox.
- Missing auto-fields can be manually filled.
- Questions from assistant should be asked one-by-one (not as a list).

## Scope Split

Core payment workflow remains unchanged.
Link verification is a separate generation flow, with optional player persistence only for core rooms.

## Known GBrain Slugs Mentioned During Planning

- `transactioner/link-verification-required-fields`
- `transactioner/link-verification-flow`
- `transactioner/link-verification-second-sheet`

## Open Items To Finalize Before Implementation

1. Final columns and order for Sheet #2 TSV.
2. Room matrix: required fields + recipient + request template per room.
3. Matching rules for player lookup (for core rooms).
4. Final default for "first column" in second sheet (`Новый` as dedicated column).

## Sheet #1 (Confirmed From Screenshot)

TSV columns (strict order):

1. `Дата`
2. `Менеджер`
3. `Мессенджер`
4. `Логин в месс.`
5. `Рум`
6. `Логин\ник\ID`
7. `Статус`
8. `Передано игроку`
9. `Передали в update chat`

Observed formatting notes:

- `Дата`: `DD.MM.YYYY`
- `Статус`: dropdown-like value (`Ok`, `Denied`, etc.); for MVP default is `Check`
- `Передано игроку`: `Да/Нет`
- `Передали в update chat`: checkbox semantics (for TSV export use explicit boolean mapping rule once finalized)
- `Логин\ник\ID`: may be composite text with separators like ` / ` (e.g. username / id / email)

## Sheet #2 (Confirmed Columns)

TSV columns (strict order):

1. `<empty header>` (dropdown: `Старый` / `Новый`)
2. `Дата добавления`
3. `Источник`
4. `Язык`
5. `Страна`
6. `Мессенджер`
7. `Логин в месс.`
8. `directusMessengers`
9. `Имя\ник`
10. `Акк на WPD`
11. `directusUsername`
12. `Менеджер`
13. `Даты реги.`
14. `Рум(ы)`
15. `directusRoom`
16. `Ник\Логин\ID`
17. `roomUsername`
18. `Сделки`
19. `directusDealSchema`
20. `Кошелек`
21. `directusPaymentSystem`
22. `directusPaymentCurrency`
23. `Адрес`
24. `directusPaymentAddress`

Notes:

- First column is intentionally headerless and uses dropdown values `Старый/Новый`.
- `directus*` fields are treated as normalized/system-facing mirrors of user-facing fields.

## Sheet #2 (Observed Fill Patterns From Real Rows)

Observed examples confirm:

- Column 1 values are both `Новый` and `Старый`.
- `Источник` examples: `Telegram`, `Site`, `WA`.
- `Язык` examples: `RU`, `ENG`.
- `Страна` may be empty.
- `directusMessengers` format:
  - `telegram: <value>`
  - `site: <value>`
  - `whatsapp: <value>`
- `Менеджер` examples: `Антон`, `Макс`, `Таня`.
- `Рум(ы)` and `directusRoom` are usually aligned by value (sometimes different casing like `1Win` vs `1win`).
- `Ник\Логин\ID` may contain:
  - one token (`sb1312552`)
  - composite string (`username / id / email`)
  - list of multiple nicks separated by ` / `.
- `roomUsername` can be:
  - single username
  - numeric ID
  - repeated multi-value list
  - empty for some deal types (e.g. race-like cases).
- `Сделки` examples:
  - `% Net Revenue`
  - `% Gross`
  - mixed text (`5% / 15% Net при 1к+`)
  - non-percent labels (`Гонка`).
- `directusDealSchema` examples are multiline ramp descriptors, e.g.:
  - `net/ramp` + newline + `0, 40%`
  - `gross/ramp` + newline + `0, 30%`
  - custom tier text (`0, 5% | 1000, 15%`).
- Wallet block may be fully empty for many rows:
  - `Кошелек`
  - `directusPaymentSystem`
  - `directusPaymentCurrency`
  - `Адрес`
  - `directusPaymentAddress`.
- When wallet is present:
  - `Кошелек` often includes both asset and network (`USDT TRC20`, `USDC ERC20`),
  - `directusPaymentSystem` tends to hold asset (`USDT`, `USDC`),
  - `directusPaymentCurrency` tends to hold network (`TRC20`, `ERC20`),
  - `Адрес` and `directusPaymentAddress` are usually identical.

Implementation implication for MVP generator:

- Do NOT enforce hard validation on optional columns that are frequently empty in real rows.
- Keep multiline TSV cells intact (especially `directusDealSchema`) to preserve Sheets behavior.
- Support one-to-many room history rows for the same person as separate output lines (no dedupe in TSV generator itself).

## Recovery Note

If chat context is lost, restart from this file and continue filling missing items.
