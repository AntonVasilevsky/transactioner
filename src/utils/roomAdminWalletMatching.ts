export const normalizeAdminToken = (value?: string | null) => String(value || '').trim().toUpperCase()

export const findWalletForMethod = (
  wallets: RoomWalletInfo[],
  method: Pick<SaveRoomPaymentMethodInput, 'room_key' | 'deal_type' | 'currency' | 'network'>
) => {
  const roomKey = normalizeAdminToken(method.room_key)
  const dealType = normalizeAdminToken(method.deal_type)
  const currency = normalizeAdminToken(method.currency)
  const network = normalizeAdminToken(method.network)
  if (!roomKey || !dealType || !currency || !network) return undefined
  const matchesMethod = (wallet: RoomWalletInfo) => (
    normalizeAdminToken(wallet.room_key) === roomKey &&
    normalizeAdminToken(wallet.deal_type) === dealType &&
    normalizeAdminToken(wallet.currency) === currency &&
    normalizeAdminToken(wallet.network) === network
  )
  return wallets.find((wallet) => wallet.is_active && matchesMethod(wallet)) ||
    wallets.find(matchesMethod)
}
