---
id: T-0009
title: Единые правила поведения полей выбора во всём приложении
status: active
owner: agent
model: L2 — общий компонент выбора и замена в нескольких экранах
executed_by: claude-code/claude-opus-5-5
depends_on: [T-0006, T-0007, T-0008]
aliases: [Unified picker and date field behavior]
scope: [ui]
links: [src/components/RoomNamePicker.tsx, src/components/LinkVerificationView.tsx, src/components/RoomInfoView.tsx, src/components/RoomAdminView.tsx, src/components/RakebackView.tsx, src/components/AddPlayerView.tsx, src/components/EditPlayerView.tsx, src/utils/linkVerificationFormatting.ts, src/components/fields/useDropdownField.ts, src/components/fields/ComboboxField.tsx, src/components/fields/SelectField.tsx, src/components/fields/DateField.tsx, src/utils/roomUsageSort.ts]
sessions: []
commits: [b2af5b5]
revision: 5
created: 2026-10-02
updated: 2026-10-02
---
## Goal

Требование владельца (2026-10-02): поля одного типа подчиняются одинаковым правилам во всех местах приложения — списки выбора с поиском (рум, мессенджер, источник) ведут себя одинаково, календари — одинаково, списки румов везде сортируются по частоте использования. Сейчас каждый экран реализует выпадающий список по-своему (7 копий в `LinkVerificationView`, `RoomNamePicker`, `RoomInfoView`, `RoomAdminView`), поэтому правки T-0006…T-0008 приходится повторять и они расходятся.

## Acceptance

- Объём согласован владельцем 2026-10-02 («делаем как считаешь правильным»): общий компонент делается сейчас, оставшиеся требования T-0006/T-0007/T-0008 закрываются через него.
- Системные `<select>` (вид macOS, скриншот владельца) заменены списком в едином стиле приложения — как у поля «Рум» в «Привязках».
- Все списки выбора с поиском используют один общий компонент (или общий хук) с едиными правилами: открытие по клику/Tab, без открытия при возврате в окно, повторный клик закрывает и возвращает прежнее значение, Esc закрывает, список виден целиком у нижней границы окна.
- Все поля дат используют одно поведение календаря: без открытия при возврате в окно, повторный клик закрывает календарь с исходным значением.
- Все списки румов сортируются по частоте использования одним общим правилом (на основе существующей `sortLinkVerificationRoomOptions`).
- Правила записаны в `pdk/knowledge/requirements.md` или `architecture.md`, чтобы новые поля следовали им.
- Проходят `npm run lint`, `npm test`, `npm run build`; `pdk check` — 0 errors.

## Checkpoint

Works: общие поля в src/components/fields: useDropdownField (правила открытия/закрытия: клик открывает, повторный клик и Esc закрывают с прежним значением, Tab открывает, возврат в окно не открывает, прокрутка к списку после клика через rAF), ComboboxField (список с поиском, стрелки/Enter), SelectField (замена всех 15 системных <select>), DateField (свой календарь вместо системного). Все 7 списков с поиском и 15 select переведены; даты рейкбека — DateField. Единая сортировка румов src/utils/roomUsageSort.ts (Nexa, Champion Poker, RedStar → число аккаунтов → алфавит) во всех списках румов; sortLinkVerificationRoomOptions теперь обёртка. Требования REQ-UI-001…005 и архитектура обновлены.
Verified: npm run lint — ok; npm test — 22 файла, 188/188; npm run build — ok; pdk check — 0 errors. В приложении не проверялось (нет DOM-тестов).
Not done: ручная проверка владельцем; коммит.
Changed: src/components/fields/*, src/hooks/useRoomUsageStats.ts, src/utils/{roomUsageSort,calendar}.ts(+tests), src/components/{LinkVerificationView,RoomInfoView,RoomAdminView,FormView,AddPlayerView,EditPlayerView,RakebackView,RoomNamePicker}.tsx, src/utils/linkVerificationFormatting.ts, pdk/knowledge/{requirements,architecture}.md. Удалён несохранённый src/utils/dropdownReveal.ts (заменён хуком).
Pending decisions: убраны закрепление Shenpoker в «Ответ» и локальный счётчик просмотров в «Информации о руме» — ради единого правила; вернуть, если владелец против.

## Next step

Владельцу пройти чек-лист ручной проверки (в ответе агента 2026-10-02); по итогам — исправить найденное, затем коммит T-0006…T-0009 одним коммитом и --status done для всех четырёх.

## Blockers

Нет.

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-02 update: links +src/components/fields/useDropdownField.ts +src/components/fields/ComboboxField.tsx +src/components/fields/SelectField.tsx +src/components/fields/DateField.tsx +src/utils/roomUsageSort.ts
- 2026-10-02 checkpoint: Works: общие поля в src/components/fields: useDropdownField (правила открытия/закрытия: клик открывает, повторный кли...
- 2026-10-02 update: commits +b2af5b5
