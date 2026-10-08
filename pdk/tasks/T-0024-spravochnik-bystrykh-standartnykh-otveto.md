---
id: T-0024
title: "Справочник быстрых стандартных ответов: структура и разработка"
status: done
owner: agent
model: "L3 — high: новая сущность и экран; сначала discovery/design структуры (категории, языки, переменные, связь с румами и шаблонами привязки), затем реализация"
executed_by: claude-code/claude-opus-5-5
depends_on: []
aliases: [quick replies standard answers canned responses справочник ответов шаблоны]
scope: [quick-replies, templates]
links: [electron/database.ts, electron/linkVerificationResponseTemplates.ts]
sessions: [01a10223-e2be-770a-9bc6-2646a7428876]
commits: [5cd87b4]
revision: 9
created: 2026-10-08
updated: 2026-10-08
---
## Goal

Владелец (2026-10-08): сделать справочник быстрых стандартных ответов игрокам и разработать его структуру. Сначала discovery/design (pdk-discover → pdk-design), реализация — после согласования структуры.

Связанное (не дублировать, переиспользовать): T-0002 — шаблоны ответа на привязку RU/EN/ES (`link_verification_response_templates`); T-0020 — справочная информация по румам с копированием; T-0019 — фразы комментариев RU/EN/ES (`app_settings.room_wallet_comment_phrases`).

### Решения владельца (2026-10-08)

- Отдельный раздел в меню; языки RU / EN / ES.
- Список пока у каждого оператора свой (локальная БД); позже будет общий, структура у всех одинаковая.
- Подстановок нет (может позже).
- Темы: Приветствие, Платежи, Статистика, Приложения, Другое, Контакты, Returns, Soft. Добавлена «Привязки» — в исходном файле блок назван «привязки / bindings».
- Шаблоны ответа на привязку (T-0002) — где разместить, владелец решит после альфы.
- Исходные сообщения: `dev/quick-messages.txt` — перевести на 3 языка, разложить по темам, альфа с редактированием.

### Структура (альфа)

- Темы — фиксированный список в коде `src/utils/quickReplies.ts` (одно место; неизвестная тема показывается в «Другое»).
- Таблица `quick_replies`: id, topic, title (видно только оператору, для поиска), text_ru, text_en, text_es, sort_order, updated_at. Пустой язык допустим (копирование для него недоступно); нужен хотя бы один.
- Начальный набор `electron/quickRepliesSeed.ts` (19 ответов) — миграция шаг 4 `quick-replies-2026-10`, один раз; ответ с той же темой и названием не добавляется повторно.
- Экран `QuickRepliesView`: поиск по названию и всем языкам, переключатель языка (запоминается), фильтр по темам со счётчиками, «Копировать», «Изменить» (тема, название, три текста, удалить), «Новый ответ»; Esc закрывает редактор (с вопросом при несохранённых правках).

## Acceptance

- Раздел «Быстрые ответы» в меню; ответы по темам; копирование на выбранном языке; поиск.
- Редактирование: новый, изменить, удалить; правки и удаления не возвращаются при обновлении.
- Сообщения из `dev/quick-messages.txt` переведены на RU/EN/ES и разложены по темам.
- lint, тесты, build — ok; `pdk check` 0 errors; ручная проверка владельца (альфа).
- Позже (не в альфе): общий список для всех, подстановки, порядок перетаскиванием, место шаблонов привязки.

## Checkpoint

Works (альфа): src/utils/quickReplies.ts (темы, фильтр, группировка, проверка), electron/quickRepliesSeed.ts (19 ответов RU/EN/ES из dev/quick-messages.txt), таблица quick_replies + get/save/delete + миграция шаг 4, IPC, QuickRepliesView, пункт меню «Быстрые ответы».
Data: dev применил шаг 4 к рабочей БД (user_version 4, 19 ответов), snapshot transactioner-before-migration-2026-10-08-160208.db.
Verified: tsc ok; lint 0; тесты 249/249 (Node-сборка sqlite); build ok.
Owner flags: RU ответа о привязке исправлен на «Лучше не использовать аккаунт…» (в исходнике пропущено «не», EN/ES — «не депонируйте»); ES-ссылки контактов поддержки собраны из ES-контактов (telegram.me/Worldpokerdeals_soporte, wa.me/573054474330), Discord для ES не указан; «на ты»-вариант Returns использует те же EN/ES.
Done: альфа принята владельцем 2026-10-08 (коммит и push по его просьбе). dev/quick-messages.txt в git не переносится (решение владельца).
Owner 2026-10-08: убрать названия сообщений. Сделано: карточка без названия, в редакторе нет поля, поиск только по текстам, проверка без названия; колонка title осталась внутренним ключом начального набора (пустая у ответов оператора), правка не меняет её. tsc, lint 0, тесты 249/249, build ok.
Owner 2026-10-08: кнопки как в «Инфо по румам»; поиск по всем языкам. Сделано: src/components/ui/IconButtons.tsx (IconCopyButton из RoomInfoView, IconEditButton), RoomInfoView переведён на него; карточки и панели тем в стиле кошельков рума; quickReplyMatchLanguage — найденный ответ показывается на языке совпадения (подсветка метки, «найдено на RU»), копирование переключает язык экрана. Общие элементы — отдельная задача T-0025. tsc, lint 0, тесты 250/250, build ok.
Owner 2026-10-08: убрать индикаторы языка RU/EN/ES на карточках — убраны; осталась только строка «найдено на XX» при поиске, когда ответ показан не на выбранном языке. lint 0, тесты 250/250, build ok.
Owner 2026-10-08: Returns — EN одна версия, ES одна (на tú). «на вы» = RU вы + EN; «на ты» = RU ты + ES tú. Без поиска показываются только ответы с текстом на выбранном языке (счётчики тем — по видимым); поиск по-прежнему находит на любом языке. Рабочая БД: id 16 text_es '', id 17 text_en '' (snapshot transactioner-before-quick-replies-returns-2026-10-08-162959.db). lint 0, тесты 251/251, build ok.

## Next step

Нет — альфа закрыта. Дальше: общий список, подстановки, порядок, место шаблонов привязки — отдельными задачами по запросу; оформление — T-0025.

## Blockers

## Log

- 2026-10-08 created
- 2026-10-08 update: executed_by "" -> claude-code/claude-opus-5-5, status proposed -> active
- 2026-10-08 checkpoint: Works (альфа): src/utils/quickReplies.ts (темы, фильтр, группировка, проверка), electron/quickRepliesSeed.ts (19 отве...
- 2026-10-08 update: sessions +01a10223-e2be-770a-9bc6-2646a7428876
- 2026-10-08 checkpoint: Works (альфа): src/utils/quickReplies.ts (темы, фильтр, группировка, проверка), electron/quickRepliesSeed.ts (19 отве...
- 2026-10-08 checkpoint: Works (альфа): src/utils/quickReplies.ts (темы, фильтр, группировка, проверка), electron/quickRepliesSeed.ts (19 отве...
- 2026-10-08 checkpoint: Works (альфа): src/utils/quickReplies.ts (темы, фильтр, группировка, проверка), electron/quickRepliesSeed.ts (19 отве...
- 2026-10-08 checkpoint: Works (альфа): src/utils/quickReplies.ts (темы, фильтр, группировка, проверка), electron/quickRepliesSeed.ts (19 отве...
- 2026-10-08 checkpoint: Works (альфа): src/utils/quickReplies.ts (темы, фильтр, группировка, проверка), electron/quickRepliesSeed.ts (19 отве...
- 2026-10-08 update: status active -> done
