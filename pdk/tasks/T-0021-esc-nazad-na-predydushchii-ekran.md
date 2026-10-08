---
id: T-0021
title: Esc — назад на предыдущий экран
status: done
owner: agent
model: "L1 — low: навигация по клавише, данные не меняются"
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [escape key back navigation previous screen room settings room info find player]
scope: [navigation]
links: [src/utils/escapeNavigation.ts, src/hooks/useEscapeBack.ts, src/App.tsx, src/components/RoomAdminView.tsx, src/components/RoomInfoView.tsx]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: ["8704386"]
revision: 5
created: 2026-10-05
updated: 2026-10-08
---
## Goal

Запрос владельца (2026-10-05): Esc возвращает на предыдущий экран — из настроек румов в «Инфо по румам», следующий Esc — на главную «Найти игрока». Одно правило для всего приложения.

## Acceptance

- Esc закрывает открытый список/календарь/окно «Что нового», не уходя с экрана.
- В текстовом поле первый Esc только снимает фокус (введённое не теряется), второй — назад.
- Настройки румов → Инфо по румам → Найти игрока; Все игроки, Добавить игрока, Привязки, карточка игрока → Найти игрока; редактирование игрока → Все игроки.
- Правило в одном месте (`src/utils/escapeNavigation.ts`), вложенные экраны регистрируют свой «назад» (`useEscapeBack`); тесты; `npm run lint`, `npm test`, `npm run build` — ok; `pdk check` — 0 errors; ручная проверка владельца.

## Checkpoint

Works: Esc = назад (закрывает список/окно, в поле — снимает фокус, затем назад: настройки румов → Инфо по румам → Найти игрока). Правило в src/utils/escapeNavigation.ts.
Verified: lint ok; npm test 235/235; build ok; pdk check 0 errors. Ручная проверка владельца 2026-10-08 — работает.
Changed: коммит 8704386.

## Next step

Нет — закрыто.

## Blockers

## Log

- 2026-10-05 created
- 2026-10-05 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-05 checkpoint: Works: Esc = назад по правилу из Acceptance; глобальный обработчик в App.tsx, правило и стек вложенных «назад» в src/...
- 2026-10-05 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-08 checkpoint: Works: Esc = назад (закрывает список/окно, в поле — снимает фокус, затем назад: настройки румов → Инфо по румам → Най...
- 2026-10-08 update: status active -> done
