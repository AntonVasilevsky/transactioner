---
id: T-0010
title: Список недавних игроков при клике по пустому полю поиска
status: active
owner: agent
model: L2 — UI + IPC + SQLite
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [Recent players dropdown on empty search]
scope: [players, ui]
links: [src/components/SearchPlayerView.tsx, src/App.tsx, electron/database.ts, electron/main.ts, electron/preload.ts, src/vite-env.d.ts, src/utils/recentPlayers.ts]
sessions: []
commits: []
revision: 3
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

Works: клик по пустому полю «Найти игрока» открывает список игроков (useDropdownField + DropdownPanel), сверху недавно открытые; выбор открывает карточку. Новый IPC mark-player-used вызывается в App.handlePlayerFound; searchPlayer больше не обновляет last_used_at.
Verified: npm run lint — ok; npm test — 23 файла, 191/191 (новые: recentPlayers.test.ts, database.test.ts «orders recent players by opening, not by searching»); npm run build — ok; pdk check — 0 errors.
Not done: ручная проверка; коммит. У существующих игроков last_used_at уже заполнен прежней логикой (последний поиск) — порядок станет точным по мере открытия карточек.
Changed: src/components/SearchPlayerView.tsx, src/App.tsx, electron/{database,main,preload}.ts, src/vite-env.d.ts, src/components/fields/useDropdownField.ts (canOpen), src/utils/recentPlayers.ts(+test), electron/database.test.ts, pdk/knowledge/requirements.md.

## Next step

Владельцу перезапустить npm run dev (изменены main/preload) и проверить список недавних игроков; затем коммит вместе с T-0006…T-0009.

## Blockers

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active, links +src/utils/recentPlayers.ts
- 2026-10-02 checkpoint: Works: клик по пустому полю «Найти игрока» открывает список игроков (useDropdownField + DropdownPanel), сверху недавн...
