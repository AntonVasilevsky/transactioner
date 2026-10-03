---
id: T-0015
title: Подсказки и мессенджеры в проверке привязки из одного правила
status: proposed
owner: agent
model: "L1 — low: подсказки под формой и таблица мессенджеров"
executed_by: ""
depends_on: []
aliases: [link verification hints from rule messenger table persistPlayerInMainDb dead flag]
scope: [link-verification]
links: [src/components/LinkVerificationView.tsx, src/utils/linkVerificationFormatting.ts]
sessions: []
commits: []
revision: 1
created: 2026-10-03
updated: 2026-10-03
---
## Goal

Ревью 2026-10-03 (принято владельцем), мелкие нарушения «одного правила» на экране проверки привязки:

1. Подсказки под формой не зависят от правила (`LinkVerificationView.tsx:581`): «Данные для запроса: Nick, Room ID, Email» одинакова для всех румов; «Автосохранение игрока: нет» зашита, флаг `persistPlayerInMainDb` нигде не читается.
2. Мессенджеры заданы тремя независимыми способами: `messengerOptions` в компоненте, `normalizeMessengerLabel`, `toDirectusMessenger`; мессенджер копируется в «Источник».

## Acceptance

- Подсказка «Данные для запроса» строится из правила рума; строка об автосохранении либо отражает флаг, либо удалена вместе с флагом (решение владельца).
- Одна таблица мессенджеров (подпись, префикс Directus); список вариантов, нормализация и Directus-префикс выводятся из неё; TSV не меняется.
- `npm run lint`, `npm test`, `npm run build` — ok; `pdk check` — 0 errors.

## Checkpoint

## Next step

## Blockers

## Log

- 2026-10-03 created
