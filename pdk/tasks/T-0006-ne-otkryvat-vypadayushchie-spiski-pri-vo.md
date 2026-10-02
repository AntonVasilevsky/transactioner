---
id: T-0006
title: Не открывать выпадающие списки при возврате в окно приложения
status: active
owner: agent
model: L1 — локальное UI-поведение
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [Picker dropdown reopens on window refocus]
scope: [link-verification, ui]
links: [src/components/LinkVerificationView.tsx, src/components/RoomNamePicker.tsx, src/components/RoomInfoView.tsx, src/components/RoomAdminView.tsx]
sessions: []
commits: []
revision: 6
created: 2026-10-02
updated: 2026-10-02
---
## Goal

Поля с выпадающим списком (рум, мессенджер, источник, рум ответа, RoomNamePicker, справочник румов) и поля дат рейкбека не должны сами открывать список/календарь, когда оператор возвращается в окно приложения из браузера или мессенджера. Причина: Chromium при активации окна возвращает фокус последнему полю, а поля открывают список в `onFocus`.

## Acceptance

- После выбора рума, переключения в другое приложение и возврата список румов не открывается, выбранный рум и текст поля не меняются.
- Клик по полю и переход в него клавиатурой (Tab) по-прежнему открывают список.
- Повторный клик по полю с уже открытым списком закрывает список, а значение поля возвращается к тому, что было до открытия (запрос владельца 2026-10-02).
- Поведение одинаково во всех полях с открытием по фокусу: `LinkVerificationView` (рум, мессенджер, источник, рум ответа), `RoomNamePicker`, `RoomInfoView`, `RoomAdminView`, даты в `RakebackView`.
- Логика вынесена в общий модуль с тестами; проходят `npm run lint`, `npm test`, `npm run build`; `pdk check` — 0 errors.

- Поле даты (календарь): повторный клик по полю с открытым календарём закрывает его, значение остаётся тем, с которым календарь был открыт (запрос владельца 2026-10-02).

## Checkpoint

Works: возврат в окно не открывает списки (проверено владельцем). Новые требования (повторный клик закрывает список/календарь с прежним значением) реализованы в общем хуке T-0009 для всех полей.
Verified: npm run lint — ok; npm test — 22 файла, 188/188; npm run build — ok; pdk check — 0 errors. В приложении не проверялось (нет DOM-тестов).
Not done: ручная проверка повторного клика; коммит.
Changed: src/utils/windowFocusRestore.ts(+test); подключение — через src/components/fields/useDropdownField.ts (T-0009).

## Next step

Ждёт ручной проверки T-0009 (повторный клик по списку и календарю); затем коммит и --status done.

## Found in manual check

- 2026-10-02, владелец: возврат в окно — поля «Рум», «Мессенджер», «Источник», «Рум» в «Ответ» и даты рейкбека — ок.

## Blockers

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-02 checkpoint: Works: общий модуль src/utils/windowFocusRestore.ts — после blur окна первый фокус считается восстановлением и не отк...
- 2026-10-02 checkpoint: Works: общий модуль src/utils/windowFocusRestore.ts — после blur окна первый фокус считается восстановлением и не отк...
- 2026-10-02 checkpoint: Works: windowFocusRestore подключён в 9 местах; ручная проверка владельца — возврат в окно ок для всех полей «Привязо...
- 2026-10-02 checkpoint: Works: возврат в окно не открывает списки (проверено владельцем). Новые требования (повторный клик закрывает список/к...
