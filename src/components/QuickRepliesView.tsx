import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { IconCopyButton, IconEditButton } from './ui/IconButtons'
import { registerEscapeBack } from '../utils/escapeNavigation'
import {
  filterQuickReplies,
  groupQuickRepliesByTopic,
  quickReplyMatchLanguage,
  quickReplyLanguages,
  quickReplyText,
  quickReplyTopic,
  quickReplyTopics,
  quickReplyValidationError,
  type QuickReply,
  type QuickReplyInput,
  type QuickReplyLanguage,
  type QuickReplyTopic,
} from '../utils/quickReplies'

const languageStorageKey = 'transactioner.quickReplies.language'

const loadLanguage = (): QuickReplyLanguage => {
  try {
    const saved = localStorage.getItem(languageStorageKey)
    return quickReplyLanguages.includes(saved as QuickReplyLanguage) ? saved as QuickReplyLanguage : 'RU'
  } catch {
    return 'RU'
  }
}

const textField: Record<QuickReplyLanguage, 'text_ru' | 'text_en' | 'text_es'> = { RU: 'text_ru', EN: 'text_en', ES: 'text_es' }

const emptyDraft = (topic: QuickReplyTopic): QuickReplyInput => ({ topic, text_ru: '', text_en: '', text_es: '' })

const draftOf = (reply: QuickReply): QuickReplyInput => ({
  id: reply.id,
  topic: quickReplyTopic(reply.topic),
  text_ru: reply.text_ru,
  text_en: reply.text_en,
  text_es: reply.text_es,
})

const sameDraft = (a: QuickReplyInput, b: QuickReplyInput) =>
  a.topic === b.topic && a.text_ru === b.text_ru && a.text_en === b.text_en && a.text_es === b.text_es

export default function QuickRepliesView() {
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [language, setLanguage] = useState<QuickReplyLanguage>(loadLanguage)
  const [topic, setTopic] = useState<QuickReplyTopic | 'all'>('all')
  const [query, setQuery] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<QuickReplyInput | null>(null)
  const [draftOriginal, setDraftOriginal] = useState<QuickReplyInput | null>(null)
  const [draftError, setDraftError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadReplies = async () => {
    try {
      setReplies(await window.electronAPI.getQuickReplies())
      setLoadError('')
    } catch {
      setLoadError('Не удалось загрузить ответы')
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    let active = true
    window.electronAPI.getQuickReplies()
      .then((items) => {
        if (active) setReplies(items)
      })
      .catch(() => {
        if (active) setLoadError('Не удалось загрузить ответы')
      })
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  const chooseLanguage = (next: QuickReplyLanguage) => {
    setLanguage(next)
    try {
      localStorage.setItem(languageStorageKey, next)
    } catch {
      // The language choice is only a convenience.
    }
  }

  const visibleGroups = useMemo(
    () => groupQuickRepliesByTopic(filterQuickReplies(replies, topic, query, language)),
    [replies, topic, query, language],
  )
  const shownReplies = useMemo(() => filterQuickReplies(replies, 'all', query, language), [replies, query, language])
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>()
    shownReplies.forEach((reply) => {
      const key = quickReplyTopic(reply.topic)
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [shownReplies])

  /** Copies the version shown; a reply found in another language switches the screen to it. */
  const copyReply = async (reply: QuickReply, shownLanguage: QuickReplyLanguage) => {
    const text = quickReplyText(reply, shownLanguage)
    if (!text.trim()) return
    await navigator.clipboard.writeText(text)
    if (shownLanguage !== language) chooseLanguage(shownLanguage)
    setCopiedId(reply.id)
    window.setTimeout(() => setCopiedId((current) => (current === reply.id ? null : current)), 1500)
  }

  const openEditor = (next: QuickReplyInput) => {
    setDraft(next)
    setDraftOriginal(next)
    setDraftError('')
  }

  const closeEditor = () => {
    if (draft && draftOriginal && !sameDraft(draft, draftOriginal) && !window.confirm('Закрыть без сохранения? Изменения пропадут.')) return
    setDraft(null)
    setDraftOriginal(null)
    setDraftError('')
  }

  useEffect(() => {
    if (!draft) return
    return registerEscapeBack({ run: closeEditor })
  })

  const saveDraft = async () => {
    if (!draft) return
    const error = quickReplyValidationError(draft)
    if (error) {
      setDraftError(error)
      return
    }
    setSaving(true)
    const result = await window.electronAPI.saveQuickReply(draft)
    setSaving(false)
    if (!result.success) {
      setDraftError(result.error || 'Не удалось сохранить')
      return
    }
    setDraft(null)
    setDraftOriginal(null)
    await loadReplies()
  }

  const deleteDraft = async () => {
    if (!draft?.id) return
    const preview = (draft.text_ru || draft.text_en || draft.text_es).trim().split('\n')[0].slice(0, 80)
    if (!window.confirm(`Удалить ответ «${preview}»?`)) return
    const result = await window.electronAPI.deleteQuickReply(draft.id)
    if (!result.success) {
      setDraftError(result.error || 'Не удалось удалить')
      return
    }
    setDraft(null)
    setDraftOriginal(null)
    await loadReplies()
  }

  const editor = draft && (
    <section className="space-y-4 rounded-2xl border border-blue-500/40 bg-slate-800 p-5 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-100">{draft.id ? 'Редактирование ответа' : 'Новый ответ'}</h3>
      <div className="max-w-[260px]">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-400">Тема</span>
          <select
            value={draft.topic}
            onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-slate-100 outline-none focus:border-blue-500"
          >
            {quickReplyTopics.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {quickReplyLanguages.map((item) => (
          <label key={item} className="block">
            <span className="mb-1 block text-sm text-slate-400">Текст {item}</span>
            <textarea
              value={draft[textField[item]]}
              onChange={(event) => setDraft({ ...draft, [textField[item]]: event.target.value })}
              placeholder={item === 'RU' ? 'Текст на русском' : item === 'EN' ? 'Text in English' : 'Texto en español'}
              autoFocus={item === 'RU'}
              className="min-h-[160px] w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500"
            />
          </label>
        ))}
      </div>
      {draftError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{draftError}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void saveDraft()}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={closeEditor}
          className="rounded-xl border border-slate-600 px-5 py-2.5 font-semibold text-slate-200 transition-colors hover:bg-slate-700"
        >
          Отмена
        </button>
        {draft.id && (
          <button
            type="button"
            onClick={() => void deleteDraft()}
            className="ml-auto inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={16} /> Удалить
          </button>
        )}
      </div>
    </section>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Быстрые ответы</h2>
          <p className="mt-1 text-sm text-slate-500">Готовые сообщения игрокам на русском, английском и испанском. Поиск ищет сразу на всех языках.</p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(emptyDraft(topic === 'all' ? 'other' : topic))}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <Plus size={18} /> Новый ответ
        </button>
      </div>

      {draft && (!draft.id || !visibleGroups.some((group) => group.replies.some((reply) => reply.id === draft.id))) && editor}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по тексту"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center rounded-lg bg-slate-900 p-1">
          {quickReplyLanguages.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => chooseLanguage(item)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                language === item ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ key: 'all' as const, label: 'Все' }, ...quickReplyTopics].map((item) => {
          const count = item.key === 'all' ? shownReplies.length : topicCounts.get(item.key) || 0
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTopic(item.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                topic === item.key
                  ? 'border-blue-500 bg-blue-500/15 text-blue-200'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {item.label} <span className="text-xs text-slate-500">{count}</span>
            </button>
          )
        })}
      </div>

      {loadError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</p>}
      {loaded && !loadError && visibleGroups.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-500">
          {replies.length ? 'Ничего не найдено' : 'Ответов пока нет. Нажмите «Новый ответ».'}
        </p>
      )}

      {visibleGroups.map((group) => (
        <section key={group.key} className="space-y-2 rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
          <h3 className="mb-2 text-lg font-bold text-slate-100">{group.label}</h3>
          {group.replies.map((reply) => {
            if (draft?.id === reply.id) return <div key={reply.id}>{editor}</div>
            const shownLanguage = quickReplyMatchLanguage(reply, query, language) ?? language
            const text = quickReplyText(reply, shownLanguage)
            return (
              <article key={reply.id} className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {shownLanguage !== language && (
                      <div className="mb-1 text-xs text-blue-300">найдено на {shownLanguage}</div>
                    )}
                    {text.trim()
                      ? <p className="whitespace-pre-wrap break-words text-slate-200">{text}</p>
                      : <p className="text-sm italic text-slate-500">Нет текста на {shownLanguage}. Нажмите карандаш, чтобы добавить.</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <IconCopyButton
                      copied={copiedId === reply.id}
                      disabled={!text.trim()}
                      label={`Скопировать ${shownLanguage}`}
                      onClick={() => void copyReply(reply, shownLanguage)}
                    />
                    <IconEditButton onClick={() => openEditor(draftOf(reply))} />
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}
