---
id: T-0026
title: Выпадающие списки и календарь не перекрываются соседними блоками
status: done
owner: agent
model: "L2 — medium: общий DropdownPanel через портал с фиксированным положением, без изменения поведения полей"
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [dropdown hidden behind next panel stacking context select messenger list overlapped portal]
scope: [ui, fields]
links: [src/components/fields/DropdownPanel.tsx, src/components/fields/useDropdownField.ts, src/components/AddPlayerView.tsx]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: [d30f328]
revision: 5
created: 2026-10-14
updated: 2026-10-14
---
## Goal

Владелец (2026-10-14, скриншот «Добавить игрока»): выпадающий список мессенджеров закрывается блоком «Кошелек по умолчанию для вывода». Причина общая: карточки экранов с `backdrop-blur` образуют отдельные слои (stacking context), панель списка (`absolute z-30`) заперта в своей карточке, и следующая карточка рисуется поверх. Касается всех списков (SelectField, ComboboxField), календаря (DateField) и недавних игроков в поиске.

## Acceptance

- Один общий `DropdownPanel` рисуется поверх окна (портал в body, `position: fixed`) рядом со своим полем; правило положения — `dropdownPlacement` (под полем; вверх, если внизу не помещается и сверху места больше; не выходит за край окна); следует за полем при прокрутке и изменении размера окна.
- Ширина как раньше: по полю (Combobox, недавние игроки), не уже поля (Select), своя (календарь).
- Открытие/закрытие, клавиатура, выбор мышью не меняются.
- lint, тесты, build — ok; ручная проверка владельца: «Добавить игрока» (мессенджер), депозит/вывод (рум, сеть), дата в рейкбеке, недавние игроки в поиске.

## Checkpoint

Works: src/components/fields/dropdownPlacement.ts (+4 теста); DropdownPanel через createPortal в body, fixed z-50, позиция от offsetParent невидимого якоря (= прежний relative-контейнер поля), пересчёт на resize/scroll (capture); width: field | atLeastField (Select) | content (Date w-72); panelRef/scrollIntoView удалены из useDropdownField и 4 вызовов. Verified: tsc ok, lint 0, тесты 255/255 (Node-сборка sqlite), build ok. Not done: ручная проверка, коммит.

## Next step

Нет — закрыто.

## Blockers

## Log

- 2026-10-14 created
- 2026-10-14 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-14 checkpoint: Works: src/components/fields/dropdownPlacement.ts (+4 теста); DropdownPanel через createPortal в body, fixed z-50, по...
- 2026-10-14 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-14 checkpoint: Works: src/components/fields/dropdownPlacement.ts (+4 теста); DropdownPanel через createPortal в body, fixed z-50, по...
- 2026-10-14 update: status active -> done
