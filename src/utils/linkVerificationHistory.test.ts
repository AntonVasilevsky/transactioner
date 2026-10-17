import { describe, expect, it } from 'vitest'
import {
  describePreviousLinkVerificationChecks,
  hasLinkVerificationIdentity,
  isSameLinkVerificationCheck,
  matchedLinkVerificationFields,
  summarizePreviousLinkVerificationChecks,
  type LinkVerificationCheckRecord,
} from './linkVerificationHistory'

const check = (room_name: string, nick = '', room_id = '', email = '') => ({ room_name, nick, room_id, email })
const record = (fields: ReturnType<typeof check>, created_at: string): LinkVerificationCheckRecord => ({ ...fields, created_at })
const now = new Date('2026-10-16T12:00:00Z')

describe('link verification history', () => {
  it('needs a room and at least one of Nick, Room ID, Email', () => {
    expect(hasLinkVerificationIdentity(check('Nexa', 'sdfss'))).toBe(true)
    expect(hasLinkVerificationIdentity(check('Nexa', ' ', '', ''))).toBe(false)
    expect(hasLinkVerificationIdentity(check('', 'sdfss'))).toBe(false)
  })

  it('matches the same room and any filled field, ignoring case and edge spaces; empty fields never match', () => {
    expect(matchedLinkVerificationFields(check('nexa', 'SdFss ', '', 'a@b.c'), check('Nexa', 'sdfss', '', 'other@b.c'))).toEqual(['nick'])
    expect(matchedLinkVerificationFields(check('Nexa', '', '123', ''), check('Nexa', 'new', '123', 'x@y.z'))).toEqual(['room_id'])
    expect(matchedLinkVerificationFields(check('Nexa', '', '', ''), check('Nexa', '', '', ''))).toEqual([])
    expect(matchedLinkVerificationFields(check('RedStar', 'sdfss'), check('Nexa', 'sdfss'))).toEqual([])
  })

  it('treats the same request as the same check only when every field is equal', () => {
    expect(isSameLinkVerificationCheck(check('Nexa', 'sdfss', '1'), check('NEXA', ' SDFSS', '1'))).toBe(true)
    expect(isSameLinkVerificationCheck(check('Nexa', 'sdfss', '1'), check('Nexa', 'sdfss', ''))).toBe(false)
  })

  it('counts earlier checks and skips the own copy of the same request in the last 30 minutes', () => {
    const query = check('Nexa', 'sdfss', '', 'p@mail.com')
    const records = [
      record(check('Nexa', 'sdfss', '', 'p@mail.com'), '2026-10-16T11:50:00Z'),
      record(check('Nexa', 'sdfss', '', 'p@mail.com'), '2026-10-16T11:00:00Z'),
      record(check('Nexa', 'other', '', 'P@Mail.com'), '2026-10-16T11:55:00Z'),
      record(check('RedStar', 'sdfss'), '2026-10-01T10:00:00Z'),
    ]
    const previous = summarizePreviousLinkVerificationChecks(records, query, now)
    expect(previous).toEqual({ count: 2, fields: ['nick', 'email'] })
    expect(describePreviousLinkVerificationChecks(previous!, query))
      .toBe('Эта привязка уже отправлялась на проверку: Nick sdfss, Email p@mail.com — 2 раза.')
    expect(summarizePreviousLinkVerificationChecks(records.slice(0, 1), query, now)).toBeNull()
  })

  it('says how many times in Russian', () => {
    const query = check('Nexa', 'n')
    const text = (count: number) => describePreviousLinkVerificationChecks({ count, fields: ['nick'] }, query)
    expect([1, 2, 5, 11, 21, 22, 112].map(text).map((line) => line.split(' — ')[1]))
      .toEqual(['1 раз.', '2 раза.', '5 раз.', '11 раз.', '21 раз.', '22 раза.', '112 раз.'])
  })
})
