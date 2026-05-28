import { useState, useRef } from 'react'
import { Copy, CheckCircle2 } from 'lucide-react'
import type { OperationType } from '../App'

interface FormViewProps {
  player: Player
  account: Account | null
  onAccountSelect: (account: Account) => void
  operationType: OperationType
  onOperationChange: (operationType: OperationType) => void
  onPlayerUpdate?: (updates: Partial<Player>) => void
}

export default function FormView({ player, account, onAccountSelect, operationType, onOperationChange, onPlayerUpdate }: FormViewProps) {
  const primaryContact = player?.contacts?.find((contact) => contact.isPrimary) || player?.contacts?.[0]
  const playerContacts = player.contacts || []
  const [copied, setCopied] = useState(false)
  const [defaultWallet, setDefaultWallet] = useState(player?.default_wallet || '')
  const [defaultWalletNetwork, setDefaultWalletNetwork] = useState(player?.default_wallet_network || '')
  const [missingFields, setMissingFields] = useState<string[]>([])
  const accountSectionRef = useRef<HTMLDivElement | null>(null)
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({})
  
  // Form fields state
  const [amount, setAmount] = useState('')
  const [txId, setTxId] = useState('')
  const [network, setNetwork] = useState(operationType === 'Withdrawal' ? player?.default_wallet_network || '' : '')
  const [wallet, setWallet] = useState(operationType === 'Withdrawal' ? player?.default_wallet || '' : '')
  const [contactMethod, setContactMethod] = useState<ContactMethod>(primaryContact?.contactMethod || primaryContact?.contact_method || player?.contact_method || 'TG')
  const [contactValue, setContactValue] = useState(primaryContact?.contactValue || primaryContact?.contact_value || player?.messenger_username || '')
  const [selectedContactIndex, setSelectedContactIndex] = useState(0)

  const handleContactSelect = (index: number) => {
    const contact = player?.contacts?.[index]
    if (!contact) return
    setSelectedContactIndex(index)
    setContactMethod(contact.contactMethod || contact.contact_method || 'TG')
    setContactValue(contact.contactValue || contact.contact_value || '')
  }

  const handleOperationChange = (nextOperationType: OperationType) => {
    if (nextOperationType === 'Withdrawal') {
      setWallet(defaultWallet || '')
      setNetwork(defaultWalletNetwork || '')
    } else {
      setWallet('')
      setNetwork('')
    }
    onOperationChange(nextOperationType)
  }

  const generateTemplate = () => {
    if (!account) return 'Выберите аккаунт'
    
    const { roomName, roomUsername, roomPlayerId, email } = account
    const isDeposit = operationType === 'Deposit'
    
    if (roomName === 'RedStar') {
      if (isDeposit) {
        return `RedStar  ${roomUsername}\nОтправил тебе ${amount} для депозита.\ntx id:\n${txId}`
      } else {
        return `RedStar  ${roomUsername}\nОтправил тебе ${amount} для вывода, кошелёк:\n${network}\n${wallet}`
      }
    }
    
    if (roomName === 'Champion Poker') {
      if (isDeposit) {
        return `@TanyaAkaieva \nЗаявка на депозит Champion\n${roomUsername} / ${email}\n${amount}\n${txId}\n${contactMethod}: ${contactValue}`
      } else {
        return `@TanyaAkaieva Заявка на вывод Champion\n${roomUsername} / ${email}\nСумма: ${amount}\nКошелек: ${network}\n${wallet}\n${contactMethod}: ${contactValue}`
      }
    }
    
    if (roomName === 'Nexa') {
      if (isDeposit) {
        return `@TanyaAkaieva Заявка на депозит NEXA\n${roomPlayerId} / ${roomUsername} / ${email}\n${amount}\n${txId}\n${contactMethod}: ${contactValue}`
      } else {
        return `@TanyaAkaieva Заявка на вывод Nexa Poker\n${roomUsername}/ ${roomPlayerId}\n${amount}\n${network}\n${wallet}\n${contactMethod}: ${contactValue}`
      }
    }
    
    return 'Шаблон не определен'
  }

  const generatedText = generateTemplate()

  const getMissingFields = () => {
    if (!account) return ['account']

    const missing: string[] = []
    const isDeposit = operationType === 'Deposit'
    const roomName = account.roomName

    if (!amount.trim()) missing.push('amount')
    if (!account.roomUsername?.trim()) missing.push('roomUsername')

    if (isDeposit && !txId.trim()) missing.push('txId')
    if (!isDeposit && !network.trim()) missing.push('network')
    if (!isDeposit && !wallet.trim()) missing.push('wallet')

    if (roomName === 'Champion Poker' && !account.email?.trim()) missing.push('email')
    if (roomName === 'Nexa' && !account.roomPlayerId?.trim()) missing.push('roomPlayerId')
    if (roomName === 'Nexa' && isDeposit && !account.email?.trim()) missing.push('email')
    if (roomName !== 'RedStar' && !contactValue.trim()) missing.push('contactValue')

    return missing
  }

  const missingLabels: Record<string, string> = {
    account: 'аккаунт рума',
    amount: 'сумма',
    txId: 'TX ID / ссылка',
    network: 'сеть / монета',
    wallet: 'адрес кошелька',
    roomUsername: 'юзернейм в руме',
    roomPlayerId: 'Player ID',
    email: 'email',
    contactValue: 'контакт игрока'
  }

  const inputClass = (field: string, value?: string) => {
    const isMissing = missingFields.includes(field) && !String(value || '').trim()
    return `w-full bg-slate-900 border rounded-lg p-3 text-slate-100 placeholder-slate-600 outline-none transition-colors ${
      isMissing ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-blue-500'
    }`
  }

  const hasAccountMissing = ['roomUsername', 'roomPlayerId', 'email'].some(field => missingFields.includes(field))
  const visibleMissingFields = missingFields.filter(field => {
    if (['amount', 'txId', 'network', 'wallet', 'contactValue'].includes(field)) {
      const values: Record<string, string> = { amount, txId, network, wallet, contactValue }
      return !values[field].trim()
    }
    return true
  })

  const scrollToFirstMissingField = (missing: string[]) => {
    const firstMissing = missing[0]
    if (!firstMissing) return

    window.requestAnimationFrame(() => {
      if (['roomUsername', 'roomPlayerId', 'email', 'account'].includes(firstMissing)) {
        accountSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }

      const field = fieldRefs.current[firstMissing]
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field?.focus({ preventScroll: true })
    })
  }

  const handleCopy = async () => {
    const missing = getMissingFields()
    setMissingFields(missing)
    scrollToFirstMissingField(missing)

    await navigator.clipboard.writeText(generatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    const trimmedWallet = wallet.trim()
    const trimmedNetwork = network.trim()
    const savedWallet = (defaultWallet || '').trim()
    const savedNetwork = (defaultWalletNetwork || '').trim()
    const playerId = player.id
    const shouldSuggestReplace =
      operationType === 'Withdrawal' &&
      playerId &&
      trimmedWallet &&
      (trimmedWallet !== savedWallet || trimmedNetwork !== savedNetwork)

    if (shouldSuggestReplace) {
      const replace = window.confirm('Сохранить этот кошелек и сеть как значения по умолчанию для игрока?')
      if (replace) {
        const res = await window.electronAPI.updateDefaultWalletDetails(playerId, trimmedWallet, trimmedNetwork)
        if (res.success) {
          setDefaultWallet(trimmedWallet)
          setDefaultWalletNetwork(trimmedNetwork)
          onPlayerUpdate?.({
            default_wallet: trimmedWallet,
            default_wallet_network: trimmedNetwork
          })
        } else {
          window.alert(res.error || 'Не удалось обновить кошелек игрока')
        }
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
      {/* Left Column: Form */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Игрок <span className="text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg">{player.messenger_username}</span>
          </h2>
        </div>

        {/* Room & Operation Selector */}
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex flex-col gap-4 shadow-lg">
          <div ref={accountSectionRef}>
            <label className="block text-sm font-medium text-slate-400 mb-2">Выберите аккаунт рума</label>
            <div className="flex flex-wrap gap-2">
              {player.accounts?.map((acc, i) => (
                <button
                  key={i}
                  onClick={() => onAccountSelect(acc)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    account === acc 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {acc.roomName} ({acc.roomUsername || acc.roomPlayerId})
                </button>
              ))}
              {player.accounts?.length === 0 && <span className="text-red-400 text-sm">У игрока нет привязанных румов.</span>}
            </div>
            {hasAccountMissing && (
              <p className="mt-3 text-sm text-red-400">
                В карточке выбранного игрока не заполнены данные аккаунта: {missingFields.filter(field => ['roomUsername', 'roomPlayerId', 'email'].includes(field)).map(field => missingLabels[field]).join(', ')}.
              </p>
            )}
          </div>

          <div className="flex items-center bg-slate-900 rounded-lg p-1 w-full lg:w-max">
            <button
              onClick={() => handleOperationChange('Deposit')}
              className={`flex-1 lg:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${
                operationType === 'Deposit' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Депозит
            </button>
            <button
              onClick={() => handleOperationChange('Withdrawal')}
              className={`flex-1 lg:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${
                operationType === 'Withdrawal' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Вывод
            </button>
          </div>
        </div>

        {/* Dynamic Inputs */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl flex flex-col gap-4 shadow-lg flex-1">
          <h3 className="font-semibold text-slate-200">Данные заявки</h3>
          {visibleMissingFields.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Не заполнено: {visibleMissingFields.map(field => missingLabels[field]).join(', ')}. Шаблон всё равно скопирован.
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Сумма</label>
            <input ref={el => { fieldRefs.current.amount = el }} type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="$500" className={inputClass('amount', amount)} />
          </div>

          {operationType === 'Deposit' ? (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">TX ID / Ссылка на транзакцию</label>
              <input ref={el => { fieldRefs.current.txId = el }} type="text" value={txId} onChange={e => setTxId(e.target.value)} placeholder="https://tronscan.org/#/transaction/..." className={inputClass('txId', txId)} />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Сеть / Монета</label>
                <input ref={el => { fieldRefs.current.network = el }} type="text" value={network} onChange={e => setNetwork(e.target.value)} placeholder="USDT TRC20" className={inputClass('network', network)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Адрес кошелька</label>
                <input ref={el => { fieldRefs.current.wallet = el }} type="text" value={wallet} onChange={e => setWallet(e.target.value)} placeholder="T..." className={inputClass('wallet', wallet)} />
              </div>
            </>
          )}

          {account?.roomName !== 'RedStar' && (
            <div className="flex gap-2">
              <div className="w-1/3">
                <label className="block text-sm font-medium text-slate-400 mb-1">Тип связи</label>
                {playerContacts.length > 1 ? (
                  <select value={selectedContactIndex} onChange={e => handleContactSelect(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500">
                    {playerContacts.map((contact, index) => (
                      <option key={index} value={index}>{contact.contactMethod || contact.contact_method}</option>
                    ))}
                  </select>
                ) : (
                  <select value={contactMethod} onChange={e => setContactMethod(e.target.value as ContactMethod)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 outline-none focus:border-blue-500">
                    <option value="TG">TG</option>
                    <option value="WA">WA</option>
                    <option value="Discord">Discord</option>
                    <option value="Teams">Teams</option>
                    <option value="Email">Email</option>
                  </select>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-400 mb-1">Контакт</label>
                <input ref={el => { fieldRefs.current.contactValue = el }} type="text" value={contactValue} onChange={e => setContactValue(e.target.value)} className={inputClass('contactValue', contactValue)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Result */}
      <div className="flex-1 flex flex-col lg:sticky lg:top-8 h-fit max-h-full">
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl shadow-2xl flex flex-col h-full ring-1 ring-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">Готовый шаблон</h3>
            {account && (
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">{account.roomName}</span>
            )}
          </div>
          
          <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 overflow-y-auto mb-6">
            <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {generatedText}
            </pre>
          </div>

          <button
            onClick={handleCopy}
            disabled={!account}
            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg
              ${copied 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copied ? <><CheckCircle2 size={20} /> Скопировано</> : <><Copy size={20} /> Скопировать шаблон</>}
          </button>
        </div>
      </div>
    </div>
  )
}
