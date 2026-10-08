import { describe, expect, it } from 'vitest'
import { QUICK_REPLIES_2026_10 } from '../../electron/quickRepliesSeed'
import {
  filterQuickReplies,
  quickReplyMatchLanguage,
  groupQuickRepliesByTopic,
  quickReplyText,
  quickReplyTopics,
  quickReplyValidationError,
  type QuickReply,
} from './quickReplies'

const reply = (id: number, topic: string, title: string, ru = '', en = '', es = '', sort_order = id): QuickReply =>
  ({ id, topic, title, text_ru: ru, text_en: en, text_es: es, sort_order })

describe('quick replies', () => {
  const replies = [
    reply(1, 'payments', 'Депозит зачислен', 'Готово, депозит зачислен.', 'The deposit has been made.', 'Listo, el depósito fue acreditado.'),
    reply(2, 'greeting', 'Чем могу помочь?', 'Привет! Чем могу помочь?', 'Hi! How can I help you?'),
    reply(3, 'removed-topic', 'Старый ответ', 'Ещё в ходу'),
    reply(4, 'payments', 'Вывод обработан', 'Готово, вывод обработан.', '', '', 0),
  ]

  it('returns the text of the chosen language', () => {
    expect(['RU', 'EN', 'ES'].map((language) => quickReplyText(replies[1], language as 'RU'))).toEqual(['Привет! Чем могу помочь?', 'Hi! How can I help you?', ''])
  })

  it('groups by the fixed topic order, unknown topics under "Другое", sorted inside a topic', () => {
    expect(groupQuickRepliesByTopic(replies).map((group) => [group.key, group.replies.map((item) => item.id)])).toEqual([
      ['greeting', [2]],
      ['payments', [4, 1]],
      ['other', [3]],
    ])
  })

  it('filters by topic and by every search word in the text of any language', () => {
    expect(filterQuickReplies(replies, 'payments', '', 'RU').map((item) => item.id)).toEqual([1, 4])
    expect(filterQuickReplies(replies, 'other', '', 'RU').map((item) => item.id)).toEqual([3])
    expect(filterQuickReplies(replies, 'all', 'deposit made', 'ES').map((item) => item.id)).toEqual([1])
    expect(filterQuickReplies(replies, 'all', 'ДЕПОЗИТ', 'EN').map((item) => item.id)).toEqual([1])
    expect(filterQuickReplies(replies, 'all', 'вывод', 'ES').map((item) => item.id)).toEqual([4])
    expect(filterQuickReplies(replies, 'greeting', 'депозит', 'RU')).toEqual([])
    expect(filterQuickReplies(replies, 'all', 'Старый', 'RU')).toEqual([])
    expect(filterQuickReplies(replies, 'all', 'зачислен made', 'RU')).toEqual([])
  })

  it('without a search shows only replies that have text in the chosen language', () => {
    expect(filterQuickReplies(replies, 'all', '', 'EN').map((item) => item.id)).toEqual([1, 2])
    expect(filterQuickReplies(replies, 'all', '', 'ES').map((item) => item.id)).toEqual([1])
  })

  it('shows a found reply in the chosen language when it matches there, otherwise where it was found', () => {
    expect(quickReplyMatchLanguage(replies[0], '', 'ES')).toBe('ES')
    expect(quickReplyMatchLanguage(replies[0], 'депозит', 'ES')).toBe('RU')
    expect(quickReplyMatchLanguage(replies[0], 'deposit', 'ES')).toBe('EN')
    expect(quickReplyMatchLanguage(replies[0], 'dep', 'ES')).toBe('ES')
    expect(quickReplyMatchLanguage(replies[1], 'xyz', 'RU')).toBeNull()
    expect(quickReplyMatchLanguage(replies[1], '', 'ES')).toBeNull()
  })

  it('requires a known topic and text in at least one language', () => {
    const base = { topic: 'payments', text_ru: '', text_en: 'x', text_es: '' }
    expect(quickReplyValidationError(base)).toBeNull()
    expect(quickReplyValidationError({ ...base, topic: 'nope' })).toBe('Выберите тему')
    expect(quickReplyValidationError({ ...base, text_en: ' ' })).toBe('Введите текст хотя бы на одном языке')
  })

  it('ships a first set that fits the structure: known topics, unique titles, RU and EN everywhere', () => {
    const topicKeys = quickReplyTopics.map((topic) => topic.key) as string[]
    expect(QUICK_REPLIES_2026_10.every((item) => topicKeys.includes(item.topic))).toBe(true)
    expect(new Set(QUICK_REPLIES_2026_10.map((item) => item.title)).size).toBe(QUICK_REPLIES_2026_10.length)
    expect(QUICK_REPLIES_2026_10.every((item) => item.ru.trim())).toBe(true)
    expect(QUICK_REPLIES_2026_10.filter((item) => !item.en.trim()).map((item) => item.title)).toEqual(['Планируешь регистрироваться? (на «ты»)'])
    expect(QUICK_REPLIES_2026_10.filter((item) => !item.es.trim()).map((item) => item.title)).toEqual(['В группе: позвать Давида', 'Ознакомились с условиями? (на «вы»)'])
  })
})
