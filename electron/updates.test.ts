import { describe, expect, it } from 'vitest'
import { compareVersions, isAllowedReleaseUrl, normalizeVersion } from './updates'

describe('update version helpers', () => {
  it('normalizes GitHub release tags', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3')
    expect(normalizeVersion(' 1.2.3 ')).toBe('1.2.3')
  })

  it('compares semantic versions', () => {
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1)
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
  })

  it('allows only Transactioner GitHub release URLs', () => {
    expect(isAllowedReleaseUrl('https://github.com/AntonVasilevsky/transactioner/releases/tag/v0.1.0')).toBe(true)
    expect(isAllowedReleaseUrl('https://github.com/AntonVasilevsky/transactioner/releases/latest')).toBe(true)
    expect(isAllowedReleaseUrl('http://github.com/AntonVasilevsky/transactioner/releases/tag/v0.1.0')).toBe(false)
    expect(isAllowedReleaseUrl('https://github.com/AntonVasilevsky/other/releases/tag/v0.1.0')).toBe(false)
    expect(isAllowedReleaseUrl('https://evil.example/AntonVasilevsky/transactioner/releases/tag/v0.1.0')).toBe(false)
    expect(isAllowedReleaseUrl('not-a-url')).toBe(false)
  })
})
