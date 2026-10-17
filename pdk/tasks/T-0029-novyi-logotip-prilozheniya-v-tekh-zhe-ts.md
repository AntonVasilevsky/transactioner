---
id: T-0029
title: Новый логотип приложения в тех же цветах
status: dropped
owner: agent
model: "L1 — low: новый public/icon.svg и npm run icons; выбор варианта за владельцем"
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [logo icon redesign app icon cooler same colors логотип иконка]
scope: [ui, branding]
links: [public/icon.svg, scripts/generate-icons.mjs]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: []
revision: 6
created: 2026-10-17
updated: 2026-10-17
---
## Goal

Владелец (2026-10-17): «переделай лого. сделай его в тех же цветах, только чтобы выглядело круче». Логотип собирается из `public/icon.svg` командой `npm run icons` (scripts/generate-icons.mjs → icon.png, icon.ico, icon.icns, icon.iconset).

## Acceptance

- Владелец выбрал вариант; новый `public/icon.svg` в тех же цветах (тёмно-синий фон, голубые градиенты, неоновая обводка).
- `npm run icons` пересоздал icon.png, icon.ico, icon.icns и icon.iconset; иконка читается на 16–32 px.
- Логотип в окне приложения (боковая панель) обновлён; сборка ok.

## Checkpoint

Закрыта владельцем 2026-10-17 без выбора варианта: public/icon.svg и файлы иконок не менялись. Три варианта остались в .pdk/cache/logo (не в git).

## Next step

Нет — закрыто. Если вернуться к логотипу: открыть .pdk/cache/logo/preview.png, выбрать вариант, скопировать в public/icon.svg, npm run icons.

## Blockers

## Log

- 2026-10-17 created
- 2026-10-17 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-17 checkpoint: Варианты в .pdk/cache/logo (a.svg, b.svg, c.svg, preview.png; не в git): A — скруглённый квадрат, стрелки ⇅ (депозит/...
- 2026-10-17 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-17 update: status active -> dropped
- 2026-10-17 checkpoint: Закрыта владельцем 2026-10-17 без выбора варианта: public/icon.svg и файлы иконок не менялись. Три варианта остались ...
