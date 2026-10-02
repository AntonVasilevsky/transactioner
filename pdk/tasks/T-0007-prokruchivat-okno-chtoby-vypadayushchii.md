---
id: T-0007
title: "Прокручивать окно, чтобы выпадающий список был виден целиком"
status: active
owner: agent
model: L1 — локальное UI-поведение
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [Scroll dropdown into view near bottom edge]
scope: [ui]
links: [src/components/RoomNamePicker.tsx, src/components/LinkVerificationView.tsx, src/components/RoomInfoView.tsx, src/components/RoomAdminView.tsx]
sessions: []
commits: []
revision: 5
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

Works: причина провала найдена — список открывался на нажатии мыши, плавная прокрутка стартовала, а выделение текста в обработчике клика её прерывало. Теперь при клике список открывается после выделения, прокрутка — в requestAnimationFrame (useDropdownField.panelRef); src/utils/dropdownReveal.ts удалён.
Verified: npm run lint — ok; npm test — 22 файла, 188/188; npm run build — ok; pdk check — 0 errors. В приложении не проверялось (нет DOM-тестов).
Not done: ручная проверка; коммит.
Changed: src/components/fields/useDropdownField.ts (T-0009).

## Next step

Ждёт ручной проверки T-0009 (список «Покер-рум» у нижнего края при клике мышью); затем коммит и --status done.

## Found in manual check

- 2026-10-02, владелец: «Редактировать игрока», клик в «Покер-рум» существующего аккаунта у нижней границы окна (Nexa) — список румов открылся за границей окна, прокрутки не было. `revealDropdown` в `RoomNamePicker` не сработал или был перебит; причину не выяснял.

## Blockers

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-02 checkpoint: Works: src/utils/dropdownReveal.ts — ref-callback revealDropdown вызывает scrollIntoView({block:'nearest', behavior:'...
- 2026-10-02 checkpoint: Works: src/utils/dropdownReveal.ts — revealDropdown (scrollIntoView nearest, smooth) подключён к 7 спискам.
- 2026-10-02 checkpoint: Works: причина провала найдена — список открывался на нажатии мыши, плавная прокрутка стартовала, а выделение текста ...
