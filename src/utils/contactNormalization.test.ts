import { describe, expect, it } from 'vitest'
import { inferContactMethod } from './contactNormalization'

describe('contact method inference', () => {
  it('recognizes obvious email and phone contacts before player creation', () => {
    expect(inferContactMethod(' player@example.com ')).toBe('Email')
    expect(inferContactMethod('+54 9 11 1234-5678')).toBe('WA')
  })

  it('keeps usernames and room identifiers as Telegram by default', () => {
    expect(inferContactMethod('@player')).toBe('TG')
    expect(inferContactMethod('room-player-1483304')).toBe('TG')
  })
})
