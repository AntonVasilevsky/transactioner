import { describe, expect, it } from 'vitest'
import { LINK_VERIFICATION_RESPONSE_TEMPLATES_2026_10 } from './linkVerificationResponseTemplates'

describe('link-verification confirmation texts', () => {
  const key = (roomKey: string, dealType = '') => `${roomKey}${dealType ? `/${dealType}` : ''}`

  it('has exactly one RU, EN and ES text for every room and cash desk', () => {
    const languagesByRoom = new Map<string, string[]>()
    for (const template of LINK_VERIFICATION_RESPONSE_TEMPLATES_2026_10) {
      const room = key(template.roomKey, template.dealType)
      languagesByRoom.set(room, [...(languagesByRoom.get(room) || []), template.language])
    }
    for (const [room, languages] of languagesByRoom) {
      expect([...languages].sort(), room).toEqual(['EN', 'ES', 'RU'])
    }
  })

  it('keeps no real player account ids and no operator-only remarks in the texts', () => {
    for (const template of LINK_VERIFICATION_RESPONSE_TEMPLATES_2026_10) {
      const where = `${key(template.roomKey, template.dealType)}/${template.language}`
      expect(template.body, where).not.toMatch(/\b(?:B|TG|SB)\d{6,}\b/)
      expect(template.body, where).not.toMatch(/Или кратко|При необходимости|перепроверять/)
      expect(template.body, where).toBe(template.body.trim())
    }
  })
})
