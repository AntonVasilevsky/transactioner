const monthNamesRu = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]

const pad = (value: number) => String(value).padStart(2, '0')

export const toDateInputValue = (date: Date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
)

export const currentMonthRange = (now = new Date()) => ({
  from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
  to: toDateInputValue(now),
})

export const previousMonthRange = (now = new Date()) => {
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  return {
    from: toDateInputValue(previousMonthStart),
    to: toDateInputValue(previousMonthEnd),
  }
}

export const trailingMonthRange = (monthCount: number, now = new Date()) => {
  const normalizedMonthCount = Math.max(1, Math.floor(monthCount))
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth() - normalizedMonthCount + 1, 1)),
    to: toDateInputValue(now),
  }
}

const parseDateInput = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatRakebackPeriod = (from: string, to: string) => {
  const fromDate = parseDateInput(from)
  const toDate = parseDateInput(to)
  if (!fromDate || !toDate) return ''
  return `${fromDate.toLocaleDateString('ru-RU')} — ${toDate.toLocaleDateString('ru-RU')}`
}

export const completedMonthLabelsForRange = (
  from: string,
  to: string,
  now = new Date()
) => {
  const fromDate = parseDateInput(from)
  const toDate = parseDateInput(to)
  if (!fromDate || !toDate || fromDate > toDate) return []

  const lastCompletedMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const effectiveEnd = toDate < lastCompletedMonthEnd ? toDate : lastCompletedMonthEnd
  if (fromDate > effectiveEnd) return []

  const labels: string[] = []
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)

  while (cursor <= effectiveEnd) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    if (monthEnd <= effectiveEnd) {
      labels.push(monthNamesRu[cursor.getMonth()])
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return labels
}

export const accountDataLine = (account: Account | null) => [
  account?.roomUsername || account?.room_username,
  account?.roomPlayerId || account?.room_player_id,
  account?.email,
].map(part => String(part || '').trim()).filter(Boolean).join(' / ')

export const accountLabel = (account: Account | null) => {
  const roomName = account?.roomName || account?.room_name || 'Room'
  const accountLine = accountDataLine(account)
  return accountLine ? `${roomName}\n${accountLine}` : roomName
}

export const accountsBlock = (accounts: Account[]) => (
  accounts.length
    ? accounts.map(accountLabel).join('\n\n')
    : 'Account data'
)

export const composeStatsRequestTemplate = ({
  account,
  accounts,
  from,
  to,
}: {
  account: Account | null
  accounts?: Account[]
  from: string
  to: string
}) => {
  const accountBlock = accounts?.length ? accountsBlock(accounts) : accountLabel(account)
  const months = completedMonthLabelsForRange(from, to).join(', ') || formatRakebackPeriod(from, to) || 'выбранный период'

  return `${accountBlock}

Запросить статы за ${months}.`
}

export const composeCryptoRakebackTemplate = ({
  amount,
  transaction,
  transactions,
}: {
  amount: string
  transaction: string
  transactions?: Array<{ amount: string, date?: string, explorerUrl: string }>
}) => {
  const rows = transactions?.length
    ? transactions
    : [{ amount, date: '', explorerUrl: transaction }]

  const paymentBlocks = rows.map((row) => `Rakeback payment
Amount: ${String(row.amount || '').trim()}
Date: ${String(row.date || '').trim()}
TX: ${String(row.explorerUrl || '').trim()}`).join('\n\n')

  return paymentBlocks
}
