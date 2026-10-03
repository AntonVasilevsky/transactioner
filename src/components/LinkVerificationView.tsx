import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Copy, Link2 } from 'lucide-react'
import {
  LINK_VERIFICATION_ROOM_SUGGESTIONS,
  LINK_VERIFICATION_TEMPLATES,
  linkVerificationRoomRules,
  resolveLinkVerificationDealDefaultScope,
  resolveLinkVerificationRoomRule
} from '../utils/linkVerificationRules'
import {
  applyLinkVerificationTemplateOverrides,
  buildLinkVerificationFieldValues,
  buildLinkVerificationRequestText,
  buildLinkVerificationTemplateValues,
  buildSheet1Tsv,
  composeTypedIdentityData,
  composePlayerDataByRule,
  LINK_VERIFICATION_USERNAME_FIELD_LABEL,
  googleSheetsTsvCell,
  normalizeMessengerLabel,
  resolveIdentityFieldsForRoomChange,
  resolveSheet2DirectusMessenger,
  sortLinkVerificationRoomOptions
} from '../utils/linkVerificationFormatting'
import { matchesRoomSearch } from '../utils/roomSearch'
import { getWalletAddressValidationError } from '../utils/walletValidation'
import { sortRoomProfilesByUsage } from '../utils/roomUsageSort'
import ComboboxField from './fields/ComboboxField'
import SelectField from './fields/SelectField'
import type { FieldOption } from './fields/DropdownPanel'
import { matchesRoomOption, roomProfileOptions, toFieldOptions } from './fields/fieldOptions'

const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}.${month}.${year}`
}

const today = () => formatDate(new Date())
const messengerOptions = ['Telegram', 'WA', 'Discord', 'Teams', 'Email', 'Site', 'Jivo']
const statusOptions = ['Check', 'Ok', 'Denied', 'Retag']
const linkVerificationLanguageOptions = ['RU', 'ENG', 'ES'] as const
type LinkVerificationLanguage = typeof linkVerificationLanguageOptions[number]
type LinkVerificationMode = 'check' | 'response'
const responseLanguageOptions: RoomLanguage[] = ['RU', 'EN', 'ES']
const initialRoomName = 'Nexa'
const initialRule = resolveLinkVerificationRoomRule(initialRoomName)

const findDealDefaultForScope = (
  defaults: LinkVerificationDealDefaultsInfo[],
  scopeKey: string
) => defaults.find((item) => item.scope_key.toLowerCase() === scopeKey.toLowerCase())

const responseDealTypeLabels: Record<RoomDealType, string> = {
  General: 'Общая',
  Direct: 'Прямая',
  Agent: 'Агентская',
}

const responseDealTypesForRoom = (
  dealOptions: RoomKnowledgeIndex['dealOptions'],
  roomKey: string
): RoomDealType[] => {
  const types = Array.from(new Set(
    dealOptions
      .filter((deal) => deal.room_key === roomKey)
      .map((deal) => deal.deal_type)
  ))
  if (!types.length) return ['General']
  return types.includes('Agent') && types.includes('Direct')
    ? types.filter((type) => type === 'Agent' || type === 'Direct')
    : types
}

const preferredResponseDealType = (
  dealOptions: RoomKnowledgeIndex['dealOptions'],
  roomKey: string
): RoomDealType => {
  const types = responseDealTypesForRoom(dealOptions, roomKey)
  return types.includes('Agent') ? 'Agent' : types[0] || 'General'
}

const initialManager = () => {
  if (typeof window === 'undefined') return 'Антон'
  return localStorage.getItem('transactioner.linkVerification.manager')?.trim() || 'Антон'
}

export default function LinkVerificationView() {
  const [mode, setMode] = useState<LinkVerificationMode>('check')
  const [roomName, setRoomName] = useState(initialRoomName)
  const [templateKey, setTemplateKey] = useState(initialRule.defaultTemplateKey)
  const [date, setDate] = useState(today())
  const [manager, setManager] = useState(initialManager)
  const [selectedMessenger, setSelectedMessenger] = useState('')
  const [messengerUsername, setMessengerUsername] = useState('')
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const [email, setEmail] = useState('')
  const [isSheet2NickManual, setIsSheet2NickManual] = useState(false)
  const [sheet2NickManual, setSheet2NickManual] = useState('')
  const [isSheet2RoomUsernameManual, setIsSheet2RoomUsernameManual] = useState(false)
  const [sheet2RoomUsernameManual, setSheet2RoomUsernameManual] = useState('')
  const [status, setStatus] = useState('Check')
  const [deliveredToPlayer, setDeliveredToPlayer] = useState('')
  const [updateChat, setUpdateChat] = useState(false)
  const [sheet2Kind, setSheet2Kind] = useState<'Новый' | 'Старый'>('Новый')
  const [source, setSource] = useState('')
  const [language, setLanguage] = useState<LinkVerificationLanguage>('RU')
  const [country, setCountry] = useState('')
  const [nameNick, setNameNick] = useState('')
  const [accountOnWpd, setAccountOnWpd] = useState('')
  const [directusUsername, setDirectusUsername] = useState('')
  const [registrationDate, setRegistrationDate] = useState(today())
  const [dealText, setDealText] = useState(initialRule.deal.dealText || '')
  const [dealSchema, setDealSchema] = useState(initialRule.deal.directusDealSchema || '')
  const [wallet, setWallet] = useState('')
  const [paymentSystem, setPaymentSystem] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('')
  const [paymentAddress, setPaymentAddress] = useState('')
  const [roomRegistrationStats, setRoomRegistrationStats] = useState<RoomRegistrationStat[]>([])
  const [roomProfiles, setRoomProfiles] = useState<RoomProfileInfo[]>([])
  const [roomDealOptions, setRoomDealOptions] = useState<RoomKnowledgeIndex['dealOptions']>([])
  const [dealDefaults, setDealDefaults] = useState<LinkVerificationDealDefaultsInfo[]>([])
  const [dealDefaultsSaveState, setDealDefaultsSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedTemplates, setSavedTemplates] = useState<LinkVerificationTemplateInfo[]>([])
  const [responseRoomKey, setResponseRoomKey] = useState('')
  const [responseDealType, setResponseDealType] = useState<RoomDealType>('General')
  const [responseLanguage, setResponseLanguage] = useState<RoomLanguage>('EN')
  const [responseTemplates, setResponseTemplates] = useState<LinkVerificationResponseTemplateInfo[]>([])
  const [isResponseTemplatesLoading, setIsResponseTemplatesLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')
  const walletInputRef = useRef<HTMLInputElement | null>(null)
  const sourceWasSelectedManually = useRef(false)
  const dealFieldsWereEditedManually = useRef(false)
  const dealDefaultsRef = useRef<LinkVerificationDealDefaultsInfo[]>([])

  useEffect(() => {
    localStorage.setItem('transactioner.linkVerification.manager', manager.trim())
  }, [manager])

  useEffect(() => {
    dealDefaultsRef.current = dealDefaults
  }, [dealDefaults])

  useEffect(() => {
    let active = true
    Promise.all([
      window.electronAPI.getRoomRegistrationStats(),
      window.electronAPI.getRoomKnowledgeIndex(),
      window.electronAPI.getLinkVerificationDealDefaults()
    ])
      .then(([stats, index, defaults]) => {
        if (!active) return
        const profiles = index?.profiles || []
        const dealOptions = index?.dealOptions || []
        const responseProfiles = sortRoomProfilesByUsage(profiles, stats || [])
        const preferredResponseProfile = responseProfiles.find((profile) => matchesRoomSearch([
          profile.display_name,
          profile.room_key,
          profile.network_name,
        ], initialRoomName)) || responseProfiles[0]
        setRoomRegistrationStats(stats || [])
        setRoomProfiles(profiles)
        setRoomDealOptions(dealOptions)
        setDealDefaults(defaults || [])
        setResponseRoomKey((current) => current || preferredResponseProfile?.room_key || '')
        setResponseDealType((current) => current === 'General'
          ? preferredResponseDealType(dealOptions, preferredResponseProfile?.room_key || '')
          : current
        )
      })
      .catch(() => {
        if (!active) return
        setRoomRegistrationStats([])
        setRoomProfiles([])
        setRoomDealOptions([])
        setDealDefaults([])
      })
    return () => {
      active = false
    }
  }, [])

  const rule = useMemo(() => resolveLinkVerificationRoomRule(roomName), [roomName])
  const templateOptions = useMemo(
    () => applyLinkVerificationTemplateOverrides(rule.templates, savedTemplates, rule.canonicalRoomName),
    [rule.canonicalRoomName, rule.templates, savedTemplates]
  )
  const selectedTemplate = templateOptions.find((template) => template.key === templateKey) || templateOptions[0] || LINK_VERIFICATION_TEMPLATES.default
  const dealDefaultScope = useMemo(
    () => resolveLinkVerificationDealDefaultScope(rule.canonicalRoomName),
    [rule.canonicalRoomName]
  )
  const savedDealDefault = useMemo(
    () => findDealDefaultForScope(dealDefaults, dealDefaultScope.key),
    [dealDefaultScope.key, dealDefaults]
  )

  useEffect(() => {
    let active = true
    window.electronAPI.getLinkVerificationTemplates(rule.canonicalRoomName)
      .then((templates) => {
        if (active) setSavedTemplates(templates || [])
      })
      .catch(() => {
        if (active) setSavedTemplates([])
      })
    return () => {
      active = false
    }
  }, [rule.canonicalRoomName])

  useEffect(() => {
    if (dealFieldsWereEditedManually.current) return
    setDealText(savedDealDefault?.deal_text ?? rule.deal.dealText ?? '')
    setDealSchema(savedDealDefault?.directus_deal_schema ?? rule.deal.directusDealSchema ?? '')
  }, [
    rule.canonicalRoomName,
    rule.deal.dealText,
    rule.deal.directusDealSchema,
    savedDealDefault,
  ])

  useEffect(() => {
    if (!dealFieldsWereEditedManually.current) return
    const scopeForSave = dealDefaultScope
    setDealDefaultsSaveState('saving')
    const timer = window.setTimeout(() => {
      window.electronAPI.saveLinkVerificationDealDefaults({
        scope_key: scopeForSave.key,
        scope_label: scopeForSave.label,
        deal_text: dealText,
        directus_deal_schema: dealSchema,
      })
        .then((result) => {
          if (!result.success) {
            setDealDefaultsSaveState('error')
            return
          }
          const savedDefault = {
            scope_key: scopeForSave.key,
            scope_label: scopeForSave.label,
            deal_text: dealText.trim(),
            directus_deal_schema: dealSchema.trim(),
            updated_at: new Date().toISOString().slice(0, 10),
          }
          setDealDefaults((current) => {
            const withoutCurrent = current.filter((item) => item.scope_key.toLowerCase() !== scopeForSave.key.toLowerCase())
            return [...withoutCurrent, savedDefault]
          })
          setDealDefaultsSaveState('saved')
        })
        .catch(() => setDealDefaultsSaveState('error'))
    }, 600)

    return () => window.clearTimeout(timer)
  }, [dealDefaultScope, dealSchema, dealText])

  const responseDealTypeOptions = useMemo(
    () => responseDealTypesForRoom(roomDealOptions, responseRoomKey),
    [responseRoomKey, roomDealOptions]
  )
  const activeResponseDealType = responseDealTypeOptions.includes(responseDealType)
    ? responseDealType
    : preferredResponseDealType(roomDealOptions, responseRoomKey)

  useEffect(() => {
    if (mode !== 'response' || !responseRoomKey) {
      return
    }

    let active = true
    Promise.resolve()
      .then(() => {
        if (active) setIsResponseTemplatesLoading(true)
        return window.electronAPI.getLinkVerificationResponseTemplates(responseRoomKey, responseLanguage, activeResponseDealType)
      })
      .then((templates) => {
        if (active) setResponseTemplates(templates || [])
      })
      .catch(() => {
        if (active) setResponseTemplates([])
      })
      .finally(() => {
        if (active) setIsResponseTemplatesLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeResponseDealType, mode, responseLanguage, responseRoomKey])

  const selectMessenger = (value: string) => {
    const normalizedValue = normalizeMessengerLabel(value)
    setSelectedMessenger(value)
    if (!sourceWasSelectedManually.current) {
      setSource(normalizedValue)
    }
  }

  const selectSource = (value: string) => {
    sourceWasSelectedManually.current = true
    setSource(value)
  }

  const fieldValues = useMemo(
    () => buildLinkVerificationFieldValues({ username, roomId, email }),
    [email, roomId, username]
  )

  const ruleBasedPlayerData = useMemo(
    () => composePlayerDataByRule(rule.requiredFields, fieldValues),
    [fieldValues, rule.requiredFields]
  )

  const effectivePlayerData = ruleBasedPlayerData
  const sheetPlayerData = useMemo(
    () => composeTypedIdentityData({ username, roomId, email }),
    [email, roomId, username]
  )

  const sheet2NickLoginId = isSheet2NickManual
    ? sheet2NickManual.trim()
    : sheetPlayerData

  const autoSheet2RoomUsername = useMemo(
    () => fieldValues[rule.sheet2RoomUsernameField]?.trim() || '',
    [fieldValues, rule.sheet2RoomUsernameField]
  )

  const sheet2RoomUsername = isSheet2RoomUsernameManual
    ? sheet2RoomUsernameManual.trim()
    : autoSheet2RoomUsername

  const requestText = useMemo(() => {
    const values = buildLinkVerificationTemplateValues({
      roomName,
      playerData: effectivePlayerData,
      messenger: selectedMessenger,
      messengerUsername,
      username,
      roomId,
      email
    })
    return buildLinkVerificationRequestText(selectedTemplate.body, values)
  }, [
    effectivePlayerData,
    email,
    selectedMessenger,
    messengerUsername,
    roomId,
    roomName,
    selectedTemplate.body,
    username
  ])

  const sheet1Tsv = useMemo(() => {
    return buildSheet1Tsv({
      date,
      manager,
      messenger: selectedMessenger,
      messengerUsername,
      roomName: rule.canonicalRoomName,
      loginNickId: sheetPlayerData,
      status,
      deliveredToPlayer,
      updateChat
    })
  }, [date, deliveredToPlayer, manager, messengerUsername, rule.canonicalRoomName, selectedMessenger, sheetPlayerData, status, updateChat])

  const sheet2Tsv = useMemo(() => {
    const row = [
      sheet2Kind,
      date.trim(),
      source.trim(),
      language,
      country.trim(),
      normalizeMessengerLabel(selectedMessenger),
      messengerUsername.trim(),
      resolveSheet2DirectusMessenger({
        source,
        messenger: selectedMessenger,
        login: messengerUsername,
        email
      }),
      nameNick.trim(),
      accountOnWpd.trim(),
      directusUsername.trim(),
      manager.trim(),
      registrationDate.trim(),
      rule.canonicalRoomName,
      rule.canonicalRoomName,
      sheet2NickLoginId.trim(),
      sheet2RoomUsername.trim(),
      dealText.trim(),
      dealSchema,
      wallet.trim(),
      paymentSystem.trim(),
      paymentCurrency.trim(),
      paymentAddress.trim(),
      paymentAddress.trim()
    ]
    return row.map(googleSheetsTsvCell).join('\t')
  }, [
    accountOnWpd,
    country,
    date,
    dealSchema,
    dealText,
    directusUsername,
    email,
    language,
    manager,
    selectedMessenger,
    messengerUsername,
    nameNick,
    paymentAddress,
    paymentCurrency,
    paymentSystem,
    registrationDate,
    rule.canonicalRoomName,
    sheet2Kind,
    sheet2NickLoginId,
    sheet2RoomUsername,
    source,
    wallet
  ])

  const walletError = useMemo(() => getWalletAddressValidationError(wallet), [wallet])

  const roomOptions = useMemo(() => {
    const names = new Set<string>()
    for (const item of roomProfiles) names.add(item.display_name)
    for (const item of linkVerificationRoomRules) names.add(item.canonicalRoomName)
    for (const item of LINK_VERIFICATION_ROOM_SUGGESTIONS) names.add(item)
    for (const item of roomRegistrationStats) names.add(item.roomName)
    return sortLinkVerificationRoomOptions(Array.from(names), roomRegistrationStats)
  }, [roomProfiles, roomRegistrationStats])

  const roomFieldOptions = useMemo(() => toFieldOptions(roomOptions), [roomOptions])

  const responseRoomOptions = useMemo(
    () => roomProfileOptions(sortRoomProfilesByUsage(roomProfiles.filter((profile) => profile.is_active), roomRegistrationStats)),
    [roomProfiles, roomRegistrationStats]
  )

  const selectRoom = (name: string, preserveData = false) => {
    const nextRule = resolveLinkVerificationRoomRule(name)
    const nextIdentity = resolveIdentityFieldsForRoomChange({ username, roomId, email }, nextRule, preserveData)
    setRoomName(name)
    setUsername(nextIdentity.username)
    setRoomId(nextIdentity.roomId)
    setEmail(nextIdentity.email)
    if (!preserveData) {
      setSelectedMessenger('')
      setMessengerUsername('')
      if (!sourceWasSelectedManually.current) {
        setSource('')
      }
      setIsSheet2NickManual(false)
      setSheet2NickManual('')
      setIsSheet2RoomUsernameManual(false)
      setSheet2RoomUsernameManual('')
    }
    setTemplateKey(nextRule.defaultTemplateKey)
    const nextScope = resolveLinkVerificationDealDefaultScope(nextRule.canonicalRoomName)
    const savedDefault = findDealDefaultForScope(dealDefaultsRef.current, nextScope.key)
    dealFieldsWereEditedManually.current = false
    setDealDefaultsSaveState('idle')
    setDealText(savedDefault?.deal_text ?? nextRule.deal.dealText ?? '')
    setDealSchema(savedDefault?.directus_deal_schema ?? nextRule.deal.directusDealSchema ?? '')
  }

  const selectResponseRoom = (roomKey: string) => {
    setResponseRoomKey(roomKey)
    setResponseDealType(preferredResponseDealType(roomDealOptions, roomKey))
  }

  const copy = async (key: string, value: string, htmlValue?: string) => {
    if (key === 'sheet2' && walletError) {
      const input = walletInputRef.current
      input?.focus()
      input?.select()
      return
    }

    if (htmlValue && 'ClipboardItem' in window && navigator.clipboard.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([value], { type: 'text/plain' }),
            'text/html': new Blob([htmlValue], { type: 'text/html' })
          })
        ])
      } catch {
        await navigator.clipboard.writeText(value)
      }
    } else {
      await navigator.clipboard.writeText(value)
    }
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(''), 1500)
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Привязки
        </h2>
        <div className="mt-4 inline-flex rounded-xl bg-slate-950 p-1">
          <ModeButton active={mode === 'check'} onClick={() => setMode('check')}>Проверка</ModeButton>
          <ModeButton active={mode === 'response'} onClick={() => setMode('response')}>Ответ</ModeButton>
        </div>
      </div>

      {mode === 'check' ? (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="text-sm text-slate-400">
              <label className="mb-1 block">Рум</label>
              <ComboboxField
                value={roomName}
                options={roomFieldOptions}
                onSelect={(name, event) => selectRoom(name, event.shiftKey)}
                matches={matchesRoomOption}
                placeholder="Найти рум"
                emptyText="Румы не найдены"
              />
            </div>

            <div className="text-sm text-slate-400">
              Шаблон
              <SelectField
                value={selectedTemplate.key}
                options={templateOptions.map((template) => ({ value: template.key, label: template.label }))}
                onChange={setTemplateKey}
                className="mt-1"
                buttonClassName="rounded-lg p-3 focus:border-blue-500"
                ariaLabel="Шаблон"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-sm text-slate-400">
              {LINK_VERIFICATION_USERNAME_FIELD_LABEL}
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm text-slate-400">
              Room ID
              <input value={roomId} onChange={(event) => setRoomId(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm text-slate-400">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="text-sm text-slate-400">
              <label className="mb-1 block">Мессенджер</label>
              <ComboboxField
                value={selectedMessenger}
                options={toFieldOptions(messengerOptions)}
                onSelect={selectMessenger}
                placeholder="Выбрать мессенджер"
                emptyText="Мессенджеры не найдены"
              />
            </div>
            <label className="text-sm text-slate-400">
              Контакт
              <input value={messengerUsername} onChange={(event) => setMessengerUsername(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
            </label>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-300"><Link2 size={14} /> Правило рума: {rule.canonicalRoomName}</div>
            <div className="mt-2">Данные для запроса: {LINK_VERIFICATION_USERNAME_FIELD_LABEL}, Room ID, Email</div>
            <div className="mt-1">Автосохранение игрока: нет</div>
            {selectedTemplate.channel === 'email' && selectedTemplate.recipientEmail && (
              <div className="mt-1">Куда отправлять: {selectedTemplate.recipientEmail}{selectedTemplate.ccEmails?.length ? ` | CC: ${selectedTemplate.ccEmails.join(', ')}` : ''}</div>
            )}
          </div>

        </div>

        <div className="space-y-6">
          <OutputCard
            title="Шаблон запроса"
            value={requestText}
            copied={copiedKey === 'request'}
            onCopy={() => copy('request', requestText)}
          />

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-200">Таблица 1</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-slate-400">
                Дата
                <input value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm text-slate-400">
                Менеджер
                <input value={manager} onChange={(event) => setManager(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <div className="text-sm text-slate-400">
                Статус
                <SelectField
                  value={status}
                  options={toFieldOptions(statusOptions)}
                  onChange={setStatus}
                  className="mt-1"
                  buttonClassName="rounded-lg p-3 focus:border-blue-500"
                  ariaLabel="Статус"
                />
              </div>
              <label className="text-sm text-slate-400">
                Передано игроку
                <input value={deliveredToPlayer} onChange={(event) => setDeliveredToPlayer(event.target.value)} placeholder="Да / Нет" className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 mt-7">
                <input type="checkbox" checked={updateChat} onChange={(event) => setUpdateChat(event.target.checked)} />
                Передали в update chat
              </label>
            </div>
            <OutputCard
              title="TSV — Таблица 1"
              value={sheet1Tsv}
              copied={copiedKey === 'sheet1'}
              onCopy={() => copy('sheet1', sheet1Tsv)}
              compact
            />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-200">Таблица 2</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="text-sm text-slate-400">
                Тип строки
                <SelectField
                  value={sheet2Kind}
                  options={toFieldOptions(['Новый', 'Старый'])}
                  onChange={(value) => setSheet2Kind(value as 'Новый' | 'Старый')}
                  className="mt-1"
                  buttonClassName="rounded-lg p-3 focus:border-blue-500"
                  ariaLabel="Тип строки"
                />
              </div>
              <div className="text-sm text-slate-400">
                <span className="mb-1 block">Источник</span>
                <ComboboxField
                  value={source}
                  options={toFieldOptions(messengerOptions)}
                  onSelect={selectSource}
                  allowCustomValue
                  placeholder="Выбрать источник"
                  emptyText="Источники не найдены"
                  inputClassName="rounded-lg py-3 focus:border-blue-500"
                />
              </div>
              <div className="text-sm text-slate-400">
                Язык
                <SelectField
                  value={language}
                  options={toFieldOptions(linkVerificationLanguageOptions)}
                  onChange={(value) => setLanguage(value as LinkVerificationLanguage)}
                  className="mt-1"
                  buttonClassName="rounded-lg p-3 focus:border-blue-500"
                  ariaLabel="Язык"
                />
              </div>
              <label className="text-sm text-slate-400">
                Страна
                <input value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm text-slate-400">
                Имя\ник
                <input value={nameNick} onChange={(event) => setNameNick(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm text-slate-400">
                Акк на WPD
                <input value={accountOnWpd} onChange={(event) => setAccountOnWpd(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm text-slate-400">
                directusUsername
                <input value={directusUsername} onChange={(event) => setDirectusUsername(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm text-slate-400">
                Даты реги.
                <input value={registrationDate} onChange={(event) => setRegistrationDate(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm text-slate-400">
                Ник\Логин\ID
                <input
                  value={isSheet2NickManual ? sheet2NickManual : sheet2NickLoginId}
                  onChange={(event) => {
                    setIsSheet2NickManual(true)
                    setSheet2NickManual(event.target.value)
                  }}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500"
                />
              </label>
              <label className="text-sm text-slate-400">
                roomUsername
                <input
                  value={isSheet2RoomUsernameManual ? sheet2RoomUsernameManual : sheet2RoomUsername}
                  onChange={(event) => {
                    setIsSheet2RoomUsernameManual(true)
                    setSheet2RoomUsernameManual(event.target.value)
                  }}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500"
                />
              </label>
              <label className="text-sm text-slate-400">
                Сделки
                <input
                  value={dealText}
                  onChange={(event) => {
                    dealFieldsWereEditedManually.current = true
                    setDealText(event.target.value)
                  }}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500"
                />
              </label>
              <label className="text-sm text-slate-400 md:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>directusDealSchema</span>
                  <span className={`text-xs ${
                    dealDefaultsSaveState === 'error'
                      ? 'text-red-300'
                      : dealDefaultsSaveState === 'saved'
                        ? 'text-emerald-300'
                        : dealDefaultsSaveState === 'saving'
                          ? 'text-blue-300'
                          : 'text-slate-500'
                  }`}>
                    {dealDefaultsSaveState === 'saving'
                      ? 'сохраняю дефолт…'
                      : dealDefaultsSaveState === 'saved'
                        ? 'дефолт сохранён'
                        : dealDefaultsSaveState === 'error'
                          ? 'не удалось сохранить дефолт'
                          : 'ручная правка станет дефолтом'}
                  </span>
                </div>
                <textarea
                  value={dealSchema}
                  onChange={(event) => {
                    dealFieldsWereEditedManually.current = true
                    setDealSchema(event.target.value)
                  }}
                  className="mt-1 w-full min-h-[72px] bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500"
                />
              </label>
              <label className="text-sm text-slate-400">
                Кошелек
                <input
                  ref={walletInputRef}
                  value={wallet}
                  onChange={(event) => setWallet(event.target.value)}
                  aria-invalid={Boolean(walletError)}
                  className={`mt-1 w-full bg-slate-900 border rounded-lg p-3 text-slate-100 outline-none ${
                    walletError
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                {walletError && (
                  <span className="mt-1 block text-xs text-red-300">{walletError}</span>
                )}
              </label>
              <label className="text-sm text-slate-400">
                directusPaymentSystem
                <input value={paymentSystem} onChange={(event) => setPaymentSystem(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm text-slate-400">
                directusPaymentCurrency
                <input value={paymentCurrency} onChange={(event) => setPaymentCurrency(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
              <label className="text-sm text-slate-400 md:col-span-3">
                Адрес
                <input value={paymentAddress} onChange={(event) => setPaymentAddress(event.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500" />
              </label>
            </div>
            <OutputCard
              title="TSV — Таблица 2"
              value={sheet2Tsv}
              copied={copiedKey === 'sheet2'}
              onCopy={() => copy('sheet2', sheet2Tsv)}
              compact
            />
          </div>
        </div>
      </div>
      ) : (
        <ResponseTemplatesPanel
          roomOptions={responseRoomOptions}
          selectedRoomKey={responseRoomKey}
          dealType={activeResponseDealType}
          dealTypeOptions={responseDealTypeOptions}
          language={responseLanguage}
          templates={responseTemplates}
          loading={isResponseTemplatesLoading}
          copiedKey={copiedKey}
          onSelectRoom={selectResponseRoom}
          onDealTypeChange={setResponseDealType}
          onLanguageChange={setResponseLanguage}
          onCopy={(key, text) => copy(key, text)}
        />
      )}
    </div>
  )
}

function ModeButton({ active, children, onClick }: { active: boolean, children: ReactNode, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function ResponseTemplatesPanel({
  roomOptions,
  selectedRoomKey,
  dealType,
  dealTypeOptions,
  language,
  templates,
  loading,
  copiedKey,
  onSelectRoom,
  onDealTypeChange,
  onLanguageChange,
  onCopy,
}: {
  roomOptions: FieldOption[]
  selectedRoomKey: string
  dealType: RoomDealType
  dealTypeOptions: RoomDealType[]
  language: RoomLanguage
  templates: LinkVerificationResponseTemplateInfo[]
  loading: boolean
  copiedKey: string
  onSelectRoom: (roomKey: string) => void
  onDealTypeChange: (value: RoomDealType) => void
  onLanguageChange: (value: RoomLanguage) => void
  onCopy: (key: string, text: string) => void
}) {
  const selectedRoomName = roomOptions.find((option) => option.value === selectedRoomKey)?.label || selectedRoomKey

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-80 text-sm text-slate-400">
            <label className="mb-1 block">Рум</label>
            <ComboboxField
              value={selectedRoomKey}
              options={roomOptions}
              onSelect={(roomKey) => onSelectRoom(roomKey)}
              matches={matchesRoomOption}
              placeholder="Найти рум: часть слова, транслит, русская раскладка"
              emptyText="Румы не найдены"
            />
          </div>

          {dealTypeOptions.length > 1 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Тип сделки</label>
              <SelectField
                value={dealType}
                options={dealTypeOptions.map((option) => ({ value: option, label: responseDealTypeLabels[option] }))}
                onChange={(value) => onDealTypeChange(value as RoomDealType)}
                ariaLabel="Тип сделки"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Язык</label>
            <div className="flex rounded-xl bg-slate-950 p-1">
              {responseLanguageOptions.map((option) => (
                <ModeButton key={option} active={language === option} onClick={() => onLanguageChange(option)}>{option}</ModeButton>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/40 p-3 text-xs leading-5 text-slate-400">
          Здесь хранится готовый текст подтверждения привязки. Обычно это один шаблон на рум и язык; если у рума есть прямая и агентская сделки, текст разделяется по типу сделки.
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
          <EmptyState text="Загрузка шаблонов ответа..." />
        </section>
      ) : templates.length ? (
        <div className="space-y-5">
          {templates.map((template) => (
            <OutputCard
              key={template.id}
              title={`${selectedRoomName}: подтверждение привязки`}
              value={template.body}
              copied={copiedKey === `response-${template.id}`}
              onCopy={() => onCopy(`response-${template.id}`, template.body)}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
          <EmptyState
            text={selectedRoomKey
              ? `Шаблон подтверждения для ${selectedRoomName}${dealTypeOptions.length > 1 ? ` / ${responseDealTypeLabels[dealType]}` : ''} на языке ${language} пока не заполнен.`
              : 'Сначала добавьте рум в справочник румов.'}
          />
        </section>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}

function OutputCard({
  title,
  value,
  copied,
  onCopy,
  compact = false
}: {
  title: string
  value: string
  copied: boolean
  onCopy: () => void
  compact?: boolean
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-200">{title}</h3>
        <button
          onClick={onCopy}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            copied ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
          }`}
        >
          {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <textarea
        readOnly
        value={value}
        className={`w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono outline-none ${
          compact ? 'min-h-[92px]' : 'min-h-[180px]'
        }`}
      />
    </div>
  )
}
