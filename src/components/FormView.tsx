import { useEffect, useRef, useState } from 'react'
import { Copy, CheckCircle2 } from 'lucide-react'
import type { OperationType } from '../App'
import { normalizeContactText } from '../utils/contactNormalization'
import {
  championDepositTemplateAmount,
  championWithdrawalTemplateAmount,
  currencySymbolAmount,
  defaultAmountCurrencyForRoom,
  resolveRoomPaymentWarning,
  transactionTemplateAccountLine,
  type AmountCurrency
} from '../utils/transactionTemplateFormatting'
import { getWalletAddressValidationError } from '../utils/walletValidation'

const isRedStarWithdrawal = (targetAccount: Account | null, targetOperationType: OperationType) =>
  targetAccount?.roomName === 'RedStar' && targetOperationType === 'Withdrawal'

const shouldUseAmountCurrency = (targetAccount: Account | null) =>
  targetAccount?.roomName === 'Nexa' ||
  targetAccount?.roomName === 'RedStar'

const isChampionWithdrawal = (targetAccount: Account | null, targetOperationType: OperationType) =>
  targetAccount?.roomName === 'Champion Poker' && targetOperationType === 'Withdrawal'

const isChampionDeposit = (targetAccount: Account | null, targetOperationType: OperationType) =>
  targetAccount?.roomName === 'Champion Poker' && targetOperationType === 'Deposit'

const isChampionOperation = (targetAccount: Account | null, targetOperationType: OperationType) =>
  isChampionDeposit(targetAccount, targetOperationType) || isChampionWithdrawal(targetAccount, targetOperationType)

type TemplateLanguage = 'RU' | 'EN' | 'ES'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const highlightUsdcHtml = (value: string) => escapeHtml(value).replace(/\bUSDC\b/gi, match => `<strong>${match}</strong>`)

const templateHtml = (value: string) => `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; white-space: pre-wrap;">${highlightUsdcHtml(value)}</pre>`

const isUsdcNetwork = (value: string) => /\bUSDC\b/i.test(value)
const hasCompleteTransactionHash = (value: string) => /(?:0x)?[a-fA-F0-9]{64}/.test(value)
const isSameLocalDate = (first: Date, second: Date) => (
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate()
)

const formatLocalTransactionDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

const getInitialAmount = (targetAccount: Account | null, targetOperationType: OperationType) =>
  shouldUseAmountCurrency(targetAccount)
    ? getInitialAmountCurrency(targetAccount, targetOperationType) === 'EUR' ? '€' : '$'
    : ''

const getInitialAmountCurrency = (targetAccount: Account | null, targetOperationType: OperationType): AmountCurrency =>
  defaultAmountCurrencyForRoom(targetAccount?.roomName || '', targetOperationType)

const formatResolvedTransactionMethod = (
  currency?: string,
  network?: ResolveTransactionResult['network']
) => {
  const normalizedCurrency = String(currency || '').trim().toUpperCase()
  if (network === 'bitcoin') return 'BTC'
  if (network === 'tron') return normalizedCurrency ? `${normalizedCurrency} TRC20` : 'TRC20'
  if (network === 'ethereum') {
    if (normalizedCurrency === 'ETH') return 'ETH'
    return normalizedCurrency ? `${normalizedCurrency} ERC20` : 'ERC20'
  }
  if (network === 'bsc') return normalizedCurrency ? `${normalizedCurrency} BEP20` : 'BEP20'
  return normalizedCurrency
}

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
  const warningScrollTargetRef = useRef<HTMLDivElement | HTMLParagraphElement | null>(null)
  const lastWarningScrollKeyRef = useRef('')
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const amountEditedRef = useRef(false)
  const txResolveRunRef = useRef(0)
  const amountConversionRunRef = useRef(0)
  
  // Form fields state
  const [amount, setAmount] = useState(() => getInitialAmount(account, operationType))
  const [amountCurrency, setAmountCurrency] = useState<AmountCurrency>(() => getInitialAmountCurrency(account, operationType))
  const [convertedAmount, setConvertedAmount] = useState('')
  const [amountConversionStatus, setAmountConversionStatus] = useState<'idle' | 'loading' | 'converted' | 'error'>('idle')
  const [amountConversionMessage, setAmountConversionMessage] = useState('')
  const [txId, setTxId] = useState('')
  const [txTimestamp, setTxTimestamp] = useState('')
  const [txResolvedMethod, setTxResolvedMethod] = useState('')
  const [txResolveStatus, setTxResolveStatus] = useState<'idle' | 'loading' | 'resolved' | 'warning' | 'not_found' | 'error'>('idle')
  const [txResolveMessage, setTxResolveMessage] = useState('')
  const [network, setNetwork] = useState(operationType === 'Withdrawal' ? player?.default_wallet_network || '' : '')
  const [wallet, setWallet] = useState(operationType === 'Withdrawal' ? player?.default_wallet || '' : '')
  const [contactMethod, setContactMethod] = useState<ContactMethod>(primaryContact?.contactMethod || primaryContact?.contact_method || player?.contact_method || 'TG')
  const [contactValue, setContactValue] = useState(primaryContact?.contactValue || primaryContact?.contact_value || player?.messenger_username || '')
  const [selectedContactIndex, setSelectedContactIndex] = useState(0)
  const [templateLanguage, setTemplateLanguage] = useState<TemplateLanguage>('RU')
  const [roomKnowledgeIndex, setRoomKnowledgeIndex] = useState<RoomKnowledgeIndex | null>(null)

  const loadRoomKnowledgeIndex = async () => {
    try {
      const result = await window.electronAPI.getRoomKnowledgeIndex()
      setRoomKnowledgeIndex(result)
      return result
    } catch {
      setRoomKnowledgeIndex(null)
      return null
    }
  }

  const handleContactSelect = (index: number) => {
    const contact = player?.contacts?.[index]
    if (!contact) return
    setSelectedContactIndex(index)
    setContactMethod(contact.contactMethod || contact.contact_method || 'TG')
    setContactValue(contact.contactValue || contact.contact_value || '')
  }

  useEffect(() => {
    let active = true
    const refresh = async () => {
      const result = await window.electronAPI.getRoomKnowledgeIndex().catch(() => null)
      if (!active) return
      setRoomKnowledgeIndex(result)
    }
    refresh()
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refreshOnVisible)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [])

  const resetAmountConversion = () => {
    amountConversionRunRef.current += 1
    setConvertedAmount('')
    setAmountConversionStatus('idle')
    setAmountConversionMessage('')
  }

  const handleOperationChange = (nextOperationType: OperationType) => {
    amountEditedRef.current = false
    setAmount(getInitialAmount(account, nextOperationType))
    setAmountCurrency(getInitialAmountCurrency(account, nextOperationType))
    resetAmountConversion()
    setMissingFields([])
    if (nextOperationType !== 'Deposit') {
      txResolveRunRef.current += 1
      setTxId('')
      setTxTimestamp('')
      setTxResolvedMethod('')
      setTxResolveStatus('idle')
      setTxResolveMessage('')
    }

    if (nextOperationType === 'Withdrawal') {
      setWallet(defaultWallet || '')
      setNetwork(defaultWalletNetwork || '')
    } else {
      setWallet('')
      setNetwork('')
    }
    onOperationChange(nextOperationType)
  }

  const handleAccountSelect = (nextAccount: Account) => {
    amountEditedRef.current = false
    setAmount(getInitialAmount(nextAccount, operationType))
    setAmountCurrency(getInitialAmountCurrency(nextAccount, operationType))
    resetAmountConversion()
    setMissingFields([])
    onAccountSelect(nextAccount)
  }

  const handleAmountChange = (value: string) => {
    amountEditedRef.current = true
    setAmount(value)
    if (isChampionOperation(account, operationType) && amountCurrency === 'USD') {
      resetAmountConversion()
    }
  }

  const handleAmountCurrencyChange = (nextCurrency: AmountCurrency) => {
    setAmountCurrency(nextCurrency)
    resetAmountConversion()
    if (isRedStarWithdrawal(account, operationType)) {
      setAmount(current => current.trim() ? currencySymbolAmount(current, nextCurrency) : nextCurrency === 'EUR' ? '€' : '$')
    }
  }

  const handleTxChange = (value: string) => {
    setTxId(value)
    setTxTimestamp('')
    setTxResolvedMethod('')
    setTxResolveStatus('idle')
    setTxResolveMessage('')
  }

  useEffect(() => {
    const rawTx = txId.trim()
    const hasCompleteHash = hasCompleteTransactionHash(rawTx)

    if (operationType !== 'Deposit' || !account || !hasCompleteHash) {
      return
    }

    const runId = txResolveRunRef.current + 1
    txResolveRunRef.current = runId
    const timer = window.setTimeout(() => {
      setTxResolveStatus('loading')
      setTxResolveMessage('Проверяем транзакцию...')
      window.electronAPI.resolveTransaction({
        txInput: rawTx,
        roomName: account.roomName,
        operationType
      }).then((result) => {
        if (txResolveRunRef.current !== runId) return

        if (result.success && result.explorerUrl) {
          setTxId(current => current.trim() === rawTx ? result.explorerUrl! : current)
          setTxTimestamp(result.transactionTimestamp || '')
          setTxResolvedMethod(formatResolvedTransactionMethod(result.currency, result.network))
          if (result.warning || result.requiresManualAmount) {
            if (!amountEditedRef.current) {
              setAmount(getInitialAmount(account, operationType))
              resetAmountConversion()
            }
            setTxResolveStatus('warning')
            setTxResolveMessage(result.warning || 'Проверьте сумму транзакции вручную.')
            return
          }

          const resolvedAmount = account.roomName === 'Champion Poker'
            ? result.convertedDisplayAmount || result.displayAmount
            : result.displayAmount
          if (result.network === 'bitcoin' && !resolvedAmount && !amountEditedRef.current) {
            setAmount('')
          }
          if (resolvedAmount) {
            setAmount(resolvedAmount)
            amountEditedRef.current = false
            if (account.roomName === 'Champion Poker' && result.convertedDisplayAmount) {
              setAmountCurrency('EUR')
              resetAmountConversion()
            }
          }
          setTxResolveStatus('resolved')
          setTxResolveMessage(
            result.convertedDisplayAmount && result.fxDate
              ? `Найдена ${result.network}. Сумма ${result.displayAmount}, курс USD/EUR за ${result.fxDate}: ${result.convertedDisplayAmount}.`
              : `Найдена ${result.network}${result.displayAmount ? `, сумма ${result.displayAmount}` : ''}.`
          )
          return
        }

        if (result.status === 'not_found') {
          setTxTimestamp('')
          setTxResolvedMethod('')
          setTxResolveStatus('not_found')
          setTxResolveMessage(result.error || 'Транзакция не найдена')
          return
        }

        setTxTimestamp('')
        setTxResolvedMethod('')
        setTxResolveStatus('error')
        setTxResolveMessage(result.error || 'Не удалось проверить транзакцию')
      }).catch((err) => {
        if (txResolveRunRef.current !== runId) return
        setTxTimestamp('')
        setTxResolvedMethod('')
        setTxResolveStatus('error')
        setTxResolveMessage(err instanceof Error ? err.message : String(err))
      })
    }, 500)

    return () => window.clearTimeout(timer)
  }, [account, operationType, txId])

  useEffect(() => {
    const rawAmount = amount.trim()
    if (!isChampionOperation(account, operationType) || amountCurrency !== 'USD' || !rawAmount) {
      return
    }

    const runId = amountConversionRunRef.current + 1
    amountConversionRunRef.current = runId
    let cancelled = false
    const timer = window.setTimeout(() => {
      setAmountConversionStatus('loading')
      setAmountConversionMessage('Конвертируем USD в EUR...')
      window.electronAPI.convertUsdToEur(rawAmount)
        .then((result) => {
          if (cancelled || amountConversionRunRef.current !== runId) return

          if (result.success && result.convertedDisplayAmount) {
            const templateAmount = isChampionDeposit(account, operationType)
              ? result.convertedDisplayAmount
              : result.convertedAmount ? `EUR ${result.convertedAmount}` : result.convertedDisplayAmount
            setConvertedAmount(templateAmount)
            setAmountConversionStatus('converted')
            setAmountConversionMessage(
              result.fxDate
                ? `$${result.inputAmount} = ${templateAmount} по курсу за ${result.fxDate}`
                : `$${result.inputAmount} = ${templateAmount}`
            )
            return
          }

          setConvertedAmount('')
          setAmountConversionStatus('error')
          setAmountConversionMessage(result.error || 'Не удалось конвертировать сумму')
        })
        .catch((err) => {
          if (cancelled || amountConversionRunRef.current !== runId) return
          setConvertedAmount('')
          setAmountConversionStatus('error')
          setAmountConversionMessage(err instanceof Error ? err.message : String(err))
        })
    }, 500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [account, amount, amountCurrency, operationType])

  const getTemplateAmount = () => {
    if (isChampionDeposit(account, operationType)) return championDepositTemplateAmount(amount, amountCurrency, convertedAmount)
    if (account?.roomName === 'RedStar') {
      return currencySymbolAmount(amount, isRedStarWithdrawal(account, operationType) ? amountCurrency : 'USD')
    }
    if (!isChampionWithdrawal(account, operationType)) return amount
    return championWithdrawalTemplateAmount(amount, amountCurrency, convertedAmount)
  }

  const generateTemplate = () => {
    if (!account) return 'Выберите аккаунт'
    
    const { roomName, roomUsername, roomPlayerId, email } = account
    const isDeposit = operationType === 'Deposit'
    const templateContactValue = normalizeContactText(contactValue)
    const templateAmount = getTemplateAmount()
    const accountLine = (...parts: Array<string | null | undefined>) =>
      parts.map(part => String(part || '').trim()).filter(Boolean).join(' / ')

    const englishAmount = templateAmount
      .replace(/^EUR\s+/i, '€')
      .replace(/^USD\s+/i, '$')
      .replace(/^€\s*/, '€')
      .replace(/^\$\s*/, '$')
      .trim()

    if (templateLanguage === 'EN' || templateLanguage === 'ES') {
      const localizedAccountLine = transactionTemplateAccountLine({
        language: templateLanguage,
        roomName: roomName || '',
        roomUsername: roomUsername || '',
        roomPlayerId,
        email,
      })
      const operationLabel = templateLanguage === 'EN'
        ? isDeposit ? 'deposit' : 'withdrawal'
        : isDeposit ? 'Deposit' : 'withdrawal'
      const amountLine = `${englishAmount} ${operationLabel}`
      if (isDeposit) {
        return `${roomName}\n${localizedAccountLine}\n\n${amountLine}\n\n${txId}`
      }

      const withdrawalSeparator = templateLanguage === 'ES' ? '\n\n' : '\n'
      return `${roomName}\n${localizedAccountLine}\n\n${amountLine}\n\n${network}${withdrawalSeparator}${wallet}`
    }
    
    if (roomName === 'RedStar') {
      if (isDeposit) {
        return `RedStar  ${roomUsername}\nОтправил тебе ${templateAmount} для депозита.\n${txId}`
      } else {
        return `RedStar  ${roomUsername}\nОтправил тебе ${templateAmount} для вывода, кошелёк:\n${network}\n${wallet}`
      }
    }
    
    if (roomName === 'Champion Poker') {
      const championAccountLine = accountLine(roomUsername, email)
      if (isDeposit) {
        return `@TanyaAkaieva \nЗаявка на депозит Champion\n${championAccountLine}\n${templateAmount}\n${txId}\n${contactMethod}: ${templateContactValue}`
      } else {
        return `@TanyaAkaieva Заявка на вывод Champion\n${championAccountLine}\nСумма: ${templateAmount}\nКошелек: ${network}\n${wallet}\n${contactMethod}: ${templateContactValue}`
      }
    }
    
    if (roomName === 'Nexa') {
      const nexaDepositAccountLine = accountLine(roomPlayerId, roomUsername, email)
      const nexaWithdrawalAccountLine = accountLine(roomUsername, roomPlayerId, email)
      if (isDeposit) {
        return `@TanyaAkaieva Заявка на депозит Nexa\n${nexaDepositAccountLine}\n${amount}\n${txId}\n${contactMethod}: ${templateContactValue}`
      } else {
        return `@TanyaAkaieva Заявка на вывод Nexa Poker\n${nexaWithdrawalAccountLine}\n${amount}\n${network}\n${wallet}\n${contactMethod}: ${templateContactValue}`
      }
    }
    
    return 'Шаблон не определен'
  }

  const generatedText = generateTemplate()
  const showAmountCurrencySwitch = isChampionOperation(account, operationType) || isRedStarWithdrawal(account, operationType)
  const amountPlaceholder = shouldUseAmountCurrency(account) || isChampionOperation(account, operationType)
    ? amountCurrency === 'EUR' ? '€500' : '$500'
    : '$500'

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
    if (isChampionOperation(account, operationType) && amountCurrency === 'USD' && amount.trim() && !convertedAmount) missing.push('convertedAmount')
    if (roomName === 'Nexa' && !account.roomPlayerId?.trim()) missing.push('roomPlayerId')
    if (roomName !== 'RedStar' && !contactValue.trim()) missing.push('contactValue')

    return missing
  }

  const missingLabels: Record<string, string> = {
    account: 'аккаунт рума',
    amount: 'сумма',
    convertedAmount: 'конвертация USD в EUR',
    txId: 'TX ID / ссылка',
    network: 'сеть / монета',
    wallet: 'адрес кошелька',
    roomUsername: 'юзернейм в руме',
    roomPlayerId: 'Player ID',
    email: 'email',
    contactValue: 'контакт игрока'
  }

  const walletValidationError = operationType === 'Withdrawal'
    ? getWalletAddressValidationError(wallet)
    : null

  const inputClass = (field: string, value?: string) => {
    const isMissing = missingFields.includes(field) && !String(value || '').trim()
    const isInvalidWallet = field === 'wallet' && Boolean(walletValidationError)
    return `min-w-0 max-w-full w-full bg-slate-900 border rounded-lg p-3 text-slate-100 placeholder-slate-700 outline-none transition-colors ${
      isMissing || isInvalidWallet ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-blue-500'
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
  const buildRoomPaymentWarning = (index: RoomKnowledgeIndex | null) => (
    account && index
      ? resolveRoomPaymentWarning({
      roomName: account.roomName || '',
      operationType,
      method: operationType === 'Deposit' ? txResolvedMethod : network,
      amount: getTemplateAmount(),
      profiles: index.profiles,
      paymentMethods: index.paymentMethods,
      walletOptions: index.walletOptions,
    }) : ''
  )
  const roomPaymentWarning = buildRoomPaymentWarning(roomKnowledgeIndex)
  const transactionDateWarning = (() => {
    if (operationType !== 'Deposit' || !txTimestamp) return ''
    const transactionDate = new Date(txTimestamp)
    if (Number.isNaN(transactionDate.getTime())) return ''
    if (isSameLocalDate(transactionDate, new Date())) return ''
    const formattedDate = formatLocalTransactionDate(txTimestamp)
    return formattedDate
      ? `Транзакция старше одного дня: ${formattedDate}. Проверьте, что это актуальный депозит.`
      : 'Транзакция старше одного дня. Проверьте, что это актуальный депозит.'
  })()
  const depositTransactionCopyWarning = (() => {
    if (operationType !== 'Deposit' || !account || !txId.trim() || !hasCompleteTransactionHash(txId)) return ''
    if (txResolveStatus === 'resolved') return ''
    if (txResolveStatus === 'loading') {
      return 'Проверка транзакции еще идет. Дождитесь результата, чтобы убедиться, что кошелек соответствует выбранному руму.'
    }
    if (txResolveStatus === 'warning') {
      return txResolveMessage || 'Проверьте, что транзакция относится к выбранному руму.'
    }
    if (txResolveStatus === 'not_found') {
      return txResolveMessage || 'Транзакция не найдена. Нельзя подтвердить соответствие кошелька выбранному руму.'
    }
    if (txResolveStatus === 'error') {
      return txResolveMessage || 'Не удалось проверить транзакцию и соответствие кошелька выбранному руму.'
    }
    return 'Транзакция еще не проверена. Дождитесь результата, чтобы убедиться, что кошелек соответствует выбранному руму.'
  })()
  const txResolveWarning = txResolveMessage && ['warning', 'not_found', 'error'].includes(txResolveStatus)
    ? txResolveMessage
    : ''
  const firstVisibleWarningKey = visibleMissingFields.length > 0
    ? `missing:${visibleMissingFields.join(',')}`
    : roomPaymentWarning
      ? `room:${roomPaymentWarning}`
      : txResolveWarning
        ? `tx:${txResolveWarning}`
        : transactionDateWarning
          ? `date:${transactionDateWarning}`
          : ''

  useEffect(() => {
    if (!firstVisibleWarningKey || lastWarningScrollKeyRef.current === firstVisibleWarningKey) return
    lastWarningScrollKeyRef.current = firstVisibleWarningKey

    window.requestAnimationFrame(() => {
      const target = warningScrollTargetRef.current
      if (!target) return
      const rect = target.getBoundingClientRect()
      const topPadding = 72
      const bottomPadding = 32
      const isVisible = rect.top >= topPadding && rect.bottom <= window.innerHeight - bottomPadding
      if (isVisible) return
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [firstVisibleWarningKey])

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
    if (walletValidationError) {
      const field = fieldRefs.current.wallet
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field?.focus({ preventScroll: true })
      field?.select()
      return
    }

    const missing = getMissingFields()
    setMissingFields(missing)
    scrollToFirstMissingField(missing)

    if (depositTransactionCopyWarning) {
      const proceed = window.confirm(`${depositTransactionCopyWarning}\n\nВыбранный рум: ${account?.roomName || 'не выбран'}\nСкопировать шаблон всё равно?`)
      if (!proceed) return
    }

    const latestRoomKnowledgeIndex = await loadRoomKnowledgeIndex()
    const latestRoomPaymentWarning = buildRoomPaymentWarning(latestRoomKnowledgeIndex)
    if (latestRoomPaymentWarning) {
      const proceed = window.confirm(`${latestRoomPaymentWarning}\n\nСкопировать шаблон всё равно?`)
      if (!proceed) return
    }

    if (isUsdcNetwork(network) && 'ClipboardItem' in window) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([generatedText], { type: 'text/plain' }),
            'text/html': new Blob([templateHtml(generatedText)], { type: 'text/html' }),
          })
        ])
      } catch {
        await navigator.clipboard.writeText(generatedText)
      }
    } else {
      await navigator.clipboard.writeText(generatedText)
    }
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
    <div className="min-w-0 max-w-4xl mx-auto h-full flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
      {/* Left Column: Form */}
      <div className="min-w-0 flex-1 flex flex-col gap-6">
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
                  onClick={() => handleAccountSelect(acc)}
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
        <div className="min-w-0 bg-slate-800 border border-slate-700 p-6 rounded-2xl flex flex-col gap-4 shadow-lg flex-1">
          <h3 className="font-semibold text-slate-200">Данные заявки</h3>
          {visibleMissingFields.length > 0 && (
            <div ref={firstVisibleWarningKey.startsWith('missing:') ? warningScrollTargetRef : undefined} className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Не заполнено: {visibleMissingFields.map(field => missingLabels[field]).join(', ')}. Шаблон всё равно скопирован.
            </div>
          )}
          {roomPaymentWarning && (
            <div ref={firstVisibleWarningKey.startsWith('room:') ? warningScrollTargetRef : undefined} className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              {roomPaymentWarning}
            </div>
          )}
          
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-slate-400">Сумма</label>
              {showAmountCurrencySwitch && (
                <div className="flex shrink-0 items-center rounded-lg bg-slate-900 p-1">
                  <button
                    type="button"
                    onClick={() => handleAmountCurrencyChange('EUR')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      amountCurrency === 'EUR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    EUR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAmountCurrencyChange('USD')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      amountCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    USD
                  </button>
                </div>
              )}
            </div>
            <input
              ref={el => { fieldRefs.current.amount = el }}
              type="text"
              value={amount}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder={amountPlaceholder}
              className={inputClass('amount', amount)}
            />
            {isChampionOperation(account, operationType) && amountCurrency === 'USD' && amountConversionMessage && (
              <p className={`mt-2 text-xs ${
                amountConversionStatus === 'converted'
                  ? 'text-emerald-400'
                  : amountConversionStatus === 'loading'
                    ? 'text-slate-500'
                    : 'text-amber-400'
              }`}>
                {amountConversionMessage}
              </p>
            )}
          </div>

          {operationType === 'Deposit' ? (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">TX ID / Ссылка на транзакцию</label>
              <input ref={el => { fieldRefs.current.txId = el }} type="text" value={txId} onChange={e => handleTxChange(e.target.value)} placeholder="https://tronscan.org/#/transaction/..." className={inputClass('txId', txId)} />
              {txResolveMessage && (
                <p ref={firstVisibleWarningKey.startsWith('tx:') ? warningScrollTargetRef : undefined} className={`mt-2 text-xs ${
                  txResolveStatus === 'resolved'
                    ? 'text-emerald-400'
                    : txResolveStatus === 'loading'
                      ? 'text-slate-500'
                      : 'text-amber-400'
                }`}>
                  {txResolveMessage}
                </p>
              )}
              {transactionDateWarning && (
                <p ref={firstVisibleWarningKey.startsWith('date:') ? warningScrollTargetRef : undefined} className="mt-2 text-xs text-amber-300">
                  {transactionDateWarning}
                </p>
              )}
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
                {walletValidationError && (
                  <p className="mt-2 text-xs text-red-300">{walletValidationError}</p>
                )}
              </div>
            </>
          )}

          {account?.roomName !== 'RedStar' && (
            <div className="min-w-0 flex gap-2">
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
              <div className="min-w-0 flex-1">
                <label className="block text-sm font-medium text-slate-400 mb-1">Контакт</label>
                <input ref={el => { fieldRefs.current.contactValue = el }} type="text" value={contactValue} onChange={e => setContactValue(e.target.value)} className={inputClass('contactValue', contactValue)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Result */}
      <div className="min-w-0 flex-1 flex flex-col lg:sticky lg:top-8 h-fit max-h-full">
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl shadow-2xl flex flex-col h-full ring-1 ring-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">Готовый шаблон</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-slate-900 p-1">
                {(['RU', 'EN', 'ES'] as const).map(language => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => setTemplateLanguage(language)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      templateLanguage === language ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {language}
                  </button>
                ))}
              </div>
              {account && (
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">{account.roomName}</span>
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 overflow-y-auto mb-6">
            <pre
              className="text-slate-300 font-mono text-sm whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightUsdcHtml(generatedText) }}
            />
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
