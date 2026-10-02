---
id: T-0007
title: "Прокручивать окно, чтобы выпадающий список был виден целиком"
status: done
owner: agent
model: L1 — локальное UI-поведение
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [Scroll dropdown into view near bottom edge]
scope: [ui]
links: [src/components/RoomNamePicker.tsx, src/components/LinkVerificationView.tsx, src/components/RoomInfoView.tsx, src/components/RoomAdminView.tsx]
sessions: []
commits: [b2af5b5]
revision: 7
created: 2026-10-02
updated: 2026-10-02
---
## Goal

Если поле с выпадающим списком находится у нижней границы окна (например, «Покер-рум» в карточке игрока), при открытии список обрезан и его не видно. При открытии окно должно прокручиваться ровно настолько, чтобы список был виден целиком; если список и так помещается, страница не двигается.

## Acceptance

- При открытии списка у нижней границы окна страница плавно прокручивается до нижнего края списка.
- Списки, которые уже видны целиком, не вызывают прокрутку.
- Прокрутка происходит только при открытии списка, а не при каждом вводе символа в поиске.
- Одинаково для всех выпадающих списков: `RoomNamePicker`, `LinkVerificationView` (рум, мессенджер, источник, рум ответа), `RoomInfoView`, `RoomAdminView`.
- Проходят `npm run lint`, `npm test`, `npm run build`; `pdk check` — 0 errors.

## Checkpoint

Works: общие поля выбора (src/components/fields: useDropdownField, ComboboxField, SelectField, DateField) с едиными правилами — клик открывает, повторный клик и Esc закрывают с прежним значением, Tab открывает, возврат в окно не открывает, список у нижнего края прокручивается в зону видимости; системные <select> заменены; свой календарь в рейкбеке; единая сортировка румов (roomUsageSort); «Добавить рум» — пустой рум, фокус без открытия списка, проверка пустого рума при сохранении.
Verified: npm run lint, npm test 191/191, npm run build — ok; ручная проверка владельца 2026-10-02 — все 8 пунктов чек-листа ок (вид списков, повторный клик/Esc, клавиатура, нижний край, «Добавить рум», свой рум, календарь, возврат в окно).
Changed: коммит b2af5b5.

## Next step

Нет — задача закрыта.

## Found in manual check

- 2026-10-02, владелец: «Редактировать игрока», клик в «Покер-рум» существующего аккаунта у нижней границы окна (Nexa) — список румов открылся за границей окна, прокрутки не было. `revealDropdown` в `RoomNamePicker` не сработал или был перебит; причину не выяснял.

## Blockers

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-02 checkpoint: Works: src/utils/dropdownReveal.ts — ref-callback revealDropdown вызывает scrollIntoView({block:'nearest', behavior:'...
- 2026-10-02 checkpoint: Works: src/utils/dropdownReveal.ts — revealDropdown (scrollIntoView nearest, smooth) подключён к 7 спискам.
- 2026-10-02 checkpoint: Works: причина провала найдена — список открывался на нажатии мыши, плавная прокрутка стартовала, а выделение текста ...
- 2026-10-02 update: commits +b2af5b5
- 2026-10-02 checkpoint: Works: общие поля выбора (src/components/fields: useDropdownField, ComboboxField, SelectField, DateField) с едиными п...
- 2026-10-02 update: status active -> done
