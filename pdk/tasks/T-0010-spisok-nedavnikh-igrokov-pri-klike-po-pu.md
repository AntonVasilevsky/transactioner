---
id: T-0010
title: Список недавних игроков при клике по пустому полю поиска
status: done
owner: agent
model: L2 — UI + IPC + SQLite
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [Recent players dropdown on empty search]
scope: [players, ui]
links: [src/components/SearchPlayerView.tsx, src/App.tsx, electron/database.ts, electron/main.ts, electron/preload.ts, src/vite-env.d.ts, src/utils/recentPlayers.ts]
sessions: []
commits: [b2af5b5]
revision: 5
created: 2026-10-02
updated: 2026-10-02
---
## Goal

На экране «Найти игрока» клик по пустому полю открывает выпадающий список игроков; сверху те, к кому обращались последними (запрос владельца 2026-10-02).

## Acceptance

- Клик по пустому полю поиска открывает список игроков в общем стиле выпадающих списков (T-0009); выбор открывает карточку игрока.
- Порядок: по времени последнего открытия карточки, новые сверху; ни разу не открытые — по алфавиту.
- Время обращения обновляется при открытии карточки (`handlePlayerFound` в `App.tsx`: поиск, список игроков, создание, сохранение), а не при каждом поиске — раньше live-поиск помечал «использованными» всех совпавших игроков.
- Пока в поле есть текст, список не показывается — работает обычный поиск. Правила открытия/закрытия, Esc, стрелки, Enter, возврат в окно — как у остальных полей; при открытии экрана курсор в поле, список закрыт.
- Тест на порядок недавних игроков и на то, что поиск не меняет порядок; проходят `npm run lint`, `npm test`, `npm run build`; `pdk check` — 0 errors.

## Checkpoint

Works: клик по пустому полю «Найти игрока» открывает список недавних игроков (сверху последние открытые), выбор открывает карточку; last_used_at обновляется при открытии карточки (IPC mark-player-used), поиск порядок не меняет.
Verified: npm run lint, npm test 191/191, npm run build — ok; ручная проверка владельца 2026-10-02 — все 6 пунктов ок (курсор без открытия, открытие по клику, порядок A/B, повторный клик/Esc, стрелки/Enter, ввод текста скрывает список, возврат в окно не открывает).
Changed: коммит b2af5b5.

## Next step

Нет — задача закрыта.

## Blockers

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active, links +src/utils/recentPlayers.ts
- 2026-10-02 checkpoint: Works: клик по пустому полю «Найти игрока» открывает список игроков (useDropdownField + DropdownPanel), сверху недавн...
- 2026-10-02 update: commits +b2af5b5
- 2026-10-02 checkpoint: Works: клик по пустому полю «Найти игрока» открывает список недавних игроков (сверху последние открытые), выбор откры...
- 2026-10-02 update: status active -> done
