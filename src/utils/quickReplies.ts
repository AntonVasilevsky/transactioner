/**
 * Quick standard replies to players (T-0024). The topic list is fixed here so every operator
 * has the same structure even while each keeps an own list of replies in the local database.
 */
export const quickReplyTopics = [
  { key: 'greeting', label: 'Приветствие' },
  { key: 'bindings', label: 'Привязки' },
  { key: 'payments', label: 'Платежи' },
  { key: 'stats', label: 'Статистика' },
  { key: 'apps', label: 'Приложения' },
  { key: 'contacts', label: 'Контакты' },
  { key: 'returns', label: 'Returns' },
  { key: 'soft', label: 'Soft' },
  { key: 'other', label: 'Другое' },
] as const

export type QuickReplyTopic = typeof quickReplyTopics[number]['key']
export type QuickReplyLanguage = 'RU' | 'EN' | 'ES'

export const quickReplyLanguages: QuickReplyLanguage[] = ['RU', 'EN', 'ES']

/**
 * `title` is not shown (owner, 2026-10-08: no message names); it only keeps the internal key of
 * a shipped reply so a migration does not add it twice. Operator replies have an empty title.
 */
export interface QuickReply {
  id: number
  topic: string
  title: string
  text_ru: string
  text_en: string
  text_es: string
  sort_order: number
}

export interface QuickReplyInput {
  id?: number
  topic: string
  text_ru: string
  text_en: string
  text_es: string
}

const topicKeys = new Set<string>(quickReplyTopics.map((topic) => topic.key))

/** A reply whose topic is no longer in the list is shown under "Другое". */
export const quickReplyTopic = (topic: string): QuickReplyTopic =>
  (topicKeys.has(topic) ? topic : 'other') as QuickReplyTopic

export const quickReplyText = (reply: Pick<QuickReply, 'text_ru' | 'text_en' | 'text_es'>, language: QuickReplyLanguage) =>
  language === 'EN' ? reply.text_en : language === 'ES' ? reply.text_es : reply.text_ru

export const quickReplyValidationError = (input: QuickReplyInput) => {
  if (!topicKeys.has(input.topic)) return 'Выберите тему'
  if (!quickReplyLanguages.some((language) => quickReplyText(input, language).trim())) return 'Введите текст хотя бы на одном языке'
  return null
}

const searchKey = (value: string) => value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

/**
 * The search looks in every language at once (owner, 2026-10-08). A reply is found when one of its
 * texts holds every search word; it is shown in the chosen language if that text matches, otherwise
 * in the first language that does. Without a search a reply is shown only when it has text in the
 * chosen language (Returns has one English version for two Russian ones). Null = not shown.
 */
export const quickReplyMatchLanguage = (
  reply: Pick<QuickReply, 'text_ru' | 'text_en' | 'text_es'>,
  query: string,
  preferred: QuickReplyLanguage,
): QuickReplyLanguage | null => {
  const words = searchKey(query).split(' ').filter(Boolean)
  if (!words.length) return quickReplyText(reply, preferred).trim() ? preferred : null
  const order = [preferred, ...quickReplyLanguages.filter((language) => language !== preferred)]
  return order.find((language) => {
    const text = searchKey(quickReplyText(reply, language))
    return Boolean(text) && words.every((word) => text.includes(word))
  }) ?? null
}

/** Replies of the chosen topic ("all" = every topic) shown for the chosen language and search. */
export const filterQuickReplies = (replies: QuickReply[], topic: QuickReplyTopic | 'all', query: string, language: QuickReplyLanguage) =>
  replies.filter((reply) =>
    (topic === 'all' || quickReplyTopic(reply.topic) === topic) && quickReplyMatchLanguage(reply, query, language) !== null)

/** Replies grouped in the fixed topic order; empty topics are left out. */
export const groupQuickRepliesByTopic = (replies: QuickReply[]) =>
  quickReplyTopics
    .map((topic) => ({
      ...topic,
      replies: replies
        .filter((reply) => quickReplyTopic(reply.topic) === topic.key)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    }))
    .filter((group) => group.replies.length > 0)
