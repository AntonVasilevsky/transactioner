---
id: T-0025
title: "Общие элементы оформления: одни кнопки копирования, редактирования, переключатели языка на всех экранах"
status: proposed
owner: agent
model: "L2 — medium: вынести повторяющиеся элементы в src/components/ui и заменить на экранах без изменения поведения"
executed_by: ""
depends_on: []
aliases: [ui kit shared buttons copy edit language switcher design consistency общие кнопки]
scope: [ui]
links: [src/components/ui/IconButtons.tsx, src/components/RoomInfoView.tsx, src/components/RoomAdminView.tsx, src/components/LinkVerificationView.tsx, src/components/RakebackView.tsx, src/components/FormView.tsx, src/components/PlayerListView.tsx, src/components/QuickRepliesView.tsx]
sessions: []
commits: []
revision: 1
created: 2026-10-08
updated: 2026-10-08
---
## Goal

Владелец (2026-10-08): «отдельной задачей сделать общие элементы оформления, а то не первый раз уже визуально другую кнопку применяешь». Один вид для одного действия на всех экранах; новые экраны собираются из общих элементов, а не рисуют свои.

Начато в T-0024: `src/components/ui/IconButtons.tsx` — `IconCopyButton`, `IconEditButton` в стиле кнопки копирования «Инфо по румам» (используют RoomInfoView и QuickRepliesView).

Найденные расхождения (2026-10-08):
- Копирование: иконка (RoomInfoView), таблетка с текстом (LinkVerificationView `bg-blue-500/20`), большие кнопки с текстом (FormView «Скопировать шаблон», RakebackView «Скопировать»).
- Редактирование: `p-3 rounded-xl` (PlayerListView), `h-9 w-9 border` (RoomAdminView), иконка `IconEditButton`.
- Переключатель RU/EN/ES: свой в FormView, RoomInfoView, LinkVerificationView, RoomAdminView, QuickRepliesView.
- Кнопки «Сохранить / Отмена / Удалить», карточки, панели, сообщения об ошибке/успехе — разные отступы и скругления.

## Acceptance

- В `src/components/ui/` общие элементы: кнопки-иконки (копировать, редактировать, удалить), основная/вторичная/опасная кнопка, переключатель языка, панель и карточка, сообщения ошибка/успех; у каждого — короткое описание, когда применять.
- Главные действия экрана (большая «Скопировать шаблон») остаются крупными, но тоже из общего элемента.
- Все экраны переведены на общие элементы; поведение не меняется; владелец сверяет вид по экранам.
- Правило «новые элементы — только из `src/components/ui`» записано в `pdk/knowledge/rules.md` (с согласия владельца).
- lint, тесты, build — ok; `pdk check` 0 errors.

## Checkpoint

## Next step

## Blockers

## Log

- 2026-10-08 created
