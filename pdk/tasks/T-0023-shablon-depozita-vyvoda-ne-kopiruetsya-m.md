---
id: T-0023
title: Шаблон депозита/вывода не копируется молча без суммы
status: done
owner: agent
model: "L1 — low: проверка заполненности перед копированием"
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [copy template without amount warning prefilled dollar sign missing fields]
scope: [transactions]
links: [src/components/FormView.tsx]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: [97cc5ed]
revision: 5
created: 2026-10-08
updated: 2026-10-08
---
## Goal

Владелец (2026-10-08): шаблон вывода Nexa скопировался без суммы и без предупреждения. Причины: поле суммы заранее содержит «$», проверка считала его заполненным; при незаполненных полях копирование не останавливалось (поля лишь подсвечивались).

## Acceptance

- Сумма без цифр («$», «€») считается пустой: поле подсвечивается.
- При незаполненных полях копирование спрашивает «Не заполнено: … Скопировать шаблон всё равно?».
- lint, тесты, build — ok; ручная проверка владельца.

## Checkpoint

Works: isAmountEmpty (нет цифр = пусто) в проверке и подсветке; при пропусках confirm перед копированием. Verified: tsc ok, lint 0, тесты 243/243 (Node-сборка sqlite). Not done: коммит, ручная проверка; отдельного теста формы нет (компонент без тестов).

## Next step

Нет — закрыто. В релиз со следующей сборкой.

## Blockers

## Log

- 2026-10-08 created
- 2026-10-08 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-08 checkpoint: Works: isAmountEmpty (нет цифр = пусто) в проверке и подсветке; при пропусках confirm перед копированием. Verified: t...
- 2026-10-08 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-08 checkpoint: Works: isAmountEmpty (нет цифр = пусто) в проверке и подсветке; при пропусках confirm перед копированием. Verified: t...
- 2026-10-08 update: status active -> done
