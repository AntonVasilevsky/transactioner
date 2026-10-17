import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import SelectField from './fields/SelectField'
import DateField from './fields/DateField'
import TimeField from './fields/TimeField'
import { accountRoomKeys } from '../utils/roomAccountOptions'
import { transferSourceFor } from '../utils/explorerNetworks'
import { isDepositSearchAmount, resolveMessageTime } from '../utils/depositTransferSearch'

/**
 * "No hash" helper of the deposit form (T-0027): the operator picks our wallet from the player's
 * screenshot, types the transfer amount and, if the screenshot came late, the message time; the
 * chosen transfer goes into "TX ID / ссылка" and the usual transaction check runs.
 */
interface DepositTransferFinderProps {
  account: Account | null
  roomKnowledgeIndex: RoomKnowledgeIndex | null
  formAmount: string
  onPick: (explorerUrl: string) => void
}

const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500'

const shortAddress = (value: string) => (value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value)
const pad = (value: number) => String(value).padStart(2, '0')
const localTime = (ms: number) => {
  const date = new Date(ms)
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
const utcTime = (ms: number) => new Date(ms).toISOString().slice(11, 19)
const transfersWord = (count: number) => (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'перевода' : 'переводов')
const windowText = (window: { startMs: number, endMs: number }) => `с ${localTime(window.startMs).slice(0, 11)} до ${localTime(window.endMs).slice(0, 11)}`

export default function DepositTransferFinder({ account, roomKnowledgeIndex, formAmount, onPick }: DepositTransferFinderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [wallets, setWallets] = useState<RoomWalletInfo[] | null>(null)
  const [walletId, setWalletId] = useState('')
  const [amount, setAmount] = useState('')
  const [useMessageTime, setUseMessageTime] = useState(false)
  const [messageTime, setMessageTime] = useState('')
  const [messageDate, setMessageDate] = useState('')
  const [searching, setSearching] = useState(false)
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState<SearchDepositTransfersResult | null>(null)

  const roomKeys = useMemo(() => (account ? accountRoomKeys(account, roomKnowledgeIndex) : []), [account, roomKnowledgeIndex])
  const roomKeysKey = roomKeys.join('|')

  useEffect(() => {
    if (!isOpen) return
    let active = true
    Promise.all(roomKeysKey.split('|').filter(Boolean).map((key) => window.electronAPI.getRoomWallets(key)))
      .then((lists) => {
        if (!active) return
        const seen = new Set<string>()
        const searchable = lists.flat().filter((wallet) => {
          const key = `${wallet.currency}|${wallet.network}|${wallet.wallet_address}`.toLowerCase()
          if (!wallet.is_active || seen.has(key) || !transferSourceFor(`${wallet.currency} ${wallet.network}`)) return false
          seen.add(key)
          return true
        })
        setWallets(searchable)
        setWalletId((current) => (searchable.some((wallet) => String(wallet.id) === current) ? current : searchable.length === 1 ? String(searchable[0].id) : ''))
      })
      .catch(() => {
        if (active) setWallets([])
      })
    return () => {
      active = false
    }
  }, [isOpen, roomKeysKey])

  const wallet = wallets?.find((item) => String(item.id) === walletId) || null

  const open = () => {
    setIsOpen(true)
    setResult(null)
    setFormError('')
    if (!amount.trim()) setAmount(formAmount.replace(/[^\d.,]/g, ''))
  }

  const search = async () => {
    if (!wallet) return setFormError('Выберите кошелёк, на который игрок отправил деньги')
    if (!isDepositSearchAmount(amount)) return setFormError('Введите сумму перевода, например 25')
    let messageIso = ''
    if (useMessageTime && messageTime.trim()) {
      const resolved = resolveMessageTime(messageTime, messageDate, new Date())
      if (!resolved) return setFormError('Время сообщения — в виде 14:00')
      messageIso = resolved.toISOString()
    }
    setFormError('')
    setSearching(true)
    setResult(null)
    try {
      setResult(await window.electronAPI.searchDepositTransfers({
        currency: wallet.currency,
        network: wallet.network,
        wallet: wallet.wallet_address,
        amount,
        messageTime: messageIso || undefined,
      }))
    } catch (err: unknown) {
      setResult({ success: false, status: 'error', candidates: [], error: err instanceof Error ? err.message : String(err) })
    } finally {
      setSearching(false)
    }
  }

  if (!isOpen) {
    return (
      <button type="button" onClick={open} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-blue-200">
        <Search size={13} /> Нет хеша — найти перевод по сумме
      </button>
    )
  }

  const currency = wallet?.currency || ''
  const timeHint = useMessageTime && messageTime.trim() ? '' : ' Если скриншот прислали позже — укажите время сообщения.'

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-200">Найти перевод без хеша</h4>
        <button type="button" onClick={() => setIsOpen(false)} className="text-xs text-slate-400 hover:text-slate-200">Скрыть</button>
      </div>

      {wallets && wallets.length === 0 ? (
        <p className="text-sm text-amber-300">
          {account ? 'У рума нет активных кошельков в сетях, где работает поиск.' : 'Сначала выберите аккаунт рума.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Кошелёк со скриншота</label>
              <SelectField
                value={walletId}
                options={(wallets || []).map((item) => ({ value: String(item.id), label: `${item.currency} ${item.network} · ${shortAddress(item.wallet_address)}` }))}
                onChange={(value) => {
                  setWalletId(value)
                  setResult(null)
                }}
                placeholder={wallets ? 'Выбрать кошелёк' : 'Загружаем кошельки…'}
                buttonClassName="rounded-lg p-3 focus:border-blue-500"
                ariaLabel="Кошелёк со скриншота"
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Сумма перевода</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="25" className={fieldClass} />
            </label>
          </div>

          {useMessageTime ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr]">
              <div>
                <span className="mb-1 block text-xs text-slate-400">Время сообщения</span>
                <TimeField value={messageTime} onChange={setMessageTime} inputClassName={fieldClass} />
              </div>
              <div>
                <span className="mb-1 block text-xs text-slate-400">Дата (пусто — сегодня, а если это время ещё не наступило — вчера)</span>
                <DateField value={messageDate} onChange={setMessageDate} inputClassName={fieldClass} />
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setUseMessageTime(true)} className="text-xs font-medium text-blue-300 hover:text-blue-200">
              + Время сообщения (если скриншот прислали не сразу)
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void search()}
              disabled={searching}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              <Search size={15} /> {searching ? 'Ищем…' : 'Найти'}
            </button>
            <span className="text-xs text-slate-500">
              {useMessageTime && messageTime.trim() ? 'Ищем за 2 часа до сообщения и час после.' : 'Ищем за последние 2 часа.'}
            </span>
          </div>
        </>
      )}

      {formError && <p className="text-sm text-amber-300">{formError}</p>}

      {result && result.status !== 'found' && (
        <p className={`text-sm ${result.status === 'not_found' ? 'text-slate-300' : 'text-amber-300'}`}>
          {result.status === 'not_found' && result.window
            ? `Переводов на ${amount.trim()} ${currency} на этот кошелёк ${windowText(result.window)} не найдено.${timeHint}`
            : result.error || 'Не удалось выполнить поиск'}
        </p>
      )}

      {result?.status === 'found' && (
        <div className="space-y-2">
          {result.candidates.length > 1 && (
            <p className="text-sm text-amber-300">Найдено {result.candidates.length} {transfersWord(result.candidates.length)} на эту сумму — уточните у игрока, какой его.</p>
          )}
          {result.candidates.map((candidate) => (
            <div key={candidate.hash} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
              <div className="min-w-0 text-sm">
                <div className="text-slate-100">
                  {localTime(candidate.timestampMs)} <span className="text-xs text-slate-500">UTC {utcTime(candidate.timestampMs)}</span>
                  {!candidate.confirmed && <span className="ml-2 text-xs text-amber-300">не подтверждён</span>}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {candidate.amount} {currency} · от {shortAddress(candidate.from) || '—'} · {shortAddress(candidate.hash)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onPick(candidate.explorerUrl)
                  setIsOpen(false)
                  setResult(null)
                }}
                className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:border-blue-500 hover:text-white"
              >
                Подставить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
