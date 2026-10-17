/**
 * Which coin + network the app can look up in a blockchain explorer, and where (T-0027). One rule
 * for the rakeback search, the deposit search and the list of wallets the deposit search offers.
 * The label is free text as stored in wallets and player cards: "USDT TRC20", "USDC ERC20", "ETH", "BTC".
 */
export type TransferSource =
  | { kind: 'tron-token', contract: string, explorer: string }
  | { kind: 'bsc-token', contract: string, explorer: string }
  | { kind: 'evm-token', chainId: string, contract: string, explorer: string }
  | { kind: 'evm-native', chainId: string, explorer: string }
  | { kind: 'bitcoin', explorer: string }

const TRONSCAN = 'https://tronscan.org/#/transaction/'
const ETHERSCAN = 'https://etherscan.io/tx/'
const BSCSCAN = 'https://bscscan.com/tx/'
const BLOCKSTREAM = 'https://blockstream.info/tx/'

export const transferSourceFor = (label: string): TransferSource | null => {
  const normalized = String(label || '').trim().toUpperCase()
  const isUsdt = normalized.includes('USDT')
  const isUsdc = normalized.includes('USDC')
  if (normalized.includes('TRC20')) {
    // USDC on Tron has no contract configured: not searchable.
    return isUsdt ? { kind: 'tron-token', contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', explorer: TRONSCAN } : null
  }
  if (normalized.includes('BEP20')) {
    if (isUsdt) return { kind: 'bsc-token', contract: '0x55d398326f99059ff775485246999027b3197955', explorer: BSCSCAN }
    if (isUsdc) return { kind: 'bsc-token', contract: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', explorer: BSCSCAN }
    return null
  }
  if (isUsdt || isUsdc) {
    if (!normalized.includes('ERC20')) return null
    return isUsdt
      ? { kind: 'evm-token', chainId: '1', contract: '0xdac17f958d2ee523a2206206994597c13d831ec7', explorer: ETHERSCAN }
      : { kind: 'evm-token', chainId: '1', contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', explorer: ETHERSCAN }
  }
  if (/\bETH\b|ETHEREUM/.test(normalized)) return { kind: 'evm-native', chainId: '1', explorer: ETHERSCAN }
  if (/\bBTC\b|BITCOIN/.test(normalized)) return { kind: 'bitcoin', explorer: BLOCKSTREAM }
  return null
}
