import { describe, expect, it } from 'vitest'
import {
  buildLinkVerificationFieldValues,
  buildLinkVerificationRequestText,
  buildLinkVerificationTemplateValues,
  buildCenteredGoogleSheetsRowHtml,
  buildSheet1Tsv,
  composePlayerDataByRule,
  getLinkVerificationUsernameFieldLabel,
  normalizeMessengerLabel,
  sortLinkVerificationRoomOptions,
  toDirectusMessenger
} from '../utils/linkVerificationFormatting'
import { LINK_VERIFICATION_TEMPLATES, resolveLinkVerificationRoomRule } from '../utils/linkVerificationRules'

describe('LinkVerificationView helpers', () => {
  it('replaces placeholders in request template from form values', () => {
    const text = buildLinkVerificationRequestText(LINK_VERIFICATION_TEMPLATES.wptg.body, {
      id: '555555',
      nick: 'smm888',
      email: 'smm8822@gmail.com'
    })

    expect(text).toContain('ID: 555555')
    expect(text).toContain('Nick: smm888')
    expect(text).toContain('Mail: smm8822@gmail.com')
    expect(text).not.toContain('<id>')
    expect(text).not.toContain('<nick>')
    expect(text).not.toContain('<email>')
  })

  it('builds player_data in rule-required order with deduplication', () => {
    const result = composePlayerDataByRule(
      ['nick', 'roomId', 'email', 'messengerUsername'],
      {
        username: 'hero-user',
        nick: 'hero-user',
        roomId: '1483304',
        email: 'hero@example.com',
        userId: '',
        messengerUsername: '@hero'
      }
    )

    expect(result).toBe('hero-user / 1483304 / hero@example.com / @hero')
  })

  it('does not leak unrelated fields into player_data', () => {
    const result = composePlayerDataByRule(
      ['nick', 'roomId', 'email'],
      {
        username: 'should-not-appear',
        nick: 'hero-nick',
        roomId: '1483304',
        email: 'hero@example.com',
        userId: 'should-not-appear-either',
        messengerUsername: '@hero'
      }
    )

    expect(result).toBe('hero-nick / 1483304 / hero@example.com')
  })

  it('builds request player data from only username, roomId, and email', () => {
    const fields = buildLinkVerificationFieldValues({
      username: 'hero-user',
      roomId: '1483304',
      email: 'hero@example.com'
    })

    expect(composePlayerDataByRule(
      ['nick', 'roomId', 'email', 'messengerUsername', 'userId'],
      fields
    )).toBe('hero-user / 1483304 / hero@example.com')
    expect(fields.nick).toBe('hero-user')
    expect(fields.userId).toBe('hero-user')
    expect(fields.messengerUsername).toBe('hero-user')
  })

  it('maps legacy request placeholders to the three request fields', () => {
    const values = buildLinkVerificationTemplateValues({
      roomName: 'RedStar',
      playerData: 'hero-login / 1483304 / hero@example.com',
      messenger: '',
      messengerUsername: '@hero-contact',
      username: 'hero-login',
      roomId: '1483304',
      email: 'hero@example.com'
    })

    const text = buildLinkVerificationRequestText(
      'login=<login>; nick=<nick>; user=<user_id>; id=<id>; mail=<email>; data=<player_data>',
      values
    )

    expect(text).toBe('login=hero-login; nick=hero-login; user=hero-login; id=1483304; mail=hero@example.com; data=hero-login / 1483304 / hero@example.com')
  })

  it('uses contact field for messenger placeholders in request templates', () => {
    const values = buildLinkVerificationTemplateValues({
      roomName: 'Nexa',
      playerData: 'hero-nick / 1483304 / hero@example.com',
      messenger: 'Telegram',
      messengerUsername: '@hero-contact',
      username: 'hero-nick',
      roomId: '1483304',
      email: 'hero@example.com'
    })

    const text = buildLinkVerificationRequestText(
      LINK_VERIFICATION_TEMPLATES.nexa.body,
      values
    )

    expect(text).toContain('hero-nick / 1483304 / hero@example.com')
    expect(text).toContain('messenger: @hero-contact')
    expect(text).not.toContain('messenger: hero-nick')
  })

  it('uses the selected messenger name in default request templates', () => {
    const values = buildLinkVerificationTemplateValues({
      roomName: 'ACR',
      playerData: 'UnReal2023',
      messenger: 'TG',
      messengerUsername: '@AlexanderChazov',
      username: 'UnReal2023',
      roomId: '',
      email: ''
    })

    const text = buildLinkVerificationRequestText(
      LINK_VERIFICATION_TEMPLATES.default.body,
      values
    )

    expect(text).toBe(`Проверка привязки ACR
UnReal2023
Telegram: @AlexanderChazov
@kapitonov`)
    expect(text).not.toContain('messenger: @AlexanderChazov')
  })

  it('renames the username field for room-specific identity wording', () => {
    expect(getLinkVerificationUsernameFieldLabel('RedStar')).toBe('Login')
    expect(getLinkVerificationUsernameFieldLabel('PartyPoker')).toBe('User ID')
    expect(getLinkVerificationUsernameFieldLabel('Nexa')).toBe('Nick')
    expect(getLinkVerificationUsernameFieldLabel('Champion Poker')).toBe('Username')
  })

  it('selects sheet2 roomUsername from the room-specific verification identifier', () => {
    const fields = buildLinkVerificationFieldValues({
      username: 'hero-nick',
      roomId: '1483304',
      email: 'hero@example.com'
    })

    expect(fields[resolveLinkVerificationRoomRule('Nexa').sheet2RoomUsernameField]).toBe('1483304')
    expect(fields[resolveLinkVerificationRoomRule('WPTG').sheet2RoomUsernameField]).toBe('1483304')
    expect(fields[resolveLinkVerificationRoomRule('TON Poker').sheet2RoomUsernameField]).toBe('1483304')
    expect(fields[resolveLinkVerificationRoomRule('Guts Poker').sheet2RoomUsernameField]).toBe('1483304')
    expect(fields[resolveLinkVerificationRoomRule('BCPoker').sheet2RoomUsernameField]).toBe('1483304')
    expect(fields[resolveLinkVerificationRoomRule('PartyPoker').sheet2RoomUsernameField]).toBe('hero-nick')
    expect(fields[resolveLinkVerificationRoomRule('RedStar').sheet2RoomUsernameField]).toBe('hero-nick')
    expect(fields[resolveLinkVerificationRoomRule('Basepoker').sheet2RoomUsernameField]).toBe('hero-nick')
  })

  it('sorts room picker options by core rooms first and registration frequency after', () => {
    const result = sortLinkVerificationRoomOptions(
      ['ACR', 'Nexa', 'RedStar', 'Champion Poker', 'Basepoker', 'WPTG', 'BetOnline'],
      [
        { roomName: 'Basepoker', registrationCount: 2 },
        { roomName: 'WPTG', registrationCount: 7 },
        { roomName: 'BetOnline', registrationCount: 4 },
        { roomName: 'ACR', registrationCount: 7 }
      ]
    )

    expect(result).toEqual([
      'Nexa',
      'Champion Poker',
      'RedStar',
      'ACR',
      'WPTG',
      'BetOnline',
      'Basepoker'
    ])
  })

  it('builds complete sheet1 tsv row from verification fields', () => {
    const row = buildSheet1Tsv({
      date: '02.06.2026',
      manager: 'Антон',
      messenger: 'TG',
      messengerUsername: '@hero',
      roomName: 'WPTG',
      loginNickId: 'Hero / 1483304 / hero@example.com',
      status: 'Check',
      deliveredToPlayer: '',
      updateChat: false
    })

    expect(row).toBe('02.06.2026\tАнтон\tTelegram\t@hero\tWPTG\tHero / 1483304 / hero@example.com\tCheck\t\tFALSE')
  })

  it('keeps messenger blank when the field is empty', () => {
    expect(normalizeMessengerLabel('')).toBe('')
    expect(buildSheet1Tsv({
      date: '02.06.2026',
      manager: 'Антон',
      messenger: '',
      messengerUsername: '',
      roomName: 'WPTG',
      loginNickId: 'Hero / 1483304 / hero@example.com',
      status: 'Check',
      deliveredToPlayer: '',
      updateChat: false
    })).toBe('02.06.2026\tАнтон\t\t\tWPTG\tHero / 1483304 / hero@example.com\tCheck\t\tFALSE')
    expect(toDirectusMessenger('', '@hero')).toBe('')
  })

  it('builds a centered Google Sheets HTML row for rich clipboard paste', () => {
    const html = buildCenteredGoogleSheetsRowHtml('Hero & Co\t<Check>\tline 1\nline 2\tFALSE')

    expect(html).toBe('<table><tbody><tr><td style="text-align:center;vertical-align:middle;white-space:pre-wrap;">Hero &amp; Co</td><td style="text-align:center;vertical-align:middle;white-space:pre-wrap;">&lt;Check&gt;</td><td style="text-align:center;vertical-align:middle;white-space:pre-wrap;">line 1<br>line 2</td><td style="text-align:center;vertical-align:middle;white-space:pre-wrap;">FALSE</td></tr></tbody></table>')
  })
})
