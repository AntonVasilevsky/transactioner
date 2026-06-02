import { describe, expect, it } from 'vitest'
import {
  buildLinkVerificationRequestText,
  buildSheet1Tsv,
  composePlayerDataByRule
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
})

