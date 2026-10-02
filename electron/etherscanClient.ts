const requestIntervalMs = 400
const retryDelayMs = 1200
const maxRateLimitRetries = 2

let lastRequestAt = 0
let requestGate: Promise<void> = Promise.resolve()

const sleep = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds))

const waitForRequestSlot = async () => {
  let release!: () => void
  const previous = requestGate
  requestGate = new Promise<void>(resolve => { release = resolve })

  await previous
  try {
    const delay = Math.max(0, lastRequestAt + requestIntervalMs - Date.now())
    if (delay) await sleep(delay)
    lastRequestAt = Date.now()
  } finally {
    release()
  }
}

const isProviderRateLimit = (data: unknown) => {
  if (!data || typeof data !== 'object') return false
  const response = data as { status?: string, message?: string, result?: unknown }
  return response.status === '0' &&
    /rate limit|too many requests/i.test(`${response.message || ''} ${typeof response.result === 'string' ? response.result : ''}`)
}

export const fetchEtherscanJson = async <T extends { status?: string, message?: string, result?: unknown }>(
  url: string
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRateLimitRetries; attempt++) {
    await waitForRequestSlot()
    const response = await fetch(url)

    if (response.status === 429 && attempt < maxRateLimitRetries) {
      await sleep(retryDelayMs * (attempt + 1))
      continue
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json() as T
    if (isProviderRateLimit(data) && attempt < maxRateLimitRetries) {
      await sleep(retryDelayMs * (attempt + 1))
      continue
    }
    return data
  }

  throw new Error('Etherscan API: превышен лимит запросов')
}
