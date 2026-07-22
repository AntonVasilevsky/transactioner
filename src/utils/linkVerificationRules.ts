export type LinkVerificationChannel = 'messenger' | 'email'

export type LinkVerificationFieldKey =
  | 'username'
  | 'roomId'
  | 'email'
  | 'nick'
  | 'userId'
  | 'messengerUsername'

export interface LinkVerificationTemplate {
  key: string
  label: string
  channel: LinkVerificationChannel
  body: string
  recipientHandle?: string
  recipientEmail?: string
  ccEmails?: string[]
  notes?: string
}

export interface DealRule {
  dealText: string
  directusDealSchema: string
  notes?: string
}

export interface LinkVerificationRoomRule {
  canonicalRoomName: string
  aliases: string[]
  templateKeys: string[]
  defaultTemplateKey: string
  requiredFields: LinkVerificationFieldKey[]
  sheet2RoomUsernameField: LinkVerificationFieldKey
  persistPlayerInMainDb: boolean
  deal: DealRule
}

const normalizeRoomName = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')

const netRamp = (percent: string) => `net/ramp\n0, ${percent}%`
const grossRamp = (percent: string) => `gross/ramp\n0, ${percent}%`

export const LINK_VERIFICATION_TEMPLATES: Record<string, LinkVerificationTemplate> = {
  default: {
    key: 'default',
    label: 'Default',
    channel: 'messenger',
    body: `Проверка привязки <room_name>
<player_data>
<messenger>: <messenger_username>
@kapitonov`
  },
  wptg: {
    key: 'wptg',
    label: 'WPTG',
    channel: 'messenger',
    body: `Запрос на подтверждение привязки аккаунта WPTG:
ID: <id>
Nick: <nick>
Mail: <email>

Добавить под трекер: 116 прямая касса`
  },
  nexa: {
    key: 'nexa',
    label: 'Nexa',
    channel: 'messenger',
    body: `Проверка привязки Nexa
<nick> / <id> / <email>
<messenger>: <messenger_username>
@kapitonoff`
  },
  redstar: {
    key: 'redstar',
    label: 'RedStar',
    channel: 'messenger',
    body: `Redstar <login>
Проверка привязки аккаунта под трекером 8499.
Если ок, то и апгрейд ему, пожалуйста.`
  },
  '888-confirmation': {
    key: '888-confirmation',
    label: 'gir1_',
    channel: 'messenger',
    body: `Подтверждение привязки 888
<login>`
  },
  '888-check': {
    key: '888-check',
    label: 'username',
    channel: 'messenger',
    body: `Проверка привязки 888
<username>
<messenger>: <messenger_username>
@kapitonoff`
  },
  ton: {
    key: 'ton',
    label: 'TON Poker',
    channel: 'messenger',
    body: `Привет. Проверьте, пожалуйста, привязку:
Nick: <nick>
Username: <messenger_username>
ID: <id>`
  },
  partypoker: {
    key: 'partypoker',
    label: 'PartyPoker',
    channel: 'messenger',
    body: `Проверка привязки аккаунта:
Mail: <email>
User ID: <user_id>`
  },
  bwin: {
    key: 'bwin',
    label: 'bwin',
    channel: 'messenger',
    body: `Проверка привязки аккаунта:
Mail: <email>
User ID: <user_id>`
  },
  gutspoker: {
    key: 'gutspoker',
    label: 'Guts Poker',
    channel: 'email',
    recipientEmail: 'jonathan.briscoewhite@betssongroup.com',
    ccEmails: ['antonio@worldpokerdeals.com'],
    body: `Hello,
Affiliate Account: worldpd / zec_ia_worldpd

Could you check and confirm a player below and set 30% RB program:
1.Username: Nickname: <nick> ID: <id>

Thank you!`
  }
}

const CORE_ROOMS = new Set(['nexa', 'championpoker', 'redstar'])

const dealByRoomAlias: Array<{ aliases: string[]; deal: DealRule }> = [
  { aliases: ['nexa', 'nexapoker'], deal: { dealText: '40% Net Revenue', directusDealSchema: netRamp('40') } },
  { aliases: ['redstar', 'redstarpoker'], deal: { dealText: 'Standard', directusDealSchema: 'standard' } },
  { aliases: ['wptglobal', 'wptg'], deal: { dealText: '30% Net Revenue', directusDealSchema: netRamp('30') } },
  { aliases: ['1win'], deal: { dealText: '30% Gross', directusDealSchema: grossRamp('30') } },
  { aliases: ['888', '888poker'], deal: { dealText: '20% Net Revenue', directusDealSchema: netRamp('20'), notes: 'Limit: 2 years from registration; non-rakeback deal also exists.' } },
  { aliases: ['acr', 'americascardroom', 'blackchippoker', 'yapoker'], deal: { dealText: '15%/5% Net (1k+ rake/month)', directusDealSchema: 'net/ramp\n0, 5% | 1000, 15%' } },
  { aliases: ['bcpoker'], deal: { dealText: '15% Net Revenue (300+ rake/month)', directusDealSchema: 'net/ramp\n300, 15%' } },
  { aliases: ['basepoker'], deal: { dealText: '15% Net Revenue', directusDealSchema: netRamp('15') } },
  { aliases: ['bet365'], deal: { dealText: '15% Net Revenue', directusDealSchema: netRamp('15') } },
  { aliases: ['ignition'], deal: { dealText: '15% Net Revenue', directusDealSchema: netRamp('15'), notes: 'Legacy players may have 20%.' } },
  { aliases: ['bwin'], deal: { dealText: '20% Net Revenue', directusDealSchema: netRamp('20') } },
  { aliases: ['championpoker'], deal: { dealText: '25% Net Revenue', directusDealSchema: netRamp('25'), notes: 'Direct and agent cash desk.' } },
  { aliases: ['tigergaming', 'betonline', 'sportsbetting', 'chico'], deal: { dealText: '20% Net Revenue', directusDealSchema: netRamp('20') } },
  { aliases: ['coinpoker'], deal: { dealText: 'Гонка', directusDealSchema: 'race' } },
  { aliases: ['grompoker'], deal: { dealText: '15% Net Revenue', directusDealSchema: netRamp('15') } },
  { aliases: ['partypoker'], deal: { dealText: '20% Net Revenue', directusDealSchema: netRamp('20') } },
  { aliases: ['pokerking'], deal: { dealText: '15% Gross', directusDealSchema: grossRamp('15') } },
  { aliases: ['rptbet', 'rptbetpoker'], deal: { dealText: '15% Net Revenue', directusDealSchema: netRamp('15') } },
  { aliases: ['shenpoker'], deal: { dealText: '25% Net Revenue', directusDealSchema: netRamp('25') } },
  { aliases: ['stakepoker', 'stake'], deal: { dealText: '20% Net Revenue', directusDealSchema: netRamp('20') } },
  { aliases: ['tonpoker'], deal: { dealText: '30% Net Revenue', directusDealSchema: netRamp('30') } },
  { aliases: ['uppoker', 'vangpoker'], deal: { dealText: '40% Net Revenue', directusDealSchema: netRamp('40') } },
  { aliases: ['vbet', 'vbetpoker', 'vbetlatam'], deal: { dealText: '15% Net Revenue', directusDealSchema: netRamp('15') } },
  { aliases: ['gutspoker'], deal: { dealText: '30% Net Revenue', directusDealSchema: netRamp('30') } }
]

const dealRuleIndex = new Map<string, DealRule>()
for (const { aliases, deal } of dealByRoomAlias) {
  for (const alias of aliases) {
    dealRuleIndex.set(normalizeRoomName(alias), deal)
  }
}

const DEFAULT_ID_ROOMS = new Set([
  'bcpoker',
  'betonline',
  'coinpoker',
  'grompoker',
  'rptbetpoker',
  'tigergaming',
  'vbetpoker'
])

const ROOM_RULES: LinkVerificationRoomRule[] = [
  {
    canonicalRoomName: 'Nexa',
    aliases: ['Nexa', 'Nexa Poker'],
    templateKeys: ['nexa'],
    defaultTemplateKey: 'nexa',
    requiredFields: ['nick', 'roomId', 'email', 'messengerUsername'],
    sheet2RoomUsernameField: 'roomId',
    persistPlayerInMainDb: true,
    deal: dealRuleIndex.get('nexa')!
  },
  {
    canonicalRoomName: 'Champion Poker',
    aliases: ['Champion Poker'],
    templateKeys: ['default'],
    defaultTemplateKey: 'default',
    requiredFields: ['username', 'messengerUsername'],
    sheet2RoomUsernameField: 'username',
    persistPlayerInMainDb: true,
    deal: dealRuleIndex.get('championpoker')!
  },
  {
    canonicalRoomName: 'RedStar',
    aliases: ['RedStar', 'Red Star'],
    templateKeys: ['redstar'],
    defaultTemplateKey: 'redstar',
    requiredFields: ['username'],
    sheet2RoomUsernameField: 'username',
    persistPlayerInMainDb: true,
    deal: dealRuleIndex.get('redstar') || { dealText: '', directusDealSchema: '' }
  },
  {
    canonicalRoomName: 'WPTG',
    aliases: ['WPTG', 'WPT Global'],
    templateKeys: ['wptg'],
    defaultTemplateKey: 'wptg',
    requiredFields: ['roomId', 'nick', 'email'],
    sheet2RoomUsernameField: 'roomId',
    persistPlayerInMainDb: false,
    deal: dealRuleIndex.get('wptg')!
  },
  {
    canonicalRoomName: '888 Poker',
    aliases: ['888', '888 Poker'],
    templateKeys: ['888-confirmation', '888-check'],
    defaultTemplateKey: '888-check',
    requiredFields: ['username', 'messengerUsername'],
    sheet2RoomUsernameField: 'username',
    persistPlayerInMainDb: false,
    deal: dealRuleIndex.get('888')!
  },
  {
    canonicalRoomName: 'TON Poker',
    aliases: ['TON Poker'],
    templateKeys: ['ton'],
    defaultTemplateKey: 'ton',
    requiredFields: ['nick', 'messengerUsername', 'roomId'],
    sheet2RoomUsernameField: 'roomId',
    persistPlayerInMainDb: false,
    deal: dealRuleIndex.get('tonpoker')!
  },
  {
    canonicalRoomName: 'PartyPoker',
    aliases: ['PartyPoker', 'Partypoker'],
    templateKeys: ['partypoker'],
    defaultTemplateKey: 'partypoker',
    requiredFields: ['email', 'userId'],
    sheet2RoomUsernameField: 'userId',
    persistPlayerInMainDb: false,
    deal: dealRuleIndex.get('partypoker')!
  },
  {
    canonicalRoomName: 'bwin',
    aliases: ['bwin', 'Bwin'],
    templateKeys: ['bwin'],
    defaultTemplateKey: 'bwin',
    requiredFields: ['email', 'userId'],
    sheet2RoomUsernameField: 'userId',
    persistPlayerInMainDb: false,
    deal: dealRuleIndex.get('bwin')!
  },
  {
    canonicalRoomName: 'Guts Poker',
    aliases: ['Guts Poker', 'GutsPoker'],
    templateKeys: ['gutspoker'],
    defaultTemplateKey: 'gutspoker',
    requiredFields: ['nick', 'roomId'],
    sheet2RoomUsernameField: 'roomId',
    persistPlayerInMainDb: false,
    deal: dealRuleIndex.get('gutspoker')!
  }
]

const roomRuleIndex = new Map<string, LinkVerificationRoomRule>()
for (const rule of ROOM_RULES) {
  for (const alias of rule.aliases) {
    roomRuleIndex.set(normalizeRoomName(alias), rule)
  }
}

const fallbackDeal: DealRule = {
  dealText: '',
  directusDealSchema: ''
}

export interface ResolvedLinkVerificationRoomRule extends LinkVerificationRoomRule {
  templates: LinkVerificationTemplate[]
}

export const resolveLinkVerificationRoomRule = (roomName: string): ResolvedLinkVerificationRoomRule => {
  const normalized = normalizeRoomName(roomName)
  const explicitRule = roomRuleIndex.get(normalized)
  if (explicitRule) {
    return {
      ...explicitRule,
      templates: explicitRule.templateKeys.map((key) => LINK_VERIFICATION_TEMPLATES[key])
    }
  }

  const useIdInDefault = DEFAULT_ID_ROOMS.has(normalized)
  const requiredFields: LinkVerificationFieldKey[] = useIdInDefault ? ['roomId', 'messengerUsername'] : ['username', 'messengerUsername']
  const sheet2RoomUsernameField: LinkVerificationFieldKey = useIdInDefault ? 'roomId' : 'username'
  const deal = dealRuleIndex.get(normalized) || fallbackDeal

  return {
    canonicalRoomName: roomName,
    aliases: [roomName],
    templateKeys: ['default'],
    defaultTemplateKey: 'default',
    requiredFields,
    sheet2RoomUsernameField,
    persistPlayerInMainDb: CORE_ROOMS.has(normalized),
    deal,
    templates: [LINK_VERIFICATION_TEMPLATES.default]
  }
}

export const linkVerificationRoomRules = ROOM_RULES.map((rule) => ({
  ...rule,
  templates: rule.templateKeys.map((key) => LINK_VERIFICATION_TEMPLATES[key])
}))

export const LINK_VERIFICATION_ROOM_SUGGESTIONS = [
  'Nexa',
  'Champion Poker',
  'RedStar',
  'WPTG',
  'WPT Global',
  '888 Poker',
  'TON Poker',
  'PartyPoker',
  'bwin',
  'Guts Poker',
  '1win',
  'ACR',
  'Black Chip Poker',
  'YaPoker',
  'Basepoker',
  'BCPoker',
  'Bet365',
  'BetOnline',
  'SportsBetting',
  'TigerGaming',
  'Ignition',
  'CoinPoker',
  'Grompoker',
  'PokerKing',
  'RPTBET',
  'Shenpoker',
  'Stake Poker',
  'UPPoker',
  'VangPoker',
  'VBet Poker',
  'Vbet Latam'
]
