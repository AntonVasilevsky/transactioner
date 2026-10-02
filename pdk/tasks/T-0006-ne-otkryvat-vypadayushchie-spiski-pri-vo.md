---
id: T-0006
title: Не открывать выпадающие списки при возврате в окно приложения
status: done
owner: agent
model: L1 — локальное UI-поведение
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [Picker dropdown reopens on window refocus]
scope: [link-verification, ui]
links: [src/components/LinkVerificationView.tsx, src/components/RoomNamePicker.tsx, src/components/RoomInfoView.tsx, src/components/RoomAdminView.tsx]
sessions: []
commits: [b2af5b5]
revision: 8
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

Works: общие поля выбора (src/components/fields: useDropdownField, ComboboxField, SelectField, DateField) с едиными правилами — клик открывает, повторный клик и Esc закрывают с прежним значением, Tab открывает, возврат в окно не открывает, список у нижнего края прокручивается в зону видимости; системные <select> заменены; свой календарь в рейкбеке; единая сортировка румов (roomUsageSort); «Добавить рум» — пустой рум, фокус без открытия списка, проверка пустого рума при сохранении.
Verified: npm run lint, npm test 191/191, npm run build — ok; ручная проверка владельца 2026-10-02 — все 8 пунктов чек-листа ок (вид списков, повторный клик/Esc, клавиатура, нижний край, «Добавить рум», свой рум, календарь, возврат в окно).
Changed: коммит b2af5b5.

## Next step

Нет — задача закрыта.

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
- 2026-10-02 update: commits +b2af5b5
- 2026-10-02 checkpoint: Works: общие поля выбора (src/components/fields: useDropdownField, ComboboxField, SelectField, DateField) с едиными п...
- 2026-10-02 update: status active -> done
