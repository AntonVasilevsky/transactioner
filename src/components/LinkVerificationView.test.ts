import { describe, expect, it } from 'vitest'
import {
  buildLinkVerificationRequestText,
  buildSheet1Tsv,
  composePlayerDataByRule,
  normalizeMessengerLabel,
  toDirectusMessenger
} from './LinkVerificationView'
import { LINK_VERIFICATION_TEMPLATES } from '../utils/linkVerificationRules'

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
})
