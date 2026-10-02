---
id: T-0008
title: Фокус и прокрутка к новому руму или контакту в карточке игрока
status: done
owner: agent
model: L1 — локальное UI-поведение
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [Focus new room account row after add]
scope: [ui, players]
links: [src/components/AddPlayerView.tsx, src/components/EditPlayerView.tsx, src/components/RoomNamePicker.tsx]
sessions: []
commits: [b2af5b5]
revision: 7
created: 2026-10-02
updated: 2026-10-02
---
## Goal

В карточке игрока (создание и редактирование) кнопки «Добавить рум» и «Добавить контакт» добавляют строку внизу формы, но окно не реагирует: фокус остаётся на кнопке, новая строка может быть за нижней границей. После добавления курсор должен встать в новую строку, а окно — прокрутиться к ней.

## Acceptance

- После «Добавить рум» курсор стоит в поле «Покер-рум» нового аккаунта, окно прокручено к нему, список румов открыт и виден целиком (вместе с T-0007).
- После «Добавить контакт» курсор стоит в поле значения нового контакта.
- Существующие строки не получают фокус при открытии карточки.
- Одинаково в `AddPlayerView` и `EditPlayerView`.
- Проходят `npm run lint`, `npm test`, `npm run build`; `pdk check` — 0 errors.

## Checkpoint

Works: общие поля выбора (src/components/fields: useDropdownField, ComboboxField, SelectField, DateField) с едиными правилами — клик открывает, повторный клик и Esc закрывают с прежним значением, Tab открывает, возврат в окно не открывает, список у нижнего края прокручивается в зону видимости; системные <select> заменены; свой календарь в рейкбеке; единая сортировка румов (roomUsageSort); «Добавить рум» — пустой рум, фокус без открытия списка, проверка пустого рума при сохранении.
Verified: npm run lint, npm test 191/191, npm run build — ok; ручная проверка владельца 2026-10-02 — все 8 пунктов чек-листа ок (вид списков, повторный клик/Esc, клавиатура, нижний край, «Добавить рум», свой рум, календарь, возврат в окно).
Changed: коммит b2af5b5.

## Next step

Нет — задача закрыта.

## Found in manual check

- 2026-10-02, владелец: прокрутка к новому аккаунту, фокус в «Покер-рум», «Добавить контакт», создание игрока, отсутствие автофокуса при открытии карточки — ок.
- 2026-10-02, владелец: после «Добавить рум» сразу подставлен `1win` (первый по алфавиту, `roomOptions[0]`) и сразу открыт список. Требование: список румов в карточке игрока сортировать по частоте добавления (в «Привязках» такая сортировка уже есть — `sortLinkVerificationRoomOptions` в `src/utils/linkVerificationFormatting.ts` по `roomRegistrationStats`), а список после «Добавить рум» по умолчанию не открывать.
- Решение владельца 2026-10-02: новый аккаунт создаётся с пустым полем рума, список не открыт автоматически, румы в списке отсортированы по частоте.

## Blockers

## Log

- 2026-10-02 created
- 2026-10-02 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-02 checkpoint: Works: в AddPlayerView и EditPlayerView состояние newRowFocus помечает новую строку; поле «Покер-рум» (RoomNamePicker...
- 2026-10-02 checkpoint: Works: «Добавить рум» прокручивает к новому аккаунту и ставит курсор в «Покер-рум»; «Добавить контакт» — курсор в нов...
- 2026-10-02 checkpoint: Works: «Добавить рум» — новый аккаунт с пустым румом, курсор в поле, окно прокручено, список не открывается сам; спис...
- 2026-10-02 update: commits +b2af5b5
- 2026-10-02 checkpoint: Works: общие поля выбора (src/components/fields: useDropdownField, ComboboxField, SelectField, DateField) с едиными п...
- 2026-10-02 update: status active -> done
